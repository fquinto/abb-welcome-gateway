#!/usr/bin/env node
// Build a fully-fledged tscircuit project under output/ mirroring the
// li-charger sample: index.circuit.tsx as the entry point with imports for
// the chip wrappers (U1 = TPS5430, U2 = ESP32-SOLO-1) and every other
// component declared inline. package.json / tsconfig / tscircuit.config
// already live alongside in the output/ folder.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSchematicShapes, parsePcbShapes } from "./lib/easyeda-parser.mjs";
import { pcbXY } from "./lib/pcb-units.mjs";
import { pickTscircuit } from "./lib/tscircuit-mapping.mjs";
import { buildConnectivity } from "./lib/connectivity.mjs";
import { getPinLabels } from "./lib/chip-pinouts.mjs";
import { inlineFootprintJSX } from "./lib/inline-footprint.mjs";
import { manualFootprintJSX } from "./lib/manual-footprints.mjs";
import { cadModelFor } from "./lib/cad-model.mjs";
import { parsePadsNetlist, netFor, sanitizeNet } from "./lib/netlist-parser.mjs";
import { parseBom, tscircuitValueFromBomName } from "./lib/bom-parser.mjs";
import { generateChipImport } from "./lib/chip-import-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
// EasyEDA v2 source files live under hardware/easyeda-v2/.
const SRC_DIR = path.join(REPO_ROOT, "hardware", "easyeda-v2");
const SCH_FILE = "Bus_Interface_for_ABB-Welcome_v2_EasyEDA_Schematic.json";
const PCB_FILE = "PCB_Bus_Interface_for_ABB-Welcome_v2_EasyEDA_PCB_2026-05-06.json";
const NET_FILE = "Schematic.net";
const BOM_FILE = "BOM.csv";
const OUT_DIR = path.join(REPO_ROOT, "output");

// Designators that get their own imports/<NAME>.tsx wrapper, rather than
// inline JSX. Pick chips with non-trivial datasheet pin labels.
const IMPORT_AS_FILES = {
    U1: { componentName: "TPS5430", lcsc: "C9864", mpn: "TPS5430DDAR" },
    U2: { componentName: "ESP32_SOLO_1", lcsc: "C473005", mpn: "ESP32-SOLO-1" },
};

const SKIP_DES = new Set(["U3", "H1", "H2", "H3", "A"]);

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function pcbOriginShift(pcb) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of pcb.tracks) {
        if (t.layer !== "10") continue;
        for (const p of t.points) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        }
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}

function fmtProp(name, value) {
    if (value == null) return "";
    if (typeof value === "string") {
        if (value.startsWith("<footprint")) {
            return ` ${name}={${value.replace(/\s+/g, " ").replace(/<footprint>/, "(<footprint>").replace(/<\/footprint>/, "</footprint>)")}}`;
        }
        return ` ${name}="${value}"`;
    }
    if (typeof value === "number") return ` ${name}={${value}}`;
    if (typeof value === "boolean") return value ? ` ${name}` : "";
    return ` ${name}={${JSON.stringify(value)}}`;
}

function renderProps(props) {
    return Object.entries(props).map(([k, v]) => fmtProp(k, v)).join("");
}

function buildConnections(designator, pinSourcePortIds, conn, netlist, keyForPin = n => `pin${n}`) {
    const out = {};
    for (const [pinNum, portId] of pinSourcePortIds) {
        let rawName = netlist ? netFor(netlist, designator, pinNum) : null;
        if (!rawName) {
            if (netlist) continue;
            const netId = conn.pinNetByPortId.get(portId);
            if (!netId) continue;
            const net = conn.nets.get(netId);
            if (net && net.sourcePortIds.size < 2) continue;
            rawName = net?.name || netId.replace(/^source_net_/, "");
        }
        out[keyForPin(pinNum)] = `net.${sanitizeNet(rawName)}`;
    }
    return out;
}

function pcbRotation(deg) {
    let r = (deg || 0) % 360; if (r < 0) r += 360;
    return r;
}

function writeImports() {
    const importsDir = path.join(OUT_DIR, "imports");
    fs.mkdirSync(importsDir, { recursive: true });
    const written = [];
    for (const [designator, info] of Object.entries(IMPORT_AS_FILES)) {
        const pinLabels = getPinLabels(info.lcsc);
        if (!pinLabels) {
            console.warn(`No pinLabels for ${designator} (${info.lcsc}); skipping import file.`);
            continue;
        }
        const tsx = generateChipImport({
            componentName: info.componentName,
            lcsc: info.lcsc,
            pinLabels,
            manufacturerPartNumber: info.mpn,
        });
        const file = path.join(importsDir, `${info.componentName}.tsx`);
        fs.writeFileSync(file, tsx);
        written.push({ designator, info, file });
    }
    return written;
}

async function main() {
    const schDoc = readJson(path.join(SRC_DIR, SCH_FILE));
    const pcbDoc = readJson(path.join(SRC_DIR, PCB_FILE));
    const sch = parseSchematicShapes(schDoc.schematics[0].dataStr.shape);
    const pcb = parsePcbShapes(pcbDoc.shape);
    const shift = pcbOriginShift(pcb);

    let netlist = null;
    if (fs.existsSync(path.join(SRC_DIR, NET_FILE))) {
        netlist = parsePadsNetlist(path.join(SRC_DIR, NET_FILE));
    }
    let bom = null;
    if (fs.existsSync(path.join(SRC_DIR, BOM_FILE))) {
        bom = parseBom(path.join(SRC_DIR, BOM_FILE));
    }

    // 1) Per-chip imports
    const importsWritten = writeImports();

    // 2) Per-LIB pin source port IDs (synthetic, just to drive connectivity).
    const pcbByDes = new Map();
    for (const l of pcb.libs) if (l.designator) pcbByDes.set(l.designator, l);
    const pinSourcePortByLib = new Map();
    sch.libs.forEach((lib, idx) => {
        if (!lib.designator) return;
        const m = new Map();
        for (const p of lib.pins) m.set(String(p.pinNumber), `${lib.designator}_pin${p.pinNumber}`);
        pinSourcePortByLib.set(idx, m);
    });
    const conn = buildConnectivity({
        libs: sch.libs, wires: sch.wires, netLabels: sch.netLabels, pinSourcePortByLib,
    });

    // 3) JSX body
    const importLines = importsWritten.map(({ info }) =>
        `import { ${info.componentName} } from "./imports/${info.componentName}"`
    );
    const bodyLines = [];

    for (let li = 0; li < sch.libs.length; li++) {
        const sLib = sch.libs[li];
        if (!sLib.designator) continue;
        if (SKIP_DES.has(sLib.designator)) continue;
        if (/LOGO|FRAME/i.test(sLib.package || "")) continue;

        const fp = pcbByDes.get(sLib.designator);
        const importInfo = IMPORT_AS_FILES[sLib.designator];

        let tag, props, connectionKeyHints, skipCadModel;
        if (importInfo) {
            // Use the imported wrapper — tag is the component name; we only
            // need to pass placement + connections, the wrapper sets the rest.
            tag = importInfo.componentName;
            props = { name: sLib.designator };
        } else {
            const mapping = pickTscircuit(sLib, sLib.designator);
            if (!mapping) continue;
            tag = mapping.tag;
            props = mapping.props;
            connectionKeyHints = mapping.connectionKeyHints;
            skipCadModel = mapping.skipCadModel;

            // BOM value override
            const bomEntry = bom?.get(sLib.designator);
            if (bomEntry?.name) {
                if (tag === "resistor") {
                    const v = tscircuitValueFromBomName(bomEntry.name, "R");
                    if (v) props.resistance = v;
                } else if (tag === "capacitor") {
                    const v = tscircuitValueFromBomName(bomEntry.name, "C");
                    if (v) props.capacitance = v;
                } else if (tag === "inductor") {
                    const v = tscircuitValueFromBomName(bomEntry.name, "L");
                    if (v) props.inductance = v;
                }
            }
        }

        // Placement
        if (fp) {
            const c = pcbXY({ x: fp.x, y: fp.y }, shift);
            props.pcbX = `${c.x.toFixed(3)}mm`;
            props.pcbY = `${c.y.toFixed(3)}mm`;
            const rot = pcbRotation(fp.rotation || 0);
            if (rot) props.pcbRotation = rot;
        }

        // Inline footprint when missing
        if (!importInfo && !props.footprint && sLib.lcsc) {
            const inline = inlineFootprintJSX(sLib.lcsc);
            if (inline) props.footprint = inline;
        }
        if (!importInfo && !props.footprint) {
            const manual = manualFootprintJSX(sLib.package);
            if (manual) {
                props.footprint = manual;
                if ("pcbRotation" in props) delete props.pcbRotation;
            }
        }
        if (!importInfo && tag === "chip" && !props.footprint) {
            const pinCount = sLib.pins.length;
            props.footprint = pinCount <= 8 ? "soic8" : pinCount <= 16 ? "soic16" : `qfn${pinCount}`;
        }

        // Connections
        const pinLabelsByLcsc = !importInfo ? getPinLabels(sLib.lcsc) : null;
        const labelMap = pinLabelsByLcsc
            ? Object.fromEntries(Object.entries(pinLabelsByLcsc).map(([n, name]) => [n, name]))
            : (connectionKeyHints || null);
        const pins = pinSourcePortByLib.get(li);
        if (pins && pins.size) {
            const keyFn = labelMap ? n => labelMap[String(n)] || `pin${n}` : n => `pin${n}`;
            const connObj = buildConnections(sLib.designator, pins, conn, netlist, keyFn);
            if (Object.keys(connObj).length) props.connections = connObj;
        }
        if (!importInfo && tag === "chip" && pinLabelsByLcsc) {
            const labels = {};
            for (const [num, name] of Object.entries(pinLabelsByLcsc)) labels[`pin${num}`] = name;
            props.pinLabels = labels;
        }

        // 3D cadModel
        if (!importInfo && sLib.lcsc && tag !== "led" && !skipCadModel) {
            const cad = cadModelFor(sLib.lcsc);
            if (cad) props.cadModel = cad;
        }

        bodyLines.push(`      <${tag}${renderProps(props)} />`);
    }

    // 4) Tooling holes
    for (const des of ["H1", "H2", "H3"]) {
        const fp = pcbByDes.get(des);
        if (!fp) continue;
        const c = pcbXY({ x: fp.x, y: fp.y }, shift);
        bodyLines.push(`      <hole name="${des}" diameter="2.2677mm" pcbX="${c.x.toFixed(3)}mm" pcbY="${c.y.toFixed(3)}mm" />`);
    }

    const boardW = (shift.w * 0.254).toFixed(2);
    const boardH = (shift.h * 0.254).toFixed(2);
    const tsx = `${importLines.join("\n")}

export default () => (
  <board pcbWidth="${boardW}mm" pcbHeight="${boardH}mm">
${bodyLines.join("\n")}
  </board>
)
`;

    fs.writeFileSync(path.join(OUT_DIR, "index.circuit.tsx"), tsx);
    console.log(`Wrote output/index.circuit.tsx (${bodyLines.length} elements, ${importLines.length} imports).`);
    for (const w of importsWritten) console.log(`  → ${path.relative(OUT_DIR, w.file)}`);
}

main();

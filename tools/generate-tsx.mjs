#!/usr/bin/env node
// Emit a tscircuit `.tsx`/HTML file equivalent to the PCB+schematic JSON.
// Output: pcb.tscircuit.html — open it in a browser, or paste the <script
// type="text/babel"> contents into circuitjson.com / a tscircuit playground.
//
// Layout is preserved with explicit pcbX/pcbY/pcbRotation per component
// (not pcbPack) so the output matches the original board geometry.

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCH_FILE = "Bus_Interface_for_ABB-Welcome_v2_EasyEDA_Schematic.json";
const PCB_FILE = "PCB_Bus_Interface_for_ABB-Welcome_v2_EasyEDA_PCB_2026-05-06.json";
const NET_FILE = "Schematic.net";
const BOM_FILE = "BOM.csv";
const OUT_FILE = "pcb.tscircuit.html";

const NETLABEL_NAMES = new Set();

// tscircuit rejects net names that begin with a digit. Project net labels
// like "3V3" need a non-digit prefix. We normalise by prepending "V" — keeps
// the human-readable text, only adds one letter.
function sanitizeNetName(raw) {
    if (!raw) return raw;
    return /^\d/.test(raw) ? `V${raw}` : raw;
}

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

// Format JSX prop value. Strings → quoted; numbers/booleans → braces; objects → JSON.
function fmtProp(name, value) {
    if (value == null) return "";
    if (typeof value === "string") return ` ${name}="${value}"`;
    if (typeof value === "number") return ` ${name}={${value}}`;
    if (typeof value === "boolean") return value ? ` ${name}` : "";
    return ` ${name}={${JSON.stringify(value)}}`;
}

function renderProps(props) {
    return Object.entries(props).map(([k, v]) => {
        // `footprint` may be either a string ("0603") or a JSX <footprint>
        // fragment. The fragment must be emitted unquoted inside braces.
        if (k === "footprint" && typeof v === "string" && v.startsWith("<footprint")) {
            return ` footprint={${v.replace(/\s+/g, " ").replace(/<footprint>/, "(<footprint>").replace(/<\/footprint>/, "</footprint>)")}}`;
        }
        return fmtProp(k, v);
    }).join("");
}

// Build a `connections={{ pinKey: "net.X" }}` object. We prefer the PADS-PCB
// netlist (canonical source of truth) and fall back to our own graph for any
// pin the netlist doesn't list.
function buildConnections(designator, pinSourcePortIds, conn, netlist, keyForPin = n => `pin${n}`) {
    const out = {};
    for (const [pinNum, portId] of pinSourcePortIds) {
        let rawName = netlist ? netFor(netlist, designator, pinNum) : null;
        if (!rawName) {
            // When the netlist is present and a pin isn't listed there, it's
            // not connected to anything (NC). Skip — emitting it would create
            // a phantom single-pin net.
            if (netlist) continue;
            const netId = conn.pinNetByPortId.get(portId);
            if (!netId) continue;
            const net = conn.nets.get(netId);
            // Skip single-pin nets even in graph fallback — they're NC too.
            if (net && net.sourcePortIds.size < 2) continue;
            rawName = net?.name || netId.replace(/^source_net_/, "");
        }
        const netName = sanitizeNet(rawName);
        out[keyForPin(pinNum)] = `net.${netName}`;
        NETLABEL_NAMES.add(netName);
    }
    return out;
}

function pcbRotation(deg) {
    let r = (deg || 0) % 360; if (r < 0) r += 360;
    return r;
}

function main() {
    const schDoc = readJson(path.join(REPO_ROOT, SCH_FILE));
    const pcbDoc = readJson(path.join(REPO_ROOT, PCB_FILE));
    const sch = parseSchematicShapes(schDoc.schematics[0].dataStr.shape);
    const pcb = parsePcbShapes(pcbDoc.shape);
    const shift = pcbOriginShift(pcb);

    // Optional: PADS-PCB netlist as the canonical net-name source.
    let netlist = null;
    const netPath = path.join(REPO_ROOT, NET_FILE);
    if (fs.existsSync(netPath)) {
        netlist = parsePadsNetlist(netPath);
        console.log(`Netlist: ${netlist.pinsByNet.size} signals, ${netlist.netByPin.size} pin↔net entries.`);
    }

    // Optional: BOM.csv as the canonical value source (overrides MPN parsing).
    let bom = null;
    const bomPath = path.join(REPO_ROOT, BOM_FILE);
    if (fs.existsSync(bomPath)) {
        bom = parseBom(bomPath);
        console.log(`BOM: ${bom.size} designator entries.`);
    }

    // Index PCB lib by designator so we can pull pcbX/pcbY/pcbRotation per
    // component placement.
    const pcbByDes = new Map();
    for (const l of pcb.libs) if (l.designator) pcbByDes.set(l.designator, l);

    // Connectivity comes from the schematic. We also need pinSourcePortByLib
    // — for now, fabricate source_port IDs as `<des>_pin<n>` so we don't have
    // to share IDs with the circuit.json pipeline.
    const pinSourcePortByLib = new Map();
    sch.libs.forEach((lib, idx) => {
        if (!lib.designator) return;
        const m = new Map();
        for (const p of lib.pins) m.set(String(p.pinNumber), `${lib.designator}_pin${p.pinNumber}`);
        pinSourcePortByLib.set(idx, m);
    });
    const conn = buildConnectivity({
        libs: sch.libs,
        wires: sch.wires,
        netLabels: sch.netLabels,
        pinSourcePortByLib,
    });

    const lines = [];
    let chipsWithUnknownPins = 0;

    // Skip designators that are non-electrical (logo, frame) or that we'll
    // emit separately below (tooling holes via the dedicated pcbByDes loop).
    const SKIP_DES = new Set(["U3", "H1", "H2", "H3", "A"]);

    for (let li = 0; li < sch.libs.length; li++) {
        const sLib = sch.libs[li];
        if (!sLib.designator) continue;
        if (SKIP_DES.has(sLib.designator)) continue;
        // Skip non-electrical placeholders (frame, OSHW logo)
        if (/LOGO|FRAME/i.test(sLib.package || "")) continue;

        const fp = pcbByDes.get(sLib.designator);

        const mapping = pickTscircuit(sLib, sLib.designator);
        if (!mapping) continue;
        const { tag, props, connectionKeyHints, skipCadModel } = mapping;

        // Override numeric value (resistance / capacitance / inductance) from
        // the BOM when it has one — its "Name" column is the truth, while our
        // MPN parser is heuristic.
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

        // Inject placement props from the PCB lib.
        if (fp) {
            const c = pcbXY({ x: fp.x, y: fp.y }, shift);
            props.pcbX = `${c.x.toFixed(3)}mm`;
            props.pcbY = `${c.y.toFixed(3)}mm`;
            const rot = pcbRotation(fp.rotation || 0);
            if (rot) props.pcbRotation = rot;
        }

        // Connections.
        // 1. Chips use the datasheet name when we have one (TPS5430, ESP32).
        // 2. Mosfets/transistors use the semantic name set by tscircuit-mapping
        //    (gate/source/drain or base/emitter/collector).
        // 3. Everything else falls back to pinN.
        const chipLabels = getPinLabels(sLib.lcsc);          // by-LCSC datasheet labels
        const labelMap = chipLabels
            ? Object.fromEntries(Object.entries(chipLabels).map(([n, name]) => [n, name]))
            : (connectionKeyHints || null);

        const pins = pinSourcePortByLib.get(li);
        if (pins && pins.size) {
            const keyFn = labelMap
                ? n => labelMap[String(n)] || `pin${n}`
                : n => `pin${n}`;
            const connObj = buildConnections(sLib.designator, pins, conn, netlist, keyFn);
            if (Object.keys(connObj).length) props.connections = connObj;
        }
        // Expose datasheet pin labels on chips so the schematic shows
        // VCC/GND/GPIO… instead of pin1/pin2/….
        if (tag === "chip" && chipLabels) {
            const labels = {};
            for (const [num, name] of Object.entries(chipLabels)) labels[`pin${num}`] = name;
            props.pinLabels = labels;
        }

        // If no footprint string yet, try to inline one from the cache. This
        // covers radial electrolytics, chokes, modules, terminal blocks —
        // anything where tscircuit doesn't have a generator.
        if (!props.footprint && sLib.lcsc) {
            const inline = inlineFootprintJSX(sLib.lcsc);
            if (inline) props.footprint = inline;
        }
        // Manual footprint (no-LCSC components such as the FTDI header
        // P2): hand-crafted plated-hole arrays keyed by package name. The
        // manual footprints are written in the FINAL board orientation
        // (already accounting for the LIB's rotation), so we cancel
        // pcbRotation to avoid double-rotating.
        if (!props.footprint) {
            const manual = manualFootprintJSX(sLib.package);
            if (manual) {
                props.footprint = manual;
                if ("pcbRotation" in props) delete props.pcbRotation;
            }
        }

        // 3D model: point at tscircuit's CDN (CORS-friendly mirror of the
        // EasyEDA OBJ/STEP files) so the viewer can load real 3D geometry.
        // Skipped for <led> (colour dome) and for parts flagged by the
        // mapping (e.g. footprint-only "no-place" entries like P2).
        if (sLib.lcsc && tag !== "led" && !skipCadModel) {
            const cad = cadModelFor(sLib.lcsc);
            if (cad) props.cadModel = cad;
        }
        // Last resort for chips with no inline footprint: pick by pin count.
        if (tag === "chip" && !props.footprint) {
            const pinCount = sLib.pins.length;
            if (pinCount <= 8) props.footprint = "soic8";
            else if (pinCount <= 16) props.footprint = "soic16";
            else props.footprint = `qfn${pinCount}`;
            chipsWithUnknownPins++;
        }

        lines.push(`        <${tag}${renderProps(props)} />`);
    }

    // Tooling holes (H1, H2, H3) — drop in via <hole>.
    for (const des of ["H1", "H2", "H3"]) {
        const fp = pcbByDes.get(des);
        if (!fp) continue;
        const c = pcbXY({ x: fp.x, y: fp.y }, shift);
        lines.push(`        <hole name="${des}" diameter="2.2677mm" pcbX="${c.x.toFixed(3)}mm" pcbY="${c.y.toFixed(3)}mm" />`);
    }

    const boardW = (shift.w * 0.254).toFixed(2);
    const boardH = (shift.h * 0.254).toFixed(2);
    const html = `<html>
  <head>
    <script src="https://unpkg.com/@tscircuit/circuit-preview@latest/dist/index.global.js"></script>
    <script type="text/babel">
      window.tscircuit.render(
        <board pcbWidth="${boardW}mm" pcbHeight="${boardH}mm">
${lines.join("\n")}
        </board>
      )
    </script>
  </head>
  <body></body>
</html>
`;

    fs.writeFileSync(path.join(REPO_ROOT, OUT_FILE), html);
    console.log(`Wrote ${OUT_FILE}: ${lines.length} JSX elements`);
    if (chipsWithUnknownPins) console.log(`Chips with default soic8 footprint: ${chipsWithUnknownPins}`);
    console.log(`Net labels referenced: ${NETLABEL_NAMES.size} (${[...NETLABEL_NAMES].sort().join(", ")})`);
}

main();

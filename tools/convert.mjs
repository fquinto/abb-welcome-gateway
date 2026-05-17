#!/usr/bin/env node
// Top-level orchestrator. Reads the EasyEDA schematic + PCB JSON files in the
// repo root and emits `circuit.json` next to them.
//
// v0 scope: emits source_component + pcb_component placements. No
// schematic_*, no pcb_trace yet — those land in subsequent passes once the
// element shape is validated end-to-end.

import fs from "node:fs";
import path from "node:path";
import {
    parseSchematicShapes,
    parsePcbShapes,
} from "./lib/easyeda-parser.mjs";
import {
    REPO_ROOT,
    loadComponentCircuitJson,
    preloadAll,
} from "./lib/cache.mjs";
import {
    computeSchematicCenter,
    buildSchematicForLib,
    makeIdCounter,
} from "./lib/schematic.mjs";
import { buildConnectivity } from "./lib/connectivity.mjs";
import { emitNetsAndTraces } from "./lib/schematic-traces.mjs";
import { emitPcbTracesAndVias, buildPcbBoard } from "./lib/pcb-traces.mjs";
import { buildFtdiHeader, buildToolingHole } from "./lib/manual-components.mjs";
import { pcbXY } from "./lib/pcb-units.mjs";
import { getSilkOffset, getCadOffset } from "./lib/footprint-rotation-offsets.mjs";
import { pickFootprinter } from "./lib/footprinter-map.mjs";
import { getBodySize } from "./lib/component-body-sizes.mjs";

const SCH_FILE = "Bus_Interface_for_ABB-Welcome_v2_EasyEDA_Schematic.json";
const PCB_FILE = "PCB_Bus_Interface_for_ABB-Welcome_v2_EasyEDA_PCB_2026-05-06.json";
const OUT_FILE = "circuit.json";

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function pickShapes(schDoc, pcbDoc) {
    return {
        schShapes: schDoc.schematics[0].dataStr.shape,
        pcbShapes: pcbDoc.shape,
    };
}

// Compute board bounding box from Edge Cuts (PCB layer 10) tracks; used to
// translate every PCB coordinate so the board origin sits at (0, 0).
function pcbOriginShift(pcb) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of pcb.tracks) {
        if (t.layer !== "10") continue;
        for (const p of t.points) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { cx, cy, w: maxX - minX, h: maxY - minY };
}

// Centralised in lib/pcb-units.mjs (`pcbXY`) so the same factor is used
// everywhere on the PCB side.
const pcbToCircuit = pcbXY;

// Match a placed footprint in the PCB to its row in the schematic by
// designator. The designator is the source of truth for who-is-who.
function indexBy(arr, key) {
    const m = new Map();
    for (const o of arr) {
        const k = o[key];
        if (k != null) m.set(k, o);
    }
    return m;
}

// Re-id every element coming out of the per-component circuit.json so that
// IDs are unique across the whole project. We also rewrite cross-references.
function reidComponentElements(elements, prefix) {
    const remap = new Map();
    function newId(oldId) {
        if (!remap.has(oldId)) remap.set(oldId, `${prefix}_${oldId}`);
        return remap.get(oldId);
    }
    const ID_FIELDS = [
        "source_component_id", "source_port_id",
        "pcb_component_id", "pcb_port_id", "pcb_smtpad_id", "pcb_plated_hole_id",
        "pcb_silkscreen_path_id", "pcb_silkscreen_text_id",
        "pcb_courtyard_outline_id",
        "cad_component_id",
    ];
    // First pass: register every primary id.
    for (const el of elements) {
        for (const k of ID_FIELDS) if (el[k] != null && k.endsWith("_id") && el.type && k.startsWith(el.type)) newId(el[k]);
    }
    // Second pass: rewrite all references (any *_id field).
    return elements.map(el => {
        const copy = { ...el };
        for (const k of ID_FIELDS) if (copy[k] != null) copy[k] = newId(copy[k]);
        return copy;
    });
}

function normaliseDeg(d) {
    let r = (d || 0) % 360;
    if (r < 0) r += 360;
    return r;
}

// Rotation that pad coordinates use — must match EasyEDA exactly.
function padsRotation(footprint) {
    return normaliseDeg(footprint.rotation || 0);
}

function silkRotation(footprint, lcsc) {
    return normaliseDeg((footprint.rotation || 0) + getSilkOffset(lcsc));
}
function cadRotation(footprint, lcsc) {
    return normaliseDeg((footprint.rotation || 0) + getCadOffset(lcsc));
}

function placePcbComponent(pcbEl, footprint, shift) {
    const out = { ...pcbEl };
    out.center = pcbToCircuit({ x: footprint.x, y: footprint.y }, shift);
    // The component's rotation field reflects the pad layout (electrical
    // truth) so downstream tools that use it for routing land on the right pins.
    out.rotation = padsRotation(footprint);
    return out;
}

// Apply the component's translation + rotation to every child element so they
// sit at absolute board coordinates. The cache emits everything relative to
// (0,0) and 0° rotation, so we rotate first and then translate to the new
// component centre.
//
// `padsRot` is applied to electrically-relevant children (pads, holes,
// ports) — these MUST land where EasyEDA placed them so the project's traces
// connect to the right pin. `silkRot` is for silk/courtyard/silk_text, and
// `cadRot` is for the 3D model. The two visual rotations may differ when the
// cache's silk artist and 3D modeller chose different natural orientations.
function transformChildren(pcbEls, center, padsRot, silkRot, cadRot) {
    const make = deg => {
        const rad = ((deg || 0) * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const rot = p => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos });
        return p => { const r = rot(p); return { x: r.x + center.x, y: r.y + center.y }; };
    };
    const txPad = make(padsRot);
    const txSilk = make(silkRot);
    const txCad = make(cadRot);

    return pcbEls.map(el => {
        switch (el.type) {
            case "pcb_smtpad":
            case "pcb_plated_hole":
            case "pcb_port": {
                const r = txPad({ x: el.x, y: el.y });
                const out = { ...el, x: r.x, y: r.y };
                if (el.shape === "rect" && Math.abs(((padsRot || 0) % 180)) === 90) {
                    out.width = el.height;
                    out.height = el.width;
                }
                return out;
            }
            case "pcb_silkscreen_path":
                return { ...el, route: el.route.map(txSilk) };
            case "pcb_courtyard_outline":
                return { ...el, outline: el.outline.map(txSilk) };
            case "pcb_silkscreen_text":
            case "pcb_text": {
                const c = el.center ?? { x: el.x ?? 0, y: el.y ?? 0 };
                const r = txSilk(c);
                const out = { ...el };
                if (el.center) out.center = r;
                else { out.x = r.x; out.y = r.y; }
                out.rotation = (el.rotation || 0) + (silkRot || 0);
                return out;
            }
            case "cad_component": {
                const p = el.position ?? { x: 0, y: 0, z: 0 };
                const r = txCad({ x: p.x, y: p.y });
                const baseRot = el.rotation ?? { x: 0, y: 0, z: 0 };
                return {
                    ...el,
                    position: { x: r.x, y: r.y, z: p.z ?? 0 },
                    rotation: { x: baseRot.x ?? 0, y: baseRot.y ?? 0, z: (baseRot.z ?? 0) + (cadRot || 0) },
                };
            }
            default:
                return el;
        }
    });
}

async function main() {
    const schDoc = readJson(path.join(REPO_ROOT, SCH_FILE));
    const pcbDoc = readJson(path.join(REPO_ROOT, PCB_FILE));
    const { schShapes, pcbShapes } = pickShapes(schDoc, pcbDoc);

    const sch = parseSchematicShapes(schShapes);
    const pcb = parsePcbShapes(pcbShapes);

    console.log(`Schematic: ${sch.libs.length} components, ${sch.wires.length} wires, ${sch.netLabels.length} net labels`);
    console.log(`PCB: ${pcb.libs.length} footprints, ${pcb.tracks.length} tracks, ${pcb.vias.length} vias`);

    // Sanity: list LCSC IDs we need.
    const lcscIds = [...new Set(sch.libs.filter(l => l.lcsc).map(l => l.lcsc))];
    console.log(`Unique LCSC components to fetch: ${lcscIds.length}`);

    await preloadAll(lcscIds, {
        onProgress: ({ i, total, lcsc, cached }) =>
            console.log(`  [${i}/${total}] ${lcsc} ${cached ? "(cached)" : "(downloading…)"}`),
    });

    const shift = pcbOriginShift(pcb);
    console.log(`PCB origin shift: cx=${shift.cx.toFixed(3)} cy=${shift.cy.toFixed(3)} board=${shift.w.toFixed(2)}x${shift.h.toFixed(2)}`);

    // Build the output as a flat list of circuit elements.
    const out = [];

    // Board outline (from Edge Cuts, layer 10).
    out.push(buildPcbBoard({ pcb, shift }));

    const pcbByDesignator = indexBy(pcb.libs, "designator");
    const sheetCenter = computeSchematicCenter(sch.libs);
    const idCounter = makeIdCounter();
    // libIndex (in sch.libs) → Map<pinNumber, source_port_id>.
    const pinSourcePortByLib = new Map();

    let compIdx = 0;
    for (let li = 0; li < sch.libs.length; li++) {
        const sLib = sch.libs[li];
        if (!sLib.lcsc || !sLib.designator) continue; // skip frame, logos, FTDI header for now
        pinSourcePortByLib.set(li, new Map());
        compIdx++;
        const prefix = `c${compIdx}`;
        const compEls = loadComponentCircuitJson(sLib.lcsc);
        const reided = reidComponentElements(compEls, prefix);

        // Identify the (re-id'd) source_component_id and build a pin-number → source_port_id map.
        let sourceComponentId = null;
        const pinSourcePortIds = new Map();
        for (const el of reided) {
            if (el.type === "source_component") {
                sourceComponentId = el.source_component_id;
                el.name = sLib.designator;
                if (sLib.value) el.display_value = sLib.value;
                el.manufacturer_part_number = sLib.mpn ?? el.manufacturer_part_number;
                el.supplier_part_numbers = { lcsc: [sLib.lcsc] };
            }
            if (el.type === "source_port" && el.pin_number != null) {
                pinSourcePortIds.set(String(el.pin_number), el.source_port_id);
            }
        }
        // Hand the pin map up to the connectivity step.
        for (const [k, v] of pinSourcePortIds) pinSourcePortByLib.get(li).set(k, v);

        // Schematic side: build schematic_component + schematic_port entries.
        if (sourceComponentId) {
            const { elements: schEls } = buildSchematicForLib(sLib, {
                schematicComponentId: `schematic_component_${prefix}`,
                sourceComponentId,
                pinSourcePortIds,
                sheetCenter,
                counter: idCounter,
            });
            out.push(...schEls);
        }

        // Place the PCB component if we have a matching footprint.
        const fp = pcbByDesignator.get(sLib.designator);
        if (fp) {
            const placedEls = reided.map(el => {
                if (el.type === "pcb_component") return placePcbComponent(el, fp, shift);
                return el;
            });
            const center = pcbToCircuit({ x: fp.x, y: fp.y }, shift);
            const rotPads = padsRotation(fp);
            const rotSilk = silkRotation(fp, sLib.lcsc);
            const rotCad = cadRotation(fp, sLib.lcsc);
            const transformed = transformChildren(placedEls, center, rotPads, rotSilk, rotCad);

            // Replace EasyEDA's external 3D-model URLs with a tscircuit
            // footprinter_string when we can — those URLs fail with CORS in
            // the circuit-json viewer. Also override `size` when the cache
            // reported pad-bbox instead of body dimensions (radial caps,
            // terminal blocks, modules…).
            // Use the cache's 3D-model URLs as the single source of truth for
            // every component. Earlier we tried `footprinter_string` to avoid
            // CORS, but the dispatcher in jscad-electronics has gaps (no
            // `case "res"`, broken `led0603` defaults, inconsistent caching),
            // so URL-only is more uniform. Keep the cache's
            // model_origin_position / model_object_fit which the viewer
            // applies when loading the .obj.
            const bodySize = getBodySize(sLib.lcsc);
            const finalEls = transformed.map(el => {
                if (el.type !== "cad_component") return el;
                const z = ((el.rotation?.z ?? 0) % 360 + 360) % 360;
                const cleaned = {
                    type: "cad_component",
                    cad_component_id: el.cad_component_id,
                    pcb_component_id: el.pcb_component_id,
                    source_component_id: el.source_component_id,
                    position: el.position,
                    rotation: { x: 0, y: 0, z },
                    model_origin_alignment: el.model_origin_alignment ?? "center_of_component_on_board_surface",
                    anchor_alignment: el.anchor_alignment ?? "center_of_component_on_board_surface",
                };
                if (el.model_obj_url) cleaned.model_obj_url = el.model_obj_url;
                if (el.model_step_url) cleaned.model_step_url = el.model_step_url;
                if (el.model_origin_position) cleaned.model_origin_position = el.model_origin_position;
                if (el.model_object_fit) cleaned.model_object_fit = el.model_object_fit;
                cleaned.size = bodySize ? { ...bodySize } : el.size;
                return cleaned;
            });
            out.push(...finalEls);
        } else {
            // No footprint placement: drop pcb_* elements; keep source/cad.
            out.push(...reided.filter(el => !el.type.startsWith("pcb_") && el.type !== "cad_component"));
        }
    }

    // ---- Components without LCSC ----------------------------------------
    // P2 (FTDI 6-pin), H1-H3 (tooling holes). The schematic frame and the
    // OSHW logo are intentionally skipped.
    const schByDes = indexBy(sch.libs, "designator");
    const pcbByDes = pcbByDesignator;

    const ftdiSchLib = schByDes.get("P2");
    const ftdiPcbLib = pcbByDes.get("P2");
    if (ftdiSchLib) {
        const { elements: ftdiEls, sourcePortIds } = buildFtdiHeader({
            schLib: ftdiSchLib,
            pcbLib: ftdiPcbLib,
            sheetCenter,
            shift,
            idPrefix: "P2",
        });
        out.push(...ftdiEls);
        // Plug P2's pins into the connectivity step too.
        const li = sch.libs.indexOf(ftdiSchLib);
        if (li !== -1) {
            pinSourcePortByLib.set(li, sourcePortIds);
        }
    }

    for (const des of ["H1", "H2", "H3"]) {
        const pcbLib = pcbByDes.get(des);
        out.push(...buildToolingHole({ pcbLib, shift, idPrefix: des }));
    }

    // Build connectivity from wires + net labels + pin positions.
    const conn = buildConnectivity({
        libs: sch.libs,
        wires: sch.wires,
        netLabels: sch.netLabels,
        pinSourcePortByLib,
    });
    console.log(`Nets detected: ${conn.nets.size}`);

    // Emit nets, source_traces, schematic_traces and schematic_net_labels.
    const traceEls = emitNetsAndTraces({
        wires: sch.wires,
        netLabels: sch.netLabels,
        conn,
        sheetCenter,
        counter: idCounter,
    });
    out.push(...traceEls);

    // PCB tracks + vias.
    const pcbTraceEls = emitPcbTracesAndVias({ pcb, shift, counter: idCounter });
    out.push(...pcbTraceEls);

    // Stamp connected_source_net_id back onto each source_port we placed.
    for (const el of out) {
        if (el.type === "source_port") {
            const netId = conn.pinNetByPortId.get(el.source_port_id);
            if (netId) el.connected_source_net_id = netId;
        }
    }

    fs.writeFileSync(path.join(REPO_ROOT, OUT_FILE), JSON.stringify(out, null, 2));
    console.log(`\nWrote ${OUT_FILE} with ${out.length} elements.`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

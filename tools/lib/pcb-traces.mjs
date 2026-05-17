// Build pcb_trace, pcb_via and the board outline from parsed EasyEDA PCB shapes.

import { pcbXY, pcbLen } from "./pcb-units.mjs";

const LAYER_BY_EDA = {
    "1": "top",
    "2": "bottom",
    "10": "edge_cuts",
    "11": "multi", // vias
};

function layerOf(eda) { return LAYER_BY_EDA[eda] ?? null; }

const tx = pcbXY;

export function emitPcbTracesAndVias({ pcb, shift, counter }) {
    const out = [];

    // 1. pcb_trace per TRACK on copper layers (skip Edge Cuts).
    for (const t of pcb.tracks) {
        const layer = layerOf(t.layer);
        if (!layer || layer === "edge_cuts") continue;
        if (t.points.length < 2) continue;
        const route = t.points.map(p => ({
            route_type: "wire",
            x: tx(p, shift).x,
            y: tx(p, shift).y,
            width: pcbLen(t.width),
            layer,
        }));
        out.push({
            type: "pcb_trace",
            pcb_trace_id: `pcb_trace_${counter.next()}`,
            route,
        });
    }

    // 2. pcb_via per VIA. EasyEDA stores .diameter (outer pad) and .drillRadius
    //    (drill); circuit-json wants outer_diameter and hole_diameter.
    for (const v of pcb.vias) {
        const c = tx({ x: v.x, y: v.y }, shift);
        out.push({
            type: "pcb_via",
            pcb_via_id: `pcb_via_${counter.next()}`,
            x: c.x,
            y: c.y,
            outer_diameter: pcbLen(v.diameter),
            hole_diameter: pcbLen(v.drillRadius * 2),
            layers: ["top", "bottom"],
        });
    }

    return out;
}

// Produce a pcb_board with an explicit outline polygon from layer-10 segments
// rather than using just the bounding box.
export function buildPcbBoard({ pcb, shift }) {
    // EdgeCuts may include arcs as well as tracks. We approximate by collecting
    // the endpoints of every layer-10 TRACK and ARC segment in source order.
    const points = [];
    for (const t of pcb.tracks) {
        if (t.layer !== "10") continue;
        for (const p of t.points) points.push(tx(p, shift));
    }
    for (const a of pcb.arcs) {
        if (a.layer !== "10") continue;
        // Best-effort: extract the M and final point from the SVG path.
        const m = a.path.match(/M\s*([0-9.\-]+)[ ,]([0-9.\-]+).*?([0-9.\-]+)[ ,]([0-9.\-]+)\s*$/);
        if (m) {
            points.push(tx({ x: Number(m[1]), y: Number(m[2]) }, shift));
            points.push(tx({ x: Number(m[3]), y: Number(m[4]) }, shift));
        }
    }
    // Compute bounding box for width/height.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const width = maxX - minX, height = maxY - minY;
    // We don't try to reconstruct a non-rectangular outline here — Edge Cuts
    // tracks + arcs do not arrive in topological order, so naively connecting
    // their endpoints produces self-intersecting polygons. Leave the board
    // as a simple rectangle for now; outline reconstruction is a follow-up.
    return {
        type: "pcb_board",
        pcb_board_id: "pcb_board_0",
        center: { x: 0, y: 0 },
        width: width || 1,
        height: height || 1,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
    };
}

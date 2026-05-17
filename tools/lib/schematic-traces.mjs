// Emit source_net, source_trace, schematic_trace, schematic_net_label
// elements from a connectivity graph + the parsed EasyEDA schematic.

import { toMm } from "./schematic.mjs";

export function emitNetsAndTraces({ wires, netLabels, conn, sheetCenter, counter }) {
    const out = [];

    // 1. source_net per net (named or auto-generated). Skip nets that contain no
    //    pins — they are stub wires with no electrical meaning yet.
    const meaningfulNetIds = new Set();
    for (const [netId, net] of conn.nets) {
        if (net.sourcePortIds.size === 0 && !net.name) continue;
        meaningfulNetIds.add(netId);
        const el = {
            type: "source_net",
            source_net_id: netId,
            name: net.name || netId.replace(/^source_net_/, ""),
            member_source_group_ids: [],
        };
        if (net.isGround) el.is_ground = true;
        out.push(el);
    }

    // 2. source_trace per net that has ≥ 2 source_ports — this is what makes
    //    components electrically connected in the source plane.
    for (const [netId, net] of conn.nets) {
        if (net.sourcePortIds.size < 1) continue;
        out.push({
            type: "source_trace",
            source_trace_id: `source_trace_${counter.next()}`,
            connected_source_port_ids: [...net.sourcePortIds],
            connected_source_net_ids: meaningfulNetIds.has(netId) ? [netId] : [],
        });
    }

    // 3. schematic_trace per wire. Each wire becomes one trace whose `edges`
    //    walk through the wire's points, and is associated with the net the
    //    wire belongs to. Net id is optional on schematic_trace itself, but we
    //    set source_trace_id implicitly via the source_net by matching the
    //    first source_trace whose connected_source_net_ids includes our net.
    const sourceTraceByNet = new Map();
    for (const el of out) if (el.type === "source_trace" && el.connected_source_net_ids?.length) sourceTraceByNet.set(el.connected_source_net_ids[0], el.source_trace_id);

    wires.forEach((w, wi) => {
        if (w.points.length < 2) return;
        const edges = [];
        for (let i = 0; i + 1 < w.points.length; i++) {
            edges.push({
                from: toMm(w.points[i].x, w.points[i].y, sheetCenter),
                to: toMm(w.points[i + 1].x, w.points[i + 1].y, sheetCenter),
            });
        }
        const netId = conn.wireNetByIndex.get(wi);
        const trace = {
            type: "schematic_trace",
            schematic_trace_id: `schematic_trace_${counter.next()}`,
            edges,
            junctions: [],
        };
        const stId = netId ? sourceTraceByNet.get(netId) : null;
        if (stId) trace.source_trace_id = stId;
        out.push(trace);
    });

    // 4. schematic_net_label per F~ entry. Choose a side from the EasyEDA
    //    rotation so the text reads on the right of the anchor.
    for (const lbl of netLabels) {
        if (!lbl.net) continue;
        const center = toMm(lbl.x, lbl.y, sheetCenter);
        // EasyEDA rotation 0=right, 90=up, 180=left, 270=down → tscircuit sides.
        const side = ({
            0: "right", 90: "top", 180: "left", 270: "bottom",
        })[((lbl.rotation || 0) % 360 + 360) % 360] || "right";
        out.push({
            type: "schematic_net_label",
            schematic_net_label_id: `schematic_net_label_${counter.next()}`,
            text: lbl.net,
            anchor_position: center,
            center,
            anchor_side: side,
            source_net_id: meaningfulNetIds.has(`source_net_${lbl.net}`) ? `source_net_${lbl.net}` : undefined,
        });
    }

    return out;
}

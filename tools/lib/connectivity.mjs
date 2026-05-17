// Build the schematic connectivity graph from EasyEDA wires, net labels, and
// component pin positions. The graph yields:
//   - nets: Set of points that share a single electrical node, optionally
//     named via a net label.
//   - per-pin net assignment: Map<source_port_id, net_id>
//   - per-wire net assignment: Map<wire_index, net_id>
//
// Coordinates are kept in EasyEDA schematic units; the caller converts to mm
// when emitting circuit_json.

const KEY_EPS = 0.5; // EasyEDA grid is 5/10 units; round to 1-unit precision when keying.

function pointKey(p) {
    return `${Math.round(p.x / KEY_EPS) * KEY_EPS},${Math.round(p.y / KEY_EPS) * KEY_EPS}`;
}

class UnionFind {
    constructor() { this.parent = new Map(); }
    add(k) { if (!this.parent.has(k)) this.parent.set(k, k); }
    find(k) {
        let r = k;
        while (this.parent.get(r) !== r) r = this.parent.get(r);
        let c = k;
        while (this.parent.get(c) !== r) { const n = this.parent.get(c); this.parent.set(c, r); c = n; }
        return r;
    }
    union(a, b) { this.add(a); this.add(b); const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.parent.set(ra, rb); }
}

// Inputs:
//   libs: array of parsed schematic LIB objects (with pins[])
//   wires: array of parsed wires (each .points: [{x,y}, …])
//   netLabels: array of parsed net labels (.x, .y, .net, .variant)
//   pinSourcePortByLib: Map<libIndex, Map<pinNumber, source_port_id>>
//
// Output:
//   nets: Map<netId, { name|null, points:Set<key>, sourcePortIds:Set<id>, isGround:boolean }>
//   pinNetByPortId: Map<source_port_id, netId>
//   wireNetByIndex: Map<wireIndex, netId>
//   pointNetByKey: Map<key, netId>
export function buildConnectivity({ libs, wires, netLabels, pinSourcePortByLib }) {
    const uf = new UnionFind();

    // 1. Each wire stitches consecutive points together.
    wires.forEach((w, wi) => {
        if (w.points.length === 0) return;
        const keys = w.points.map(pointKey);
        for (let i = 0; i + 1 < keys.length; i++) uf.union(keys[i], keys[i + 1]);
    });

    // 2. Pins land on grid points and join whatever wire they touch.
    const pinKeyByPortId = new Map();
    libs.forEach((lib, li) => {
        const pinMap = pinSourcePortByLib.get(li);
        if (!pinMap) return;
        for (const p of lib.pins) {
            const k = pointKey(p);
            uf.add(k);
            const sourcePortId = pinMap.get(String(p.pinNumber));
            if (sourcePortId) pinKeyByPortId.set(sourcePortId, k);
        }
    });

    // 3. Net label anchors join the underlying point.
    const labelByKey = new Map(); // key -> { name, isGround }
    for (const f of netLabels) {
        const k = pointKey(f);
        uf.add(k);
        const isGround = f.variant === "part_netLabel_GNd" || (f.net ?? "").toUpperCase() === "GND";
        const existing = labelByKey.get(k);
        if (!existing || (!existing.name && f.net)) labelByKey.set(k, { name: f.net, isGround });
    }

    // 4. Roll roots up into named nets.
    const nets = new Map(); // root -> { name, points, sourcePortIds, isGround }
    function ensureNet(root) {
        if (!nets.has(root)) nets.set(root, { name: null, points: new Set(), sourcePortIds: new Set(), isGround: false });
        return nets.get(root);
    }

    for (const k of uf.parent.keys()) {
        const r = uf.find(k);
        const net = ensureNet(r);
        net.points.add(k);
    }
    for (const [portId, k] of pinKeyByPortId) {
        const r = uf.find(k);
        ensureNet(r).sourcePortIds.add(portId);
    }
    for (const [k, info] of labelByKey) {
        const r = uf.find(k);
        const n = ensureNet(r);
        if (info.name && !n.name) n.name = info.name;
        if (info.isGround) n.isGround = true;
    }

    // 5. Issue stable net IDs.
    const idByRoot = new Map();
    let auto = 0;
    for (const root of nets.keys()) {
        const n = nets.get(root);
        const id = `source_net_${n.name || `unnamed_${++auto}`}`;
        idByRoot.set(root, id);
    }

    const pinNetByPortId = new Map();
    for (const [portId, k] of pinKeyByPortId) pinNetByPortId.set(portId, idByRoot.get(uf.find(k)));

    const wireNetByIndex = new Map();
    wires.forEach((w, wi) => {
        if (w.points.length === 0) return;
        const r = uf.find(pointKey(w.points[0]));
        wireNetByIndex.set(wi, idByRoot.get(r));
    });

    const pointNetByKey = new Map();
    for (const k of uf.parent.keys()) pointNetByKey.set(k, idByRoot.get(uf.find(k)));

    // Re-key nets by the public id for caller convenience.
    const netsById = new Map();
    for (const [root, n] of nets) netsById.set(idByRoot.get(root), n);

    return { nets: netsById, pinNetByPortId, wireNetByIndex, pointNetByKey };
}

export { pointKey };

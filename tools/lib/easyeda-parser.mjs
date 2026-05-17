// Pure parser for EasyEDA's `~`-delimited shape strings.
// EasyEDA Y axis points DOWN (screen). Circuit-json uses Y UP. Conversion
// happens in the higher-level converter, NOT here — this module returns
// values exactly as written in the source files.

const SUBSEP = "#@$";

// ---------- attribute pack ----------
// LIB attribute packs are backtick-delimited key`value`key`value`... lists.
export function parseAttrs(packed) {
    if (!packed) return {};
    const parts = packed.split("`");
    const out = {};
    for (let i = 0; i + 1 < parts.length; i += 2) out[parts[i]] = parts[i + 1];
    return out;
}

// ---------- LIB envelope (shared between schematic and PCB) ----------
function splitLib(libStr) {
    const idx = libStr.indexOf(SUBSEP);
    const head = idx === -1 ? libStr : libStr.slice(0, idx);
    const inner = idx === -1 ? [] : libStr.slice(idx + SUBSEP.length).split(SUBSEP);
    return { head: head.split("~"), inner };
}

// ---------- SCHEMATIC ----------

// Inner T~ with mark="P" carries the component designator (e.g. "R10"); mark="N" carries the value/name shown on screen.
function findInnerText(inner, mark) {
    for (const s of inner) {
        if (!s.startsWith(`T~${mark}~`)) continue;
        const f = s.split("~");
        const ci = f.indexOf("comment");
        if (ci !== -1 && ci + 1 < f.length) return f[ci + 1];
    }
    return null;
}

// Inner P~ entries describe pins: `P~show~electric~spicePinNumber~x~y~rotation~id~0^^…^^pinDot~…`
// The pin number sits at index 3 and absolute pin location at indices 4,5.
function parseLibPins(inner) {
    const pins = [];
    for (const s of inner) {
        if (!s.startsWith("P~")) continue;
        const f = s.split("~");
        pins.push({
            pinNumber: f[3],
            x: Number(f[4]),
            y: Number(f[5]),
            rotation: Number(f[6] || 0),
        });
    }
    return pins;
}

export function parseSchematicLib(libStr) {
    const { head, inner } = splitLib(libStr);
    const attrs = parseAttrs(head[3] ?? "");
    return {
        kind: "lib",
        x: Number(head[1]),
        y: Number(head[2]),
        rotation: Number(head[4] || 0),
        gid: head[6] ?? null,
        attrs,
        package: attrs.package ?? null,
        mpn: attrs["Manufacturer Part"] ?? null,
        lcsc: attrs["Supplier Part"] ?? null,
        manufacturer: attrs.Manufacturer ?? null,
        value: attrs.Value ?? attrs.nameAlias ?? null,
        spicePre: attrs.spicePre ?? null,
        designator: findInnerText(inner, "P"),
        valueText: findInnerText(inner, "N"),
        pins: parseLibPins(inner),
    };
}

// W~x1 y1 x2 y2 [...]~color~strokeWidth~direction~none~id~locked
export function parseWire(wireStr) {
    const f = wireStr.split("~");
    const nums = f[1].trim().split(/\s+/).map(Number);
    const points = [];
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
    return {
        kind: "wire",
        points,
        color: f[2],
        strokeWidth: Number(f[3] || 1),
        gid: f[6] ?? null,
    };
}

// Net label / port. Two flavors we care about:
//   F~part_netLabel_netPort~x~y~rotation~id~~0^^x~y^^NETNAME~color~textX~textY~tRot~start~1~Times…~size~flag_id^^PL~…~strokeColor~…
//   F~part_netLabel_GNd~x~y~rotation~id~~0^^x~y^^GND~color~…
// We harvest the net name (first token after the second ^^) and the anchor (x,y).
export function parseNetLabel(flagStr) {
    const f = flagStr.split("~");
    const variant = f[1]; // part_netLabel_netPort | part_netLabel_GNd | part_netLabel_VCC | …
    const x = Number(f[2]);
    const y = Number(f[3]);
    const rotation = Number(f[4] || 0);
    const m = flagStr.match(/\^\^[^^]*\^\^([^~]+)~/);
    const net = m ? m[1] : null;
    return { kind: "netLabel", variant, x, y, rotation, net, gid: f[5] ?? null };
}

export function parseSchematicShapes(shapes) {
    const libs = [], wires = [], netLabels = [], junctions = [], unknown = {};
    for (const s of shapes) {
        const head = s.split("~", 1)[0];
        if (head === "LIB") libs.push(parseSchematicLib(s));
        else if (head === "W") wires.push(parseWire(s));
        else if (head === "F") netLabels.push(parseNetLabel(s));
        else if (head === "J" || head === "O") {
            // J = junction (auto), O = junction dot. Both: J/O~x~y~radius~fill~id
            const f = s.split("~");
            junctions.push({ kind: "junction", x: Number(f[1]), y: Number(f[2]), gid: f[5] ?? null });
        } else unknown[head] = (unknown[head] || 0) + 1;
    }
    return { libs, wires, netLabels, junctions, unknown };
}

// ---------- PCB ----------

// PCB LIB envelope: LIB~x~y~attrs~rotation~importFlag~id~?~~~~~~~~#@$<inner>
// Inner shapes are usually TRACK/PAD/HOLE/CIRCLE/ARC/SOLIDREGION/TEXT (footprint geometry).
export function parsePcbLib(libStr) {
    const { head, inner } = splitLib(libStr);
    const attrs = parseAttrs(head[3] ?? "");
    return {
        kind: "pcbLib",
        x: Number(head[1]),
        y: Number(head[2]),
        rotation: Number(head[4] || 0),
        gid: head[6] ?? null,
        attrs,
        package: attrs.package ?? null,
        mpn: attrs["Manufacturer Part"] ?? null,
        lcsc: attrs["Supplier Part"] ?? null,
        designator: findInnerText(inner, "P") ?? findInnerTextSilk(inner),
        innerCount: inner.length,
    };
}
// Some PCB footprints store the designator inside an inner TEXT~ on layer 3 (silk).
function findInnerTextSilk(inner) {
    for (const s of inner) {
        if (!s.startsWith("TEXT~")) continue;
        const f = s.split("~");
        // TEXT~mark~x~y~strokeWidth~rotation~mirror~layer~font~fontSize~text~…
        if (f[1] === "P") return f[10] ?? null;
    }
    return null;
}

// TRACK~width~layer~net~points~id~locked
export function parseTrack(s) {
    const f = s.split("~");
    const nums = f[4].trim().split(/\s+/).map(Number);
    const points = [];
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
    return {
        kind: "track",
        width: Number(f[1]),
        layer: f[2],
        net: f[3] || null,
        points,
        gid: f[5] ?? null,
    };
}

// VIA~x~y~diameter~net~drillRadius~id~locked
export function parseVia(s) {
    const f = s.split("~");
    return {
        kind: "via",
        x: Number(f[1]),
        y: Number(f[2]),
        diameter: Number(f[3]),
        net: f[4] || null,
        drillRadius: Number(f[5] || 0),
        gid: f[6] ?? null,
    };
}

// ARC~width~layer~net~helperDots~pathString~id~locked
// pathString is SVG-like: "M x,y A rx,ry rot largeArc,sweep ex,ey".
export function parseArc(s) {
    const f = s.split("~");
    return {
        kind: "arc",
        width: Number(f[1]),
        layer: f[2],
        net: f[3] || null,
        path: f[5],
        gid: f[6] ?? null,
    };
}

// COPPERAREA~width~layer~net~points~strokeColor~?~id~?~?~fillStyle~?~?~?
export function parseCopperArea(s) {
    const f = s.split("~");
    const nums = f[4].trim().split(/\s+/).map(Number);
    const points = [];
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
    return { kind: "copperArea", width: Number(f[1]), layer: f[2], net: f[3] || null, points, gid: f[7] ?? null };
}

export function parsePcbShapes(shapes) {
    const libs = [], tracks = [], vias = [], arcs = [], copperAreas = [], texts = [], circles = [], unknown = {};
    for (const s of shapes) {
        const head = s.split("~", 1)[0];
        if (head === "LIB") libs.push(parsePcbLib(s));
        else if (head === "TRACK") tracks.push(parseTrack(s));
        else if (head === "VIA") vias.push(parseVia(s));
        else if (head === "ARC") arcs.push(parseArc(s));
        else if (head === "COPPERAREA") copperAreas.push(parseCopperArea(s));
        else if (head === "TEXT") texts.push({ kind: "text", raw: s });
        else if (head === "CIRCLE") circles.push({ kind: "circle", raw: s });
        else unknown[head] = (unknown[head] || 0) + 1;
    }
    return { libs, tracks, vias, arcs, copperAreas, texts, circles, unknown };
}

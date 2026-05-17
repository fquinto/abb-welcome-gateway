import { pickSymbolName } from "./symbol-map.mjs";

// Build schematic_* circuit-json elements from the parsed EasyEDA schematic.
//
// Coordinate system:
//   EasyEDA schematic uses internal "10-units = 0.1 inch" coordinates with Y
//   pointing DOWN. Circuit-json wants millimetres with Y UP. We convert with:
//      x_mm = (easyeda_x - cx) * 0.254
//      y_mm = (cy - easyeda_y) * 0.254
//   where (cx, cy) is the centre of the bounding box of all placed components,
//   so the resulting schematic is centred on the origin.

const UNIT_MM = 0.254; // 1 EasyEDA schematic unit ≈ 0.254 mm

export function computeSchematicCenter(libs) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const l of libs) {
        if (l.x < minX) minX = l.x; if (l.x > maxX) maxX = l.x;
        if (l.y < minY) minY = l.y; if (l.y > maxY) maxY = l.y;
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function toMm(easyedaX, easyedaY, center) {
    return {
        x: (easyedaX - center.cx) * UNIT_MM,
        y: (center.cy - easyedaY) * UNIT_MM,
    };
}

// Decide which side of the symbol each pin lives on. We use position relative
// to the symbol centre rather than the EasyEDA pin rotation, because the
// rotation field has a different convention than circuit-json's facing.
function facingDirection(pinDx, pinDy) {
    if (Math.abs(pinDx) >= Math.abs(pinDy)) return pinDx >= 0 ? "right" : "left";
    return pinDy >= 0 ? "down" : "up";
}

// Convert one EasyEDA schematic LIB into schematic_component + schematic_port
// elements. The source_component already exists (came out of the cached
// per-component conversion) and is referenced via source_component_id.
//
// `pinSourcePortIds` maps EasyEDA pin number (string) → source_port_id of the
// already-emitted source_port.
//
// Returns the new circuit elements plus a map keyed by pin number to the
// schematic_port_id we created (callers need it to wire traces later).
export function buildSchematicForLib(lib, {
    schematicComponentId,
    sourceComponentId,
    pinSourcePortIds,
    sheetCenter,
    counter,
}) {
    const elements = [];

    const center = toMm(lib.x, lib.y, sheetCenter);

    // Bounding box of pins relative to the LIB origin. EasyEDA pin coordinates
    // are absolute, so we subtract the LIB origin to get local offsets.
    let minDx = Infinity, minDy = Infinity, maxDx = -Infinity, maxDy = -Infinity;
    for (const p of lib.pins) {
        const dx = p.x - lib.x;
        const dy = p.y - lib.y;
        if (dx < minDx) minDx = dx; if (dx > maxDx) maxDx = dx;
        if (dy < minDy) minDy = dy; if (dy > maxDy) maxDy = dy;
    }
    if (!isFinite(minDx)) { minDx = -10; maxDx = 10; minDy = -10; maxDy = 10; }
    // Pad the symbol box a bit beyond pin span so labels do not crash into pins.
    const pad = 5;
    const widthEda = (maxDx - minDx) + 2 * pad;
    const heightEda = (maxDy - minDy) + 2 * pad;

    const symbolName = pickSymbolName(lib);
    const schematicComponent = {
        type: "schematic_component",
        schematic_component_id: schematicComponentId,
        source_component_id: sourceComponentId,
        center,
        size: { width: widthEda * UNIT_MM, height: heightEda * UNIT_MM },
        rotation: 0,
    };
    if (symbolName) schematicComponent.symbol_name = symbolName;
    elements.push(schematicComponent);

    const schematicPortIds = new Map();
    for (const p of lib.pins) {
        const sourcePortId = pinSourcePortIds.get(String(p.pinNumber));
        if (!sourcePortId) continue; // pin we did not see in the cached source_ports — skip.
        const portId = `schematic_port_${counter.next()}`;
        const portCenter = toMm(p.x, p.y, sheetCenter);
        const dx = p.x - lib.x;
        const dy = p.y - lib.y;
        elements.push({
            type: "schematic_port",
            schematic_port_id: portId,
            source_port_id: sourcePortId,
            schematic_component_id: schematicComponentId,
            center: portCenter,
            facing_direction: facingDirection(dx, dy),
            // EasyEDA Y is flipped, so dy on screen → -dy in math.
            distance_from_component_edge: 0.4,
            true_ccw_index: 0,
        });
        schematicPortIds.set(String(p.pinNumber), portId);
    }

    return { elements, schematicPortIds };
}

export function makeIdCounter() {
    let n = 0;
    return { next: () => ++n };
}

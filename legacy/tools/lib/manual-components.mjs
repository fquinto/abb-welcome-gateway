// Hand-rolled circuit-json fragments for components that have no LCSC ID and
// therefore can't go through the easyeda-converter cache: the FTDI 6-pin
// header and the three JLCPCB tooling holes.

import { toMm } from "./schematic.mjs";
import { pcbXY } from "./pcb-units.mjs";

// FTDI header P2: 6 plated holes along Y, pin 1 at the bottom (max y in EasyEDA),
// pin 6 at the top. Pin names follow the silk in the schematic.
const FTDI_PIN_NAMES = ["GND", "RTS", "VCC", "RX", "TX", "DTR"];

export function buildFtdiHeader({ schLib, pcbLib, sheetCenter, shift, idPrefix }) {
    const elements = [];
    const sourceComponentId = `source_component_${idPrefix}`;
    elements.push({
        type: "source_component",
        ftype: "simple_pin_header",
        source_component_id: sourceComponentId,
        name: "P2",
        manufacturer_part_number: "FTDI_HEADER_6P",
        pin_count: 6,
        pin_pitch_mm: 2.54,
        gender: "male",
        display_value: "FTDI",
    });

    // Source ports (one per pin) ----------------------------------------------
    const sourcePortIds = new Map();
    for (let i = 0; i < 6; i++) {
        const pinNumber = i + 1;
        const id = `source_port_${idPrefix}_p${pinNumber}`;
        elements.push({
            type: "source_port",
            source_port_id: id,
            source_component_id: sourceComponentId,
            name: `pin${pinNumber}`,
            pin_number: pinNumber,
            port_hints: [`pin${pinNumber}`, FTDI_PIN_NAMES[i]],
        });
        sourcePortIds.set(String(pinNumber), id);
    }

    // Schematic side ----------------------------------------------------------
    const schCenter = toMm(schLib.x, schLib.y, sheetCenter);
    const schematicComponentId = `schematic_component_${idPrefix}`;
    elements.push({
        type: "schematic_component",
        schematic_component_id: schematicComponentId,
        source_component_id: sourceComponentId,
        center: schCenter,
        size: { width: 4, height: 6 * 2.54 },
        rotation: 0,
        port_arrangement: { right_size: 6 },
    });
    for (const p of schLib.pins) {
        const sourcePortId = sourcePortIds.get(String(p.pinNumber));
        if (!sourcePortId) continue;
        elements.push({
            type: "schematic_port",
            schematic_port_id: `schematic_port_${idPrefix}_p${p.pinNumber}`,
            source_port_id: sourcePortId,
            schematic_component_id: schematicComponentId,
            center: toMm(p.x, p.y, sheetCenter),
            facing_direction: "left",
            distance_from_component_edge: 0.4,
            true_ccw_index: 0,
        });
    }

    // PCB side: 6 plated holes -----------------------------------------------
    if (pcbLib) {
        const pcbComponentId = `pcb_component_${idPrefix}`;
        const pcbCenter = pcbXY({ x: pcbLib.x, y: pcbLib.y }, shift);
        elements.push({
            type: "pcb_component",
            pcb_component_id: pcbComponentId,
            source_component_id: sourceComponentId,
            center: pcbCenter,
            layer: "top",
            rotation: pcbLib.rotation || 0,
            width: 2.54,
            height: 6 * 2.54,
        });
        // Six plated holes spaced 10 EasyEDA units = ~2.54 mm along Y, pin 1 at bottom.
        for (let i = 0; i < 6; i++) {
            // EasyEDA pin spacing is 10 along the schematic axis; matched here
            // by the actual hole positions seen in the source PCB.
            const eY = pcbLib.y - 25 + i * 10; // pin1 at y=lib.y+25 in EasyEDA Y-down
            const eX = pcbLib.x;
            const c = pcbXY({ x: eX, y: eY }, shift);
            const pinNumber = 6 - i; // pin1 at largest y
            elements.push({
                type: "pcb_plated_hole",
                pcb_plated_hole_id: `pcb_plated_hole_${idPrefix}_p${pinNumber}`,
                pcb_component_id: pcbComponentId,
                pcb_port_id: `pcb_port_${idPrefix}_p${pinNumber}`,
                source_port_id: sourcePortIds.get(String(pinNumber)),
                shape: "circle",
                x: c.x,
                y: c.y,
                outer_diameter: 1.7,
                hole_diameter: 0.9,
                layers: ["top", "bottom"],
                port_hints: [`pin${pinNumber}`],
            });
            elements.push({
                type: "pcb_port",
                pcb_port_id: `pcb_port_${idPrefix}_p${pinNumber}`,
                source_port_id: sourcePortIds.get(String(pinNumber)),
                pcb_component_id: pcbComponentId,
                x: c.x,
                y: c.y,
                layers: ["top", "bottom"],
            });
        }
    }

    return { elements, sourcePortIds };
}

// Tooling hole H1/H2/H3: an unplated hole with no electrical net.
export function buildToolingHole({ pcbLib, shift, idPrefix }) {
    if (!pcbLib) return [];
    const c = pcbXY({ x: pcbLib.x, y: pcbLib.y }, shift);
    return [{
        type: "pcb_hole",
        pcb_hole_id: `pcb_hole_${idPrefix}`,
        hole_shape: "circle",
        hole_diameter: 2.2677, // matches the JLCPCB standard 2.2677 mm tooling hole.
        x: c.x,
        y: c.y,
    }];
}

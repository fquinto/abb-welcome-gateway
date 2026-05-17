// Override the cad_component `size` for components where the easyeda-converter
// cache reports the bounding box of the *pads* instead of the physical body.
// Most affected: through-hole connectors (terminal blocks), radial-shape
// surface-mount parts (8 mm electrolytic caps, switches, etc.).
//
// Values are in millimetres in the component's NATURAL (rotation 0)
// orientation. The pipeline applies the project rotation later.
//
// (x, y) are the body footprint as projected on the board. `z` is height.
export const COMPONENT_BODY_SIZE = {
    // C2858857: RVT470UF16V67RV0031 — 8 mm radial electrolytic, body 8.3×8.3×10
    C2858857: { x: 8.3, y: 8.3, z: 10.0 },
    // C176665: VEJ101M1HTR-0810 — same family, 8 mm body
    C176665:  { x: 8.3, y: 8.3, z: 10.0 },
    // C8465: WJ500V-5.08-2P terminal block — body roughly 10.16×8×10
    C8465:    { x: 10.16, y: 8.0, z: 10.0 },
    // C76584: ACT45B-510-2P-TL003 — common-mode choke ~4.5×3.2×3.2
    C76584:   { x: 4.5, y: 3.2, z: 3.2 },
    // C2894722: SMMS0650 power inductor — ~7.1×6.6×3.3 (close to natural)
    C2894722: { x: 7.1, y: 6.6, z: 3.3 },
    // C318884: TS-1187A-B-A-B tactile switch — body 5.1×5.1, 1.5 mm tall
    C318884:  { x: 5.1, y: 5.1, z: 1.5 },
    // C473005: ESP32-SOLO-1 — module 17.5×25.5×3.2 (datasheet)
    C473005:  { x: 17.5, y: 25.5, z: 3.2 },
};

export function getBodySize(lcsc) {
    return COMPONENT_BODY_SIZE[lcsc] ?? null;
}

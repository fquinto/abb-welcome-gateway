// EasyEDA Pro stores PCB coordinates and lengths in 10-mil units.
// Verified empirically: this project's board reads 169.29 × 212.54 in the
// JSON, while the physical board is 43 × 54 mm → factor = 43 / 169.29 = 0.254.
export const PCB_UNIT_MM = 0.254;

// Coordinate transform: EasyEDA absolute (Y-down) → centred on board, in mm
// (Y-up).
export function pcbXY(p, shift) {
    return {
        x: (p.x - shift.cx) * PCB_UNIT_MM,
        y: -(p.y - shift.cy) * PCB_UNIT_MM,
    };
}

// Length transform: a width / diameter / drill given in EasyEDA units → mm.
export function pcbLen(eda) {
    return eda * PCB_UNIT_MM;
}

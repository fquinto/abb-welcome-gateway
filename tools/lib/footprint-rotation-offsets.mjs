// Per-LCSC visual offsets (degrees CCW). NEVER applied to pads / holes / ports
// — those must land on the EasyEDA grid for traces to connect.
//
// The silk and the 3D model can have DIFFERENT natural orientations in the
// tscircuit cache (the silk artist and the 3D modeller don't always agree),
// so we need two separate offsets.
//
// Workflow when a component looks wrong:
//   1. Open the PCB view and check whether the silk points the right way.
//      If not, adjust SILK_OFFSET for that LCSC.
//   2. Open the 3D view and check whether the body / cable apertures point
//      the right way. If not, adjust CAD_OFFSET for that LCSC.

export const FOOTPRINT_SILK_OFFSET = {
    // P1 (WJ500V-5.08-2P): cache silk has the triangle marks at -X. Project
    // rotation is 90°, EasyEDA wants the marks at +X (cables from the left).
    // 90° + 90° offset = 180° silk rotation flips the marks to +X.
    C8465: 90,
};

export const FOOTPRINT_CAD_OFFSET = {
    // P1 (WJ500V-5.08-2P): cache 3D model has the cable apertures at +Y in
    // its natural orientation. Project rotation 90° CCW maps +Y → -X (cables
    // entering from the left), which is what EasyEDA shows. So no extra
    // offset; we just want the model to follow padsRotation.
    C8465: 0,
};

export function getSilkOffset(lcsc) { return FOOTPRINT_SILK_OFFSET[lcsc] ?? 0; }
export function getCadOffset(lcsc)  { return FOOTPRINT_CAD_OFFSET[lcsc]  ?? 0; }

# KiCad v3 — routing target

KiCad project exported from the tscircuit v3 design (`legacy/tscircuit/index.circuit.tsx`)
so the board can be **routed in KiCad** (tscircuit's autorouter does not converge
on this board and produces no copper pours, which this design needs — three GND
islands, an RF module, the buck power stage and the 28 V bus all want planes /
poured copper, not point-to-point traces).

## Files

- `abb-welcome-gateway-v3.kicad_pro` — project (open this in KiCad).
- `abb-welcome-gateway-v3.kicad_pcb` — board: **fully routed** (traces, vias,
  the three GND island pours and stitching). `kicad-cli pcb drc`: 0 errors,
  0 unconnected items.
- `abb-welcome-gateway-v3.kicad_sch` — schematic.

Generated with `circuit-json-to-kicad` (KiCad file format `20241229`, i.e. KiCad 8/9).

## Source-of-truth note

Routing has started (and finished) here, so **this KiCad project is now the
source of truth for the PCB**. The tscircuit side (`legacy/tscircuit/index.circuit.tsx`)
is frozen as schematic reference; it does NOT reflect the physical changes below.

### Divergences from the tscircuit source (v3.0 routed)

- **U2 footprint replaced**: the tscircuit wrapper's hand-made 61-pad QFN-style
  footprint is not the real module. U2 now uses KiCad's official
  `RF_Module:ESP32-S3-WROOM-1` (41 pads + EP), antenna flush with the top board
  edge, with its copper keep-out.
- **LED_PIN moved from GPIO2 to GPIO6** (module pin 38 -> pin 6): the status
  LED net could not be routed out of the P2/FTDI quadrant. **Firmware must
  drive the status LED on GPIO6, not GPIO2.**
- **Board grown to 45.4 x 56.4 mm** (+3 mm height) to fit the buck band.
- Placement reworked by ground island (DGND top / BUS_GND middle+bus entry /
  PGND bottom): U1 rotated 180 (VIN toward C7/C8, SW toward D1/L2), feedback
  divider at the FB pin, star point (R_PGND/R_BGND/R_DGND) bottom-right,
  C4/C6 moved into the PGND island, LEDs rotated 180 (cathodes west), R5 and
  R8 relocated, TVS1 next to C23.
- Several nets use short B.Cu jogs; the DGND plane keeps deliberate bridges
  (module strip, east region) — re-run the zone fill after any edit.

## Regenerating (before any manual routing)

The export is driven by `@tscircuit/eval` → `circuit-json-to-kicad`. On a machine
where the tscircuit CLI runs (it needs the platform-native `@resvg/resvg-js`
binary), the supported one-liner is:

```bash
cd output
npx tsci export -f kicad_pcb index.circuit.tsx     # or: -f kicad_zip for the whole project
```

(These files were produced via the library path because the CLI's resvg binary
wasn't available in the generating environment; `tsci export` is the canonical way.)

## Routing checklist for this board

- Pour **separate ground regions** for `PGND` / `DGND` / `BUS_GND`; tie them only at
  the star point via R_PGND / R_DGND / R_BGND (the 0 Ω links).
- Keep the ESP32-S3 **antenna keep-out** clear (no copper under/near the antenna).
- Wide traces / short loops on the **buck power stage** (BUS_PWR, SW_NODE, PGND, L2, C2).
- **HV clearance** on the 28 V bus front-end (P1, F2, L1, D2/D4/D5/D7, TVS1).

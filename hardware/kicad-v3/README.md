# KiCad v3 — routing target

KiCad project exported from the tscircuit v3 design (`output/index.circuit.tsx`)
so the board can be **routed in KiCad** (tscircuit's autorouter does not converge
on this board and produces no copper pours, which this design needs — three GND
islands, an RF module, the buck power stage and the 28 V bus all want planes /
poured copper, not point-to-point traces).

## Files

- `abb-welcome-gateway-v3.kicad_pro` — project (open this in KiCad).
- `abb-welcome-gateway-v3.kicad_pcb` — board: footprints **placed** (the `pcbX/pcbY`
  from the tscircuit source), nets assigned (ratsnest), board outline. **No traces
  yet** — that's the work to do here.
- `abb-welcome-gateway-v3.kicad_sch` — schematic.

Generated with `circuit-json-to-kicad` (KiCad file format `20241229`, i.e. KiCad 8/9).

## Source-of-truth note

Up to this export, the design's source of truth is the tscircuit file
(`output/index.circuit.tsx`). **Once you start routing here, this KiCad project
becomes the source of truth for the PCB** — routing does not round-trip back into
tscircuit. Keep schematic-level changes in sync deliberately (or freeze the
tscircuit side and continue purely in KiCad).

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

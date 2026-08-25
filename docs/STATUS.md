# Project status

_Last updated: 2026-08-25_

## Hardware — v3.0, routed, pre-fabrication

The KiCad project in [`hardware/kicad-v3/`](../hardware/kicad-v3/) is the source of
truth for the board. Current state:

- **Schematic-level design complete** (captured and reviewed in the legacy
  tscircuit project, then exported to KiCad).
- **Placement and routing complete**: three separated ground islands
  (`PGND` / `DGND` / `BUS_GND`) as copper pours stitched at a single star point,
  antenna keep-out honoured, HV clearance class (0.5 mm) on the 28 V bus nets.
- **DRC clean**: 0 errors, 0 unconnected items (`kicad-cli pcb drc`, KiCad 9).
- Board size 45.4 × 56.4 mm, 2 layers, min track/clearance 0.2 mm
  (standard JLCPCB/PCBWay capability).

### What v3 improves over the original v2 design

- **ESP32-S3-WROOM-1** module replaces the EOL ESP32-SOLO-1 (official KiCad
  footprint, antenna flush with the board edge).
- **74LVC1G14 Schmitt buffer** isolates the doorbell bus from the ESP32 GPIO.
- **Ferrite bead + local decoupling** split the buck output `V3V3` from the
  module-local rail `V3V3_ESP` to keep switching noise out of the radio.
- **Three ground islands** joined only at a star point (0 Ω links
  `R_PGND` / `R_DGND` / `R_BGND`) so power-stage and RF return currents stay out
  of the bus reference.
- Bus TVS (SMBJ30A), reverse-polarity protection, polyfuse, and a fully
  reworked bus front-end (all connectivity bugs of the conversion fixed).

### To verify before fabrication

- **L2 = 100 µH output inductor — in spec, but at the edge of it.** The TPS5430
  datasheet allows 10–100 µH; with ~590 µF of bulk the control-loop crossover
  (~1.5 kHz) sits below TI's recommended 3–30 kHz window. Stable thanks to the
  tantalum/aluminium ESR, but sluggish. Do **not** swap C19/C6/C2/C4 for
  low-ESR ceramics without adding the external compensation network. A bench
  load-step / Bode measurement is recommended before a production run.
- **TVS1 clamp vs buck abs-max.** SMBJ30A clamps at ~48 V, above the TPS5430's
  36 V abs-max VIN. L3's series impedance plus the 36 V headroom cover the
  normal band; for tighter VIN protection move the clamp ahead of L3 or use a
  higher-VIN buck.

### Optional hardening

- `C_DCP1` = 22 µF in 0805: heavy DC-bias derating — consider 1206 or
  2 × 10 µF 0805.
- No dedicated BOOT button (GPIO0 is only driven by the FTDI auto-program
  circuit). A tactile to ground on GPIO0 would help if auto-program ever fails.

### Divergences from the legacy schematic capture

The routed PCB diverges from `legacy/tscircuit/index.circuit.tsx` in a few
physical aspects (real module footprint, board height, per-island placement,
**status LED moved to GPIO6**). The authoritative list lives in
[`hardware/kicad-v3/README.md`](../hardware/kicad-v3/README.md).

## Firmware — configured, pending hardware validation

[`firmware/esphome/`](../firmware/esphome/) is an ESPHome configuration built on
ESPHome's **native `abbwelcome` protocol** (in `remote_base` since 2024.4.0), so
there is no custom protocol code to maintain. Pinout: bus RX = GPIO4,
bus TX = GPIO5, status LED = GPIO6.

- Doorbell (`binary_sensor` via `on_abbwelcome`), door opener (`button` via
  `transmit_abbwelcome`), status LED, WiFi/API/OTA: **done and compiling**.
- **Pending on real hardware**: confirm RX/TX logic polarity (the front-end
  has a Schmitt inverter and an open-drain TX stage — may need `inverted: true`),
  and discover the installation's bus addresses and door-opener secret from the
  logs. See [`TODO.md`](TODO.md) and [`protocol.md`](protocol.md).

## Documentation

- [`user-guide.md`](user-guide.md): wiring, first flash and Home Assistant
  setup (sections that depend on the protocol implementation are marked as
  pending).

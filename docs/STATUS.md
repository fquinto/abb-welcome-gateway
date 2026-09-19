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

- **L2 = 100 µH output inductor — in spec, at the top of the range, modelled
  stable.** The TPS5430 datasheet allows 10–100 µH. A loop model calibrated to
  TI's own worked example (see [`hardware/kicad-v3/analysis/`](../hardware/kicad-v3/analysis/))
  puts the crossover at **~3.2 kHz** (bottom edge of TI's 3–30 kHz window) with
  **~70° phase margin** — the aluminium electrolytic ESR zero lifts the crossover
  above the LC-only estimate. Stable across the plausible ESR range (48–106°) and
  load. Do **not** swap C19/C6/C2/C4 for low-ESR ceramics: the model shows phase
  margin collapsing to ~19° (ringy) without the ESR zero. A bench load-step /
  Bode measurement is still recommended before a production run to confirm the
  crossover against the real electrolytic ESR.
- **TVS1 clamp vs buck abs-max.** SMBJ30A clamps at ~48 V at full surge, above
  the TPS5430's 36 V abs-max VIN. Analysis ([`analysis/tvs_clamp.py`](../hardware/kicad-v3/analysis/tvs_clamp.py))
  shows the buck VIN only exceeds 36 V once the TVS conducts **> ~2.2 A**; L3 +
  input caps cover fast transients, leaving a slow high-current overvoltage as
  the residual gap (low probability on a 28 V bus). For tighter protection move
  the clamp to the buck VIN node (after L3) or use a higher-VIN buck.

### Optional hardening

- `C_DCP1` = 22 µF in 0805: heavy DC-bias derating — consider 1206 or
  2 × 10 µF 0805.
- No dedicated BOOT button (GPIO0 is only driven by the FTDI auto-program
  circuit). A tactile to ground on GPIO0 would help if auto-program ever fails.

### BOM parts made explicit (raised in the first fab quote — resolved)

Two designators carried generic placeholders from the tscircuit → KiCad
conversion. The exact orderable parts are now set in the symbol/footprint, BOM
and pos files, and the fab house confirmed both in the updated quote
(2026-09-04, "It's updated, pls confirm."):

- **P2 — 6-pin serial/programming header.** Exported with a generic `chip`
  footprint and empty value, but the copper is a real **1×6 through-hole header,
  2.54 mm pitch** (drill 1.3 mm) with the FTDI pinout GND / RTS / V3V3_ESP / RX /
  TX / DTR. Assembled as a **1×6 2.54 mm straight male pin header**,
  **Würth 61300611121** — footprint/value now `PinHeader_1x06_2.54mm` /
  `61300611121` so it no longer exports blank.
- **U3 — 74LVC1G14 full part number.** The PCB footprint is 5-pad SMD at 0.95 mm
  pitch, i.e. **SOT-23-5**, so the orderable part is **SN74LVC1G14DBVR**
  (SOT-23-5), *not* the SC-70/SOT-353 `DCK`/`GW` variant (0.65 mm pitch, wrong
  footprint). Full MPN now set in the BOM field.

For the passives left with a blank LCSC, the fab picked equivalent 0603/0805
basic parts on its own (no confirmation needed) — including higher-voltage caps
for `C_DCP1/2/3`/`C_U3` and an hFE-graded `S8050 J3Y` for `Q1–Q3`.

### First-article assembly review (5 units, 2026-09)

The fab assembled 5 units (SMD soldered, THT `P1`/`P2` tacked then trimmed on
ship) and asked us to confirm polarised parts, flagging the two electrolytic
cans `C19` and `C23`:

- **`C19`** (470 µF/16 V, RVT, buck 3V3 output) — measured OK, correct
  orientation. `+` = `V3V3`, `−` = `PGND`.
- **`C23`** (100 µF/50 V, VEJ, ~28 V bus rail) — the fab could not measure its
  polarity because **it has no continuity to the bus terminal `P1` by design**:
  `C23` sits on the *rectified/protected* rail, downstream of the input
  rectifier, fuse `F2` and TVS `SMBJ30A`. Marked for them by adjacency —
  `+` (`BUS_PWR`) = pad toward `F2`/`SMBJ30A`/`P1`; `−` (`BUS_GND`) = pad toward
  the `R_PGND`/`R_DGND`/`R_BGND` star-point resistors.

Root cause of the ambiguity: the `C19`/`C23` footprints (from the tscircuit →
KiCad conversion) carry **no silkscreen polarity mark**. Fix for **v3.1**: add a
`+` silk indicator next to the positive pad of `C19`/`C23` (and the polarised
tantalums), so orientation no longer depends on measurement.

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

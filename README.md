# abb-welcome-gateway

ESP32 gateway for **ABB-Welcome / Busch-Welcome** 2-wire intercoms. Provides doorbell notifications and remote door control via Home Assistant. Includes PCB design and firmware.

The board taps the doorbell bus, isolates and filters it, and level-translates TX/RX between the bus and the host (FTDI/UART or on-board ESP32).

## Project goal

The original v2 design is the EasyEDA hardware in `hardware/easyeda-v2/` (derived from work by `mat931`, CERN-OHL-W v2). **This repo's goal is to evolve that initial design** — fixing EOL parts, hardening the bus front-end and improving signal integrity — and converge on a single, fabrication-ready source.

The **final product is `output/index.circuit.tsx`** — a tscircuit (React/TSX) description of the improved board, from which Gerbers / BOM / PnP and 3D models are exported via the `tsci` CLI.

## What's improved over the original

The current `output/index.circuit.tsx` revision incorporates:

- **ESP32-S3-WROOM-1** module in place of the EOL **ESP32-SOLO-1**.
- **74LVC1G14 Schmitt buffer** isolating the doorbell bus from the ESP32 GPIO (clean, hysteretic digital edge instead of analog RX into the MCU).
- **Ferrite bead + local decoupling** on the 3V3 rail at the module pads — buck output `V3V3` is split from the module-local rail `V3V3_ESP` to keep switching noise out of the radio.
- **Solder-jumper-selectable 120 Ω bus termination resistor**, so the same board can be deployed mid-bus or as an end-of-line node.
- **Three separated ground islands** (`PGND` / `DGND` / `BUS_GND`) stitched at a **single star point through three 0 Ω resistors** (`R_PGND`, `R_DGND`, `R_BGND`). The router treats them as separate nets so power-stage and RF-burst return currents stay out of the sensitive bus reference.
- **Per-chip wrappers** under `output/imports/*.tsx` (`ESP32_S3_WROOM_1`, `TPS5430`, `MOSFET_2N7002`, `BJT_S8050`, plus the legacy `ESP32_SOLO_1` kept for diffability).
- Explicit, documented **net naming policy** (`V3V3`, `V3V3_ESP`, `PGND`, `DGND`, `BUS_GND`, `BUS_RX_A`, `BUS_RX_DIG`, …) so additions stay consistent.

The header comment of `output/index.circuit.tsx` is the authoritative changelog for the design — keep it in sync when adding new features.

## Status & known issues

`output/index.circuit.tsx` is the **v3.0 revision**. All the connectivity bugs inherited from the EasyEDA → tscircuit conversion have been fixed (TX driver chain, TPS5430 feedback divider, bootstrap cap, reverse-polarity D2, input filter C7), the `net.unnamed_*` placeholders are renamed, a bus TVS and per-chip U3 decoupling were added, and the three star-stitched GND islands are in place. `tsc --noEmit` passes. What remains before fabrication:

### To verify / fix before fabrication

- **TVS1 standoff is too low for the bus.** The ABB-Welcome / Busch-Welcome 2-wire bus runs at **28 V ±2 V** (the system controller supplies 28 VDC), i.e. up to ~30 V at idle. `TVS1 = SMBJ24CA` has a 24 V standoff / 26.7 V min breakdown, so it would conduct continuously on a healthy bus, overheat, and eventually trip F2. Pick a standoff above the max bus voltage — **SMBJ30A** is the natural choice. TVS1 sits on `BUS_PWR`, *after* the reverse-polarity diode D2, so the rail is fixed-polarity DC and a **unidirectional** part (the `…A` suffix) is correct and clamps lower than the bidirectional `…CA`. Tradeoff to be aware of: a 30 V-standoff SMBJ clamps at ~48 V, which is above the TPS5430's 36 V abs-max VIN — so the TVS guards against large surges while L3's series impedance plus the buck's own 36 V headroom cover the 30–36 V band. If tighter VIN protection is needed, move the clamp ahead of L3 or use a higher-VIN buck.
- **`circuit-json` / `tscircuit` pinned to `"latest"`** in `output/package.json` (and `latest` in the imports). Pin to specific versions before sending Gerbers so builds are reproducible (Gerbers/BOM must be deterministic).
- **L2 = 100 µH output inductor** is high for a 500 kHz TPS5430 (the datasheet suggests ~10–22 µH). Inherited from the original design and presumably field-proven, but with the ~590 µF of bulk on `V3V3` the loop crossover is very low (sluggish transient response). Re-check against the datasheet if load-step response matters for the Wi-Fi current bursts.

### Optional hardening

- **C_DCP1 = 22 µF in 0805** — DC-bias derating on a small 22 µF / 6.3 V part is heavy. Consider 1206 at a higher voltage rating, or 2 × 10 µF 0805 in parallel.
- **No dedicated ESP32 BOOT button.** GPIO0 is only driven by Q3 (FTDI auto-program). A `BOOT` tactile to ground on GPIO0 helps when the auto-program sequence ever fails.

### Fixed in v3.0 (was flagged in v2.x)

- **RX front-end overvoltage** — the 74LVC1G14 Schmitt input and Q1's collector now sit on `BUS_RX_DET` (a clean 0–3.3 V node pulled up to `V3V3_ESP` by R2), no longer on the ~bus-voltage `BUS_RX_A`. This keeps the logic input within its VCC+0.5 V abs-max; previously it was tied through D4 to the bus.
- **TX driver / feedback divider / bootstrap / D2 / C7** all wired into real nets (were dangling `net.unnamed_*` islands).
- **R_TERM removed** — the DC-coupled 120 Ω across the bus rails would have burned (~4.8 W in a 0603); ABB-Welcome is a short-stub bus that doesn't need it.
- **F2 polyfuse** modelled as `<fuse>` (was an invalid `<chip currentRating>` that broke `tsc`).
- **SW1 silk** corrected to "RST" (it grounds EN, not GPIO0).

### Process improvements

- **Add a connectivity sanity-check to `tools/`.** A small script that walks `circuit.json` (or `index.circuit.tsx`) and lists any net appearing in only one `connections` block would have caught every original dangling-net bug automatically. Could live as `tools/check-dangling-nets.mjs` under `npm run validate`.
- **Add `tsc --noEmit` to a CI step** (GitHub Actions on push to `main`) so type errors in the imports/index can't sneak in.
- **Snapshot the schematic + PCB SVG on each PR** (`tsci snapshot`) so reviewers can diff visuals, not just JSON/TSX.
- **Per-chip `schPinArrangement`** in `output/imports/*.tsx` (especially `ESP32_S3_WROOM_1`) so the auto-generated schematic is readable when reviewing.

## Repo layout

```
.
├─ hardware/easyeda-v2/                  original v2 EasyEDA source + exports
│   ├─ Bus_Interface_..._Schematic.json  EasyEDA schematic (original v2 source)
│   ├─ PCB_..._<date>.json               EasyEDA PCB layout
│   ├─ BOM.csv, Schematic.net/.svg       EasyEDA sidecar exports
│   └─ circuit.json                      intermediate (output of tools/convert.mjs)
│
├─ tools/                               EasyEDA → circuit-json → tscircuit pipeline
│   ├─ convert.mjs                      orchestrator (root JSONs → circuit.json)
│   ├─ generate-project.mjs             scaffolds output/ from circuit.json
│   ├─ generate-tsx.mjs                 emits output/index.circuit.tsx
│   ├─ generate-import.mjs              scaffolds one output/imports/<Chip>.tsx
│   ├─ validate.mjs, render*.mjs        QA + SVG/PNG previews
│   └─ lib/                              parsers, footprint maps, traces, …
│
├─ output/                              tscircuit project — **the target design**
│   ├─ index.circuit.tsx                the board (hand-edited)
│   ├─ imports/*.tsx                    per-chip wrappers
│   └─ package.json, tscircuit.config.json, tsconfig.json
│
├─ samples/                             reference tscircuit projects (li-charger, …)
└─ prompt_ia_helper.md                  tscircuit primer / cheat-sheet
```

## Working with the design

### Editing the board

`output/index.circuit.tsx` is **hand-edited on top of** the generator's scaffolding. Treat `tools/` as a one-shot bootstrapper, not a round-trip — do not regenerate over manual edits without diffing first.

```bash
cd output
npm install
npx tsci dev          # live preview (schematic + PCB + 3D)
npx tsci build        # static build
npx tsci snapshot     # update PCB/schematic snapshots
npx tsc --noEmit      # type-check
```

### Regenerating from EasyEDA

When the EasyEDA source changes (or to refresh `circuit.json`):

```bash
cd tools
npm install
npm run convert       # writes hardware/easyeda-v2/circuit.json
npm run validate      # sanity-checks the output
```

To add a new chip wrapper, register its pinout in `tools/lib/chip-pinouts.mjs`, then:

```bash
node tools/generate-import.mjs <ComponentName> <LCSC> <ManufacturerPartNumber>
```

### Editing the EasyEDA source directly

Open the `hardware/easyeda-v2/*.json` files in EasyEDA (web or Pro). Don't hand-edit the JSON unless making a very targeted change — the format is positional and easy to corrupt. Gerbers / BOM / PnP for the legacy v2 design are exported from inside EasyEDA.

## Credits & license

Original v2 hardware credited to **mat931**. The design (and this fork) is released under **CERN-OHL-W v2**, as recorded in the schematic title block. See `LICENSE` for the full text.

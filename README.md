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

`output/index.circuit.tsx` is **work in progress, not fabrication-ready yet**. A walk through the netlist surfaced several connectivity bugs (mostly inherited from the EasyEDA → tscircuit conversion, which left a fan of `net.unnamed_*` placeholders) plus some hardening to do. The list below tracks what to fix before sending to fab, grouped by severity.

### Must-fix before fabrication (real bugs)

These are connectivity errors — components present in the schematic but not wired into a functional loop. They are easy to spot because the offending nets appear in only one `connections={…}` block in the whole file.

- **TX driver chain is fully disconnected.** R12 / R13 / R14 / R15 (820 Ω, 2512, intended as the bus TX drivers), MOSFETs Q4 / Q5, and series resistor R7 form an island of `net.unnamed_2 / _18 / _19 / _11 / _64` nodes plus `net.Q4_1 / Q4_3 / D2_2 / BUS_TX` that **never connect to anything else**. Concretely:
  - `Q4_1` ties Q4 and Q5 gates together but has no driver (the ESP32's `BUS_TX_PIN` reaches R7 and then dies on `unnamed_11`).
  - Q4 drain (`Q4_3`), Q5 drain (`D2_2`) and D5 cathode (`BUS_TX`) are all single-occurrence nets.
  - The four 820 Ω resistors form an isolated R12/R14/R15 ↔ R13 mesh.
  → As wired, the device **cannot transmit on the bus**. The TX topology needs to be re-derived from the original EasyEDA schematic and all `unnamed_*` nodes renamed to meaningful names (`TX_DRIVE_HI`, `TX_DRIVE_LO`, `BUS_TX_DRAIN`, …).
- **TPS5430 feedback divider is broken.** U1.VSENSE = `U1_4`; R19 sits between `unnamed_24` and `U1_4`; R18 sits between `PGND` and `unnamed_24`. There is **no resistor from `V3V3` to `U1_4`** — the top leg of the divider is missing. The buck will not regulate to the intended 3.3 V (VSENSE just sees PGND through R18+R19).
- **TPS5430 EN is floating** on `net.unnamed_31` (single occurrence). The part has a weak internal pull-up so it may still start, but EN must be tied to VIN through a pull-up (or directly) for a reliable cold-start.
- **TPS5430 bootstrap cap is on the wrong pin.** C1 (10 nF) is wired BOOT ↔ `U1_1` (= U1.NC). The TPS5430DDA bootstrap cap belongs between **BOOT (pin 1) and PH (pin 6/7)**, not NC. As wired, the high-side gate drive has no boot capacitor; the part may not switch reliably.
- **R7 (75 Ω, series in TX path) one terminal dangling** on `unnamed_11`.
- **C7 (2.2 µF, 1206, intended buck input/output filter) one terminal dangling** on `unnamed_27`. C7 is essentially a no-op until it's tied to a real rail (most likely `BUS_PWR`, matching C8 next to it).
- **D2 (SS24 schottky, snubber/protection) one terminal dangling** on `unnamed_12`. The other side is on `L3 → BUS_PWR` but the anode goes nowhere, so the diode is electrically a single-pin component.
- **R_TERM (120 Ω, 0603) is wired straight across `BUS_PWR` ↔ `BUS_GND`** through the solder jumper. The ABB-Welcome bus carries DC power and AC signal on the same pair, so:
  - At a ~24 V bus voltage, when the jumper is closed R_TERM continuously dissipates `24² / 120 ≈ 4.8 W` — a 0603 is rated for ~0.1 W; **it will burn**.
  - A real bus termination must be **AC-coupled** (R_TERM in series with a DC-blocking cap, e.g. 10–100 nF). Either add the series cap, or repurpose this as something else, or remove it. Whatever the choice, R_TERM should also move to ≥ 0805 with a sensible power rating once the topology is fixed.
- **SW1 silkscreen says "BOOT" but the circuit is a RESET button.** SW1 grounds the EN node (via R11 150 Ω), not GPIO0. Either relabel the silk to "RST" or rewire SW1 to GPIO0 (`net.D0`) and add a real RESET button on EN if both are wanted.

### Likely-fix / hardening

- **No decoupling on U3 (74LVC1G14).** Add a 100 nF 0603 between U3.VCC (`V3V3_ESP`) and U3.GND (`DGND`), placed within a few mm of pin 5.
- **No TVS on the bus input.** Schottkies D6/D7 protect against reverse polarity but not surges. Add a TVS (e.g. SMBJ24CA, or PESDxL2BT for low-cap) across `BUS_PWR` / `BUS_GND` before the bulk cap C23.
- **`circuit-json` and `tscircuit` pinned to `"latest"`** in `output/package.json`. Pin to specific versions for reproducible builds (Gerbers/BOM must be deterministic).
- **Silkscreen reads `v2.1`** while this is meant to be the improved revision. Bump to `v3.0` (or whatever the next fab tag is) once the bugs above are fixed.
- **LED3 cathode is pulled to `BUS_GND` via Q6,** not `DGND` like the other LEDs. That contradicts the comment "cathodes on DGND so the Wi-Fi current doesn't blink them". Either move the LED return to `DGND` and switch with the high-side, or update the comment to document the deliberate cross-island return.
- **C_DCP1 = 22 µF in 0805.** Possible, but DC-bias derating on small 22 µF/6.3 V parts is heavy. Consider 1206 + a higher rated voltage, or 2 × 10 µF 0805 in parallel.
- **Q2 / Q3 base resistors (R8, R9 = 100 kΩ) for the DTR/RTS auto-program circuit are on the high side.** Common designs use 1 k – 10 kΩ. Verify the auto-program timing with the actual FTDI driver.
- **ESP32 BOOT button is missing.** GPIO0 is only driven by Q3 (FTDI auto-program). A dedicated `BOOT` tactile to ground for GPIO0 is useful for manual firmware uploads if the auto-program ever fails.

### Net-naming hygiene (mechanical, but the bugs above mostly hide here)

The conversion left a lot of placeholder net names that obscure what's connected to what. They should be renamed to meaningful labels, and renaming them is exactly the exercise that reveals the dangling nets above.

- All `net.unnamed_<n>` should disappear (they are: 2, 8, 11, 12, 18, 19, 22, 24, 27, 31, 64).
- Internal aliases like `Q4_1`, `Q4_3`, `D2_2`, `Q1_1`, `R3_2`, `R6_1`, `LED1_2`, `LED2_2`, `LED3_1`, `LED3_2`, `U1_1`, `U1_4`, `U1_8`, `SW1_2` should get descriptive names tied to function (e.g. `TX_GATE`, `BIAS`, `RX_LED_K`, `STAT_LED_A`, `FB_DIV`, `BOOT_CAP`, `SW_NODE`).
- The header comment claims `GND` is a "convenience alias (legacy components still bind to this)". In practice nothing binds to `net.GND` anymore except the three star-point 0 Ω resistors (R_PGND, R_DGND, R_BGND) — so `GND` is purely the star-point node now. Update the policy comment.

### Process improvements

- **Add a connectivity sanity-check to `tools/`.** A small script that walks `circuit.json` (or the emitted `index.circuit.tsx`) and lists any net that appears in only one `connections` block would have caught every must-fix bug above automatically. Could live as `tools/check-dangling-nets.mjs` and run from `npm run validate`.
- **Add `tsc --noEmit` to a CI step** (GitHub Actions on push to `main`), so type errors in the imports/index can't sneak in.
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

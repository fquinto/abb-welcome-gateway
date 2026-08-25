# Legacy — frozen design history

Everything in this folder belongs to earlier stages of the project and is **frozen**:
it is kept for reference and licensing history, but it is no longer maintained and
does not describe the current board. The live design is the KiCad project in
[`../hardware/kicad-v3/`](../hardware/kicad-v3/) and the firmware in
[`../firmware/`](../firmware/).

## Contents

| Folder | What it is |
|---|---|
| `easyeda-v2/` | The original v2 hardware design (EasyEDA JSON, BOM, netlist, SVG). Derived from work by **mat931**, licensed CERN-OHL-W v2. Open the JSON files in the EasyEDA editor (web or Pro). |
| `tools/` | A Node/JS pipeline that converted the EasyEDA JSON into `circuit-json` and scaffolded the tscircuit project. Run from inside `tools/` (`npm install`, then `npm run convert`). Paths are relative to this `legacy/` folder. |
| `tscircuit/` | The tscircuit (React/TSX) project where the v3 schematic was captured and reviewed (`index.circuit.tsx` + per-chip wrappers). This was the design source of truth until the export to KiCad; the routed PCB has since diverged (see `../hardware/kicad-v3/README.md` for the list of physical divergences). |
| `samples/` | Reference tscircuit projects and sample JSONs used while developing the converter. |
| `tscircuit-primer.md` | A quick tscircuit syntax primer used while hand-editing `tscircuit/index.circuit.tsx`. |

## Why it is kept

- The EasyEDA v2 files are the upstream design this project derives from
  (CERN-OHL-W v2 requires making the source available).
- The tscircuit project documents every schematic-level decision of v3.0 and its
  design-review history.
- The converter tools may be useful to anyone doing a similar EasyEDA → tscircuit
  migration.

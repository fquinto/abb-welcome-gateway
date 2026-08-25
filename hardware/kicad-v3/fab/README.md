# Fabrication outputs

Generated from `abb-welcome-gateway-v3.kicad_pcb` with `kicad-cli` (KiCad 9).
Regenerate with the commands at the bottom after any board change.

## Files

| File | Purpose |
|---|---|
| `abb-welcome-gateway-v3-gerbers.zip` | Gerbers (RS-274X) + Excellon drill — upload this to the fab house. |
| `gerbers/` | The individual layers, unzipped. |
| `abb-welcome-gateway-v3-BOM.csv` | Bill of materials (grouped). |
| `abb-welcome-gateway-v3-pos.csv` | Pick-and-place / centroid (both sides, drill-file origin). |

## Board parameters

- **Layers**: 2 (signal + poured grounds).
- **Size**: 45.4 × 56.4 mm.
- **Min track / clearance**: 0.2 mm. **Min via**: 0.6 mm / 0.3 mm drill.
- **Copper**: 1 oz suggested. Finish HASL or ENIG (ENIG preferred for the
  fine-pitch module and the QFN-style TPS5430 thermal pad).
- All components are on the **top** side; the bottom is ground pours only.

## BOM notes

- The `LCSC` column carries the part numbers defined in the design. Entries left
  blank are **generic passives** (0603 resistors/capacitors, the ferrite bead,
  the FTDI header) — assign an LCSC basic part by value + package in the
  assembly tool. They are intentionally not guessed here to avoid fitting the
  wrong part.
- **Through-hole parts** (`P1` screw terminal, `P2` FTDI header) are not covered
  by standard SMT assembly — hand-solder them or request THT assembly.
- Three tooling/mounting holes are NPTH (no BOM line).

## Regenerating

```bash
cd hardware/kicad-v3
PCB=abb-welcome-gateway-v3.kicad_pcb

kicad-cli pcb export gerbers --output fab/gerbers/ \
  --layers "F.Cu,B.Cu,F.Paste,B.Paste,F.SilkS,B.SilkS,F.Mask,B.Mask,Edge.Cuts" \
  --no-protel-ext "$PCB"
kicad-cli pcb export drill --output fab/gerbers/ --format excellon \
  --drill-origin absolute --excellon-units mm --generate-map --map-format gerberx2 "$PCB"
kicad-cli pcb export pos --output fab/abb-welcome-gateway-v3-pos.csv \
  --format csv --units mm --side both --use-drill-file-origin "$PCB"
( cd fab && zip -j abb-welcome-gateway-v3-gerbers.zip gerbers/*.gbr gerbers/*.drl gerbers/*.gbrjob )
```

The BOM is built by `tools`-free script logic (see the project history); for a
quick refresh from the schematic instead:
`kicad-cli sch export bom --group-by Value --output fab/BOM.csv abb-welcome-gateway-v3.kicad_sch`.

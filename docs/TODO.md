# Pending tasks

Grouped roadmap towards a fabricated board running in Home Assistant.
See [STATUS.md](STATUS.md) for the current state of each area.

## Hardware (before ordering boards)

- [ ] Final visual review of the routed board in KiCad (silkscreen reference
      positions are still rough in places).
- [ ] Decide on the L2 / control-loop question: keep 100 µH (field-proven) or
      move to the datasheet recipe (~15 µH + 100–220 µF). If keeping 100 µH,
      plan a bench load-step measurement on the first prototype.
- [ ] Optional: upsize `C_DCP1` (22 µF 0805 → 1206 or 2 × 10 µF).
- [ ] Export fabrication outputs from KiCad: Gerbers + drill, BOM (with LCSC
      part numbers), and pick-and-place. Add them under `hardware/kicad-v3/fab/`.
- [ ] Order prototypes (JLCPCB/PCBWay, 2-layer, 1 oz).

## Firmware

- [ ] **Bus protocol**: study the timing/framing of the ABB-Welcome 2-wire bus
      (reference: the original mat931 firmware and bus captures) and document it
      in `docs/protocol.md`.
- [ ] Implement RX decode in the `abb_welcome` component (edge capture on
      GPIO4 → frame parser → events).
- [ ] Implement TX (door-open command) on GPIO5, including the address/config
      needed to target the right door station.
- [ ] Map events to entities: doorbell `binary_sensor`, door-open
      `button`/`lock`, diagnostic sensors (bus activity, last frame).
- [ ] Status LED behaviour on GPIO6 (boot / connected / bus activity).
- [ ] Test on real hardware against an ABB-Welcome installation.

## Validation (first prototype)

- [ ] Bring-up checklist: 3V3 rail, buck ripple, ESP32 boots, FTDI
      auto-program works.
- [ ] Buck load-step / thermal check under WiFi TX bursts.
- [ ] Bus capture session (logic analyzer on `BUS_RX_DIG`) to validate the
      front-end and the protocol implementation.

## Documentation

- [ ] Complete `docs/user-guide.md` once the protocol works end to end
      (photos of a real installation, HA screenshots).
- [ ] `docs/protocol.md` with the reverse-engineered bus protocol notes.
- [ ] Enclosure / mounting notes (DIN rail or wall box?).

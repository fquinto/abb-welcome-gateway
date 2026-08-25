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
- [x] Export fabrication outputs from KiCad: Gerbers + drill, BOM and
      pick-and-place under `hardware/kicad-v3/fab/`.
- [ ] Fill the LCSC column for the generic passives / header in the BOM (basic
      parts, left blank to avoid guessing — see `fab/README.md`).
- [ ] Order prototypes (JLCPCB/PCBWay, 2-layer, 1 oz, ENIG).

## Firmware

Protocol done: ESPHome ships the `abbwelcome` remote protocol natively, so the
config uses it directly (documented in `docs/protocol.md`). Remaining work is
hardware-dependent:

- [ ] **Confirm logic polarity on the board**: the RX front-end ends in a
      Schmitt inverter (74LVC1G14) and TX is open-drain, so `remote_receiver` /
      `remote_transmitter` may need `inverted: true`. Verify with a real frame.
- [ ] **Discover addresses**: run with `dump: [abbwelcome]`, use the intercom,
      read source/destination addresses from the logs and set them in the YAML
      `substitutions`.
- [ ] **Door-opener secret**: capture a real door-open frame (or trial) and put
      its `data` bytes into the `transmit_abbwelcome` action.
- [ ] Optional entities: a `lock` instead of a plain button, diagnostic sensors
      (last message type, bus activity), 3-byte-address systems.
- [ ] End-to-end test against a real ABB-Welcome / Busch-Welcome installation.

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

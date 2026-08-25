# Firmware (ESPHome)

- `abb-welcome-gateway.yaml` — device configuration. Copy
  `secrets.yaml.example` to `secrets.yaml`, fill in your credentials, edit the
  `substitutions` (bus addresses) and the door-open `data` payload for your
  installation, then run `esphome run abb-welcome-gateway.yaml`.

## How it works

The ABB-Welcome / Busch-Welcome protocol is implemented natively by ESPHome
(the `abbwelcome` remote protocol in `remote_base`, since 2024.4.0), so this
project needs **no custom protocol code**:

- `remote_receiver` on GPIO4 with `dump: [abbwelcome]` decodes bus frames; the
  `on_abbwelcome` automation fires the doorbell `binary_sensor` on a call.
- `remote_transmitter` on GPIO5 sends the door-open frame via
  `remote_transmitter.transmit_abbwelcome`.
- The status LED (GPIO6) is driven by ESPHome's `status_led` component.

See [`../../docs/protocol.md`](../../docs/protocol.md) for the protocol and
[`../../docs/user-guide.md`](../../docs/user-guide.md) for discovering your
addresses and the door-opener secret.

## To confirm on hardware

The RX front-end ends in a Schmitt inverter (74LVC1G14) and TX is open-drain,
so the net logic polarity is not certain from the schematic. If frames don't
decode or the door doesn't open, try `inverted: true` on the receiver and/or
transmitter pin. Tracked in [`../../docs/TODO.md`](../../docs/TODO.md).

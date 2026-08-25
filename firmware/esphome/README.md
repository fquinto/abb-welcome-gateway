# Firmware (ESPHome)

- `abb-welcome-gateway.yaml` — device configuration. Copy
  `secrets.yaml.example` to `secrets.yaml`, fill in your credentials and run
  `esphome run abb-welcome-gateway.yaml`.
- `components/abb_welcome/` — external component implementing the
  ABB-Welcome / Busch-Welcome 2-wire bus:
  - hub (`abb_welcome:`): owns the bus pins and the RX edge capture.
  - `binary_sensor` platform: doorbell events.
  - `button` platform: door opener.

**Status**: skeleton. The RX ISR + edge buffer and the Home Assistant entities
are wired up; the bus protocol decoder/encoder is in development
(see `../../docs/TODO.md`). The `binary_sensor` will not trigger and the
button logs a warning until the protocol lands.

The status LED (GPIO6) is handled by ESPHome's `status_led` component.

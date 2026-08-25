# User guide

How to install the ABB-Welcome gateway, flash it and integrate it with
Home Assistant.

> **Project status**: the hardware is finished at design level (not yet
> fabricated) and the firmware's bus protocol is still in development. Sections
> that depend on those steps are marked **[pending]**. See
> [STATUS.md](STATUS.md).

## 1. What it does

The gateway taps the 2-wire bus of an **ABB-Welcome / Busch-Welcome** door
intercom installation and exposes it to Home Assistant over WiFi (ESPHome):

- Notification when someone rings the doorbell.
- Remotely open the door from Home Assistant.
- Diagnostics (bus activity, device status).

It is powered directly from the intercom bus (~28 V) through an on-board buck
converter — no external supply needed.

## 2. Safety and compatibility

- The intercom bus carries roughly **28 V DC with data superimposed**. It is
  SELV, but treat it with care: disconnect the intercom power supply before
  wiring.
- Designed for 2-wire ABB-Welcome / Busch-Welcome installations. Other
  intercom families (TCS, Ritto, …) use different protocols and are **not**
  supported.
- The board connects **in parallel** with the existing indoor station wiring;
  it does not replace any component of the installation.

## 3. Connections

| Connector | Purpose |
|---|---|
| `P1` (screw terminal) | Intercom bus. `+` and `−` are marked on the silkscreen. The front-end tolerates brief reverse polarity, but connect it right: measure ~28 V DC between the wires and connect the positive one to `+`. |
| `P2` (6-pin header) | FTDI-style serial for the **first** flash: `GND · RTS · 3V3 · RX · TX · DTR`. Use a 3.3 V USB-serial adapter with RTS/DTR (auto-program supported). After the first flash, updates go over WiFi (OTA). |
| `RST` button | ESP32 reset. |

### LEDs

| LED | Meaning |
|---|---|
| `PWR` | 3V3 rail up. |
| `TX` | Gateway transmitting on the bus. |
| `RX` | Bus activity received. |
| `STAT` | Firmware status (GPIO6): **[pending]** blink codes will be documented with the firmware. |

## 4. First flash

1. Install [ESPHome](https://esphome.io) (`pip install esphome`).
2. Clone this repository and enter `firmware/esphome/`.
3. Copy `secrets.yaml.example` to `secrets.yaml` and fill in your WiFi
   credentials.
4. Connect the FTDI adapter to `P2` (do **not** connect the bus at the same
   time as the FTDI 3V3 — power the board from one source only).
5. Flash: `esphome run abb-welcome-gateway.yaml`.

After the first flash the device shows up in ESPHome/Home Assistant and can be
updated over the air.

## 5. Configure your installation

The protocol is handled by ESPHome natively, but the bus **addresses** and the
**door-opener secret** are specific to your installation. Find them once:

1. Flash the default config and open the logs (`esphome logs
   abb-welcome-gateway.yaml`). The `dump: [abbwelcome]` line prints every bus
   frame.
2. Ring the doorbell and open the door from an existing indoor station. Note the
   `source_address`, `destination_address`, `message_type` and `data` of the
   frames you see.
3. Edit `abb-welcome-gateway.yaml`: set the `substitutions` (indoor / outdoor /
   door-lock addresses) and the door-open `data` bytes in the
   `transmit_abbwelcome` action. Set `three_byte_address: "true"` if your
   addresses are 6 hex digits.
4. Re-flash (OTA is fine after the first flash).

See [protocol.md](protocol.md) for the message types and address conventions.

## 6. Home Assistant integration

With the ESPHome integration enabled, Home Assistant auto-discovers the device
and creates:

- `binary_sensor.doorbell` — pulses when the outdoor station calls.
- `button.open_door` — sends the door-open command.

Example automation (notification on ring):

```yaml
automation:
  - alias: "Doorbell notification"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    action:
      - service: notify.mobile_app_your_phone
        data:
          message: "Someone is at the door"
```

## 7. Installation on the bus

**[pending: photos of a real installation]**

1. Power down the intercom system.
2. Open the indoor station (or a junction box on the bus) and connect the two
   bus wires to `P1` respecting polarity.
3. Mount the board in a dry location away from mains wiring; keep the ESP32
   antenna edge clear of large metal surfaces.
4. Power the system back up: the `PWR` LED lights, and after a few seconds the
   device joins WiFi.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| No `PWR` LED | Bus voltage present at `P1`? Polyfuse `F2` may have tripped after a fault — it self-resets when power is removed. |
| Device not on WiFi | Serial logs via `P2` (`esphome logs`), check `secrets.yaml` credentials, antenna clearance. |
| No doorbell events | Check the `RX` LED blinks when the intercom is used (front-end OK). Then check the logs decode frames: if `dump: [abbwelcome]` shows nothing, try `inverted: true` on the receiver pin; if it shows frames, set the right addresses (section 5). |
| Door won't open | Confirm the door-open `data` bytes captured from a real unlock, and the destination address. TX polarity may need `inverted: true` on the transmitter pin. |

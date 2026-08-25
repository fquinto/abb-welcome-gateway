# ABB-Welcome / Busch-Welcome bus protocol

Notes on the 2-wire bus protocol used by the intercom, and how this project
talks to it.

> **Key point**: ESPHome already implements this protocol natively as the
> `abbwelcome` remote-transmitter/receiver protocol (in `remote_base`, since
> ESPHome 2024.4.0, contributed by mat931). This project uses that
> implementation rather than re-decoding the waveform by hand — see
> [Firmware approach](#firmware-approach) below.

## Physical layer

- Single differential-ish 2-wire bus carrying ~28 V DC with data superimposed.
- The board taps it, filters it and produces a clean 0–3.3 V digital RX
  (`BUS_RX_DIG`, Schmitt-buffered) into the ESP32, and drives the bus with an
  open-drain transistor stage from a TX GPIO.

## Line coding (as implemented by ESPHome `abbwelcome`)

Pulse-distance style coding, MSB first, timings in microseconds:

| Symbol | Encoding |
|---|---|
| Bit period | `102 µs` (`BIT_ONE_SPACE_US`) |
| Bit `0` | mark `32 µs` (`BIT_ZERO_MARK_US`, accepted range 18–44) + space `70 µs` (`102 − 32`) |
| Bit `1` | no mark; the space is extended by another `102 µs` |
| Inter-byte gap | `210 µs` (`BYTE_SPACE_US`) |

Each byte starts with a mark; `0` bits insert a mark/space transition, `1` bits
just lengthen the preceding space. A frame begins with the sync bytes
`0x55 0xFF`.

## Frame format

Internal buffer layout (`std::array`, up to `12 + 15` bytes):

| Bytes | Field |
|---|---|
| 0–1 | Sync `0x55 0xFF` |
| 2 | Flags: retransmission bit, address-length bit (`0x40` → 3-byte addresses), data-length (`& 0x3F`, max 15) |
| 3 | Message type |
| 4… | Destination address, source address (2 or 3 bytes each), message ID, payload, checksum |

- `three_byte_address` selects 2- vs 3-byte addressing; some installations use
  6-hex-digit addresses.
- **Checksum**: XOR-accumulate over all bytes except the last, with a fixed
  bit-mixing step per byte, finalized as `(temp & 0xFE) ^ ((temp >> 8) & 1)`
  and inverted. Frames failing the checksum are rejected on RX.

## Message types

| Type | Meaning |
|---|---|
| `0x01` | Outdoor station → indoor station (call) |
| `0x11` | Indoor station message (indoor doorbell) |
| `0x0A` | Outdoor station → gateway |
| `0x0D` / `0x0E` | Door-unlock command |
| `0x81` | Reply to `0x01` |
| `0x8D` / `0x8E` | Door-opener response |
| `0x91` | Reply to `0x11` |

Types `≥ 0x80` are replies to the corresponding request.

## Addresses

Installation-specific; discover yours by watching the bus (`dump: [abbwelcome]`
in ESPHome logs while using the intercom). Typical patterns:

| Device | Address |
|---|---|
| Indoor station | `0x10XX` (or `0x0001XX` on 3-byte systems) |
| Outdoor station | `0x2001` |
| Gateway | `0x3001` |
| Door lock | `0x4001` |

The last two hex digits are the apartment number.

## Door open

The unlock command is a message (type `0x0D`) to the door-lock address carrying
a system-specific **secret data payload**. There is no universal value: capture
a real door-open event on your installation (or find it by trial), then send
the same `data` bytes. Example from a working install:
`source 0x1001 → dest 0x4001, type 0x0D, data [0xAB, 0xCD, 0xEF]`.

## Firmware approach

Because ESPHome ships the protocol, the firmware does **not** implement a custom
decoder. It uses:

- `remote_receiver` on the bus-RX GPIO with `dump: [abbwelcome]` and an
  `on_abbwelcome` trigger to react to incoming frames.
- `remote_transmitter` on the bus-TX GPIO to send the door-open frame via a
  `remote_transmitter.transmit_abbwelcome` action.

See [`firmware/esphome/abb-welcome-gateway.yaml`](../firmware/esphome/abb-welcome-gateway.yaml).

## Sources

- ESP32 Doorbell Bus Interface by mat931 —
  <https://github.com/Mat931/esp32-doorbell-bus-interface>
- ESPHome `abbwelcome` remote protocol —
  `esphome/components/remote_base/abbwelcome_protocol.{h,cpp}`
- ESPHome device page —
  <https://devices.esphome.io/devices/doorbell-interface-for-abb-welcome/>

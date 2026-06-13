// Bus Interface for ABB-Welcome v3.0 — improved tscircuit revision.
//
// Changes from v2 (the EasyEDA source):
//   • ESP32-S3-WROOM-1 module (replaces the EOL ESP32-SOLO-1).
//   • 74LVC1G14 Schmitt trigger (U3) isolating the bus from the ESP32 GPIO.
//   • Ferrite bead (FB1) + local decoupling (C_DCP1..3) on the ESP32 3V3 rail.
//   • Per-chip 100 nF decoupling on the Schmitt VCC pin (C_U3).
//   • Bidirectional TVS (TVS1, SMBJ24CA) across the bus power rail.
//   • Three GND islands (PGND / DGND / BUS_GND) joined at a single star
//     point through three 0 Ω resistors (R_PGND, R_DGND, R_BGND).
//   • R_TERM / JP_TERM removed — ABB-Welcome is a short-stub bus and the
//     previous topology would have shorted the bus rails through a 0603.
//   • All `net.unnamed_*` placeholders renamed; full net-naming policy below.
//   • Connectivity bugs left over from the EasyEDA → tscircuit conversion
//     fixed: TPS5430 VSENSE divider, BOOT cap, C7, D2 (reverse-polarity
//     protection), and the entire TX driver chain (R7 → Q4/Q5 → R12..R15 →
//     BUS_TX → D5) — all dangling nets in the previous file have a home now.
//
// Net-naming policy
//
//   Power rails:
//     V3V3        — buck output before the ferrite bead
//     V3V3_ESP    — local rail at the ESP32, after the ferrite bead
//
//   Bus power chain (hot leg, terminal → buck):
//     BUS_HOT     — raw bus hot (+) at the terminal block (P1.pin2, pre-fuse).
//                   POLARITY MATTERS: see silk markers next to P1.
//     BUS_FUSED   — post-fuse, pre-choke hot (F2.pin2 = L1.pin1)
//     BUS_HOT_F   — post-choke hot ("hot, filtered"); L1.pin4. This is where
//                   the protection diodes (D4 / D5 / D7) and the
//                   reverse-polarity Schottky D2 tap into the bus.
//     BUS_DC_RAW  — post-D2 (reverse-polarity protect), pre-L3
//     BUS_PWR     — filtered DC into U1.VIN and the bulk caps
//
//   Bus return chain (V− leg, terminal → ground reference):
//     BUS_RTN     — raw bus return (−) at the terminal block (P1.pin1 = L1.pin2)
//     BUS_GND     — post-choke V−, used as the bus-side ground reference
//
//   Bus front-end topology, for orientation:
//     P1.pin2 (+) → F2 → L1.pin1 ─[winding A]─ L1.pin4 ─┐
//                                                       ├─ D4 → BUS_RX_A
//                                                       ├─ D5 → BUS_TX
//                                                       ├─ D7.cathode (anode = BUS_GND)
//                                                       └─ D2 → L3 → BUS_PWR
//     P1.pin1 (−) → L1.pin2 ─[winding B]─ L1.pin3 (= BUS_GND)
//     D6 sits across the bus pre-choke (BUS_RTN ↔ BUS_FUSED).
//     TVS1 sits across the buck supply (BUS_PWR ↔ BUS_GND), after F2 so
//     a sustained surge that takes out the TVS still trips the polyfuse.
//
//   Ground islands (joined at one star point through R_*GND):
//     GND         — the star point itself; only R_PGND/R_DGND/R_BGND bind here
//     PGND        — power return (buck, output caps)
//     DGND        — digital return (ESP32, Schmitt, indicator LEDs)
//     BUS_GND     — bus return (terminal block, RX/TX front-end, status LED)
//
//   Bus signal nodes:
//     BUS_RX_A     — high-side analog RX node from D4 (≈ bus voltage); the top
//                    of the R1/R3 divider. MUST NOT reach a logic input.
//     BUS_RX_FILT  — junction between R1/R3/R4/C3 in the RX bias network
//     BUS_RX_BIAS  — base of Q1 (RX detector BJT)
//     BUS_RX_DET   — Q1 open-collector detector output, pulled up to V3V3_ESP
//                    by R2; this is the Schmitt INPUT (clean 0–3.3 V).
//     BUS_RX_PIN   — Schmitt OUTPUT going to ESP32 GPIO4 (inverted!)
//     BUS_TX_PIN   — ESP32 GPIO5 driving the TX chain
//     TX_GATE      — gate of Q4/Q5 (post-R7)
//     TX_DRAIN_A   — drain of Q4 (feeds R12 ∥ R13 → BUS_TX)
//     TX_DRAIN_B   — drain of Q5 (feeds R14 ∥ R15 → BUS_TX)
//     BUS_TX       — open-drain TX node onto the bus through D5
//
//   Misc internal:
//     EN          — ESP32-S3 enable (10k pullup R10, 100nF cap C5, RST btn,
//                   FTDI auto-program via Q2)
//     BOOT_STRAP  — ESP32 GPIO0 (auto-program via Q3 only; no manual button)
//     EN_DRIVE    — base of Q2 (FTDI RTS pulls EN low through Q2)
//     D0_DRIVE    — base of Q3 (FTDI DTR pulls GPIO0 low through Q3)
//     BOOT_CAP    — buck bootstrap cap node (U1.BOOT side of C1)
//     SW_NODE     — buck switch node (U1.PH = L2.pin1; other side of C1)
//     FB_TAP      — buck feedback divider tap (U1.VSENSE)
//     RST_BTN     — SW1 pin (pulled to DGND when pressed)
//     PWR_LED_A   — LED1 anode (always-on power LED through R17 → V3V3_ESP)
//     TX_LED_A    — LED2 anode (driven by BUS_TX_PIN through R20)
//     RX_LED_A    — LED3 anode (R16 → V3V3_ESP)
//     RX_LED_K    — LED3 cathode (pulled to BUS_GND through Q6 when RX is
//                   detected; this LED returns on BUS_GND, not DGND, by design)
//     STAT_LED_A  — LED4 anode (driven by LED_PIN/GPIO2 through R6)
//
// Things deliberately NOT done in this revision:
//   • U1.EN is left floating (matches v2; TPS5430 has a weak internal pullup).
//     Add a 100k pullup to BUS_PWR if cold-start ever proves flaky.
//   • SW1 is the RESET button (grounds EN through R11). Silk reads "RST".
//     No dedicated BOOT button — GPIO0 is only driven by Q3 (FTDI DTR).
//   • The wrapper imports are pinned to "latest" in package.json — pin to a
//     specific version before sending Gerbers to fab.

import { TPS5430 } from "./imports/TPS5430"
import { ESP32_S3_WROOM_1 } from "./imports/ESP32_S3_WROOM_1"
import { MOSFET_2N7002 } from "./imports/MOSFET_2N7002"
import { BJT_S8050 } from "./imports/BJT_S8050"

export default () => (
  <board pcbWidth="43.00mm" pcbHeight="53.98mm">

    {/* === FTDI programming header (P2, manual solder, not assembled) === */}
    <chip name="P2" doNotPlace pcbX="12.282mm" pcbY="11.371mm"
      footprint={(<footprint>
        <platedhole portHints={["pin1"]} pcbX="0mm" pcbY="-6.350mm" shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
        <platedhole portHints={["pin2"]} pcbX="0mm" pcbY="-3.810mm" shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
        <platedhole portHints={["pin3"]} pcbX="0mm" pcbY="-1.270mm" shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
        <platedhole portHints={["pin4"]} pcbX="0mm" pcbY="1.270mm"  shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
        <platedhole portHints={["pin5"]} pcbX="0mm" pcbY="3.810mm"  shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
        <platedhole portHints={["pin6"]} pcbX="0mm" pcbY="6.350mm"  shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
      </footprint>)}
      connections={{ pin1: "net.DGND", pin2: "net.RTS", pin3: "net.V3V3_ESP", pin4: "net.RX", pin5: "net.TX", pin6: "net.DTR" }} />

    {/* === Bus terminal block (P1, WJ500V-5.08-2P) === */}
    <chip name="P1" manufacturerPartNumber="WJ500V-5.08-2P" supplierPartNumbers={{ jlcpcb: ["C8465"] }}
      pcbX="17mm" pcbY="-3.5mm" pcbRotation={90}
      footprint={(<footprint>
        <platedhole portHints={["pin1"]} pcbX="2.540mm"  pcbY="0mm" shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
        <platedhole portHints={["pin2"]} pcbX="-2.540mm" pcbY="0mm" shape="circle" outerDiameter="1.88mm" holeDiameter="1.30mm" />
      </footprint>)}
      connections={{ pin1: "net.BUS_RTN", pin2: "net.BUS_HOT" }}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C8465.obj?uuid=d60ef5d423934d3393dc75fa0a07b6bd",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C8465.step?uuid=d60ef5d423934d3393dc75fa0a07b6bd",
        modelOriginPosition: { x: 0, y: 0, z: 0 },
      }} />

    {/* === F2 PTC polyfuse on the hot leg === */}
    <fuse name="F2" footprint="1206" manufacturerPartNumber="nSMD005" supplierPartNumbers={{ jlcpcb: ["C70064"] }}
      currentRating="0.5A" pcbX="12mm" pcbY="3mm" pcbRotation={90}
      connections={{ pin1: "net.BUS_HOT", pin2: "net.BUS_FUSED" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C70064.obj?uuid=7dbd95a5ee9a45949b72cb8147e267ff", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C70064.step?uuid=7dbd95a5ee9a45949b72cb8147e267ff" }} />

    {/* === L1 common-mode choke (ACT45B-510-2P-TL003) ===
         Winding A: pin1 ↔ pin4 (hot leg).
         Winding B: pin2 ↔ pin3 (V− leg, terminates as BUS_GND post-choke). */}
    <chip name="L1" manufacturerPartNumber="ACT45B-510-2P-TL003" supplierPartNumbers={{ jlcpcb: ["C76584"] }}
      pcbX="17.489mm" pcbY="4.259mm" pcbRotation={180}
      footprint={(<footprint>
        <smtpad portHints={["pin3"]} pcbX="2.280mm"  pcbY="-1.250mm" shape="rect" width="1.400mm" height="0.900mm" />
        <smtpad portHints={["pin4"]} pcbX="2.280mm"  pcbY="1.250mm"  shape="rect" width="1.400mm" height="0.900mm" />
        <smtpad portHints={["pin1"]} pcbX="-2.280mm" pcbY="1.250mm"  shape="rect" width="1.400mm" height="0.900mm" />
        <smtpad portHints={["pin2"]} pcbX="-2.280mm" pcbY="-1.250mm" shape="rect" width="1.400mm" height="0.900mm" />
      </footprint>)}
      connections={{ pin1: "net.BUS_FUSED", pin2: "net.BUS_RTN", pin3: "net.BUS_GND", pin4: "net.BUS_HOT_F" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C76584.obj?uuid=c7e88b864a7d4779aaa0f33dc1e3be6b", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C76584.step?uuid=c7e88b864a7d4779aaa0f33dc1e3be6b" }} />

    {/* === Bus protection / coupling schottky diodes === */}
    {/* D6 — clamps differential across the bus pre-choke (BUS_NTL → BUS_FUSED). */}
    <diode name="D6" footprint="sod323" manufacturerPartNumber="SD36C" supplierPartNumbers={{ jlcpcb: ["C502537"] }}
      variant="schottky" pcbX="16.854mm" pcbY="7.434mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_RTN", pin2: "net.BUS_FUSED" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C502537.obj?uuid=061e0bf2548b43fcbce24371d75e976d", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C502537.step?uuid=061e0bf2548b43fcbce24371d75e976d" }} />
    {/* D7 — clamps negative excursions on the post-choke hot leg to BUS_GND. */}
    <diode name="D7" footprint="sod323" manufacturerPartNumber="SD36C" supplierPartNumbers={{ jlcpcb: ["C502537"] }}
      variant="schottky" pcbX="12.663mm" pcbY="0.068mm"
      connections={{ pin1: "net.BUS_GND", pin2: "net.BUS_HOT_F" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C502537.obj?uuid=061e0bf2548b43fcbce24371d75e976d", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C502537.step?uuid=061e0bf2548b43fcbce24371d75e976d" }} />

    {/* === D2 — reverse-polarity diode between the post-choke hot leg and the
         buck-input filter. Restored from the v2 EasyEDA topology (the previous
         tscircuit revision had both terminals dangling). === */}
    <diode name="D2" footprint="sma" manufacturerPartNumber="SS24" supplierPartNumbers={{ jlcpcb: ["C7420362"] }}
      variant="schottky" pcbX="7.202mm" pcbY="-8.314mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_HOT_F", pin2: "net.BUS_DC_RAW" }} />

    {/* === TVS1 — bidirectional surge clamp across the bus power rail.
         Placed parallel to C23 / U1.VIN so transients are caught before
         they reach the buck input. After F2 so a sustained surge that takes
         out the TVS still trips the polyfuse. === */}
    <diode name="TVS1" footprint="smb" manufacturerPartNumber="SMBJ24CA" supplierPartNumbers={{ jlcpcb: ["C181370"] }}
      variant="tvs" pcbX="10mm" pcbY="-11mm" pcbRotation={90}
      connections={{ pin1: "net.BUS_PWR", pin2: "net.BUS_GND" }} />

    {/* === Bus-input bulk capacitor (C23, on BUS_PWR / BUS_GND) === */}
    <chip name="C23" manufacturerPartNumber="VEJ101M1HTR-0810" supplierPartNumbers={{ jlcpcb: ["C176665"] }}
      pcbX="15.203mm" pcbY="-17.331mm"
      footprint={(<footprint>
        <smtpad portHints={["pin1"]} pcbX="3.295mm"  pcbY="0mm" shape="rect" width="3.610mm" height="1.260mm" />
        <smtpad portHints={["pin2"]} pcbX="-3.295mm" pcbY="0mm" shape="rect" width="3.610mm" height="1.260mm" />
      </footprint>)}
      connections={{ pin1: "net.BUS_PWR", pin2: "net.BUS_GND" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C176665.obj?uuid=b102f1362be24624a1b1334fec8dc7f4", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C176665.step?uuid=b102f1362be24624a1b1334fec8dc7f4" }} />

    {/* === Buck input filter capacitors (C7, C8 across BUS_PWR / PGND) === */}
    <capacitor name="C7" footprint="1206" manufacturerPartNumber="CL31B225KBHNNNE" supplierPartNumbers={{ jlcpcb: ["C50254"] }}
      capacitance="2.2uF" pcbX="9.234mm" pcbY="-21.141mm" pcbRotation={90}
      connections={{ pin1: "net.PGND", pin2: "net.BUS_PWR" }} />
    <capacitor name="C8" footprint="1206" manufacturerPartNumber="CL31B225KBHNNNE" supplierPartNumbers={{ jlcpcb: ["C50254"] }}
      capacitance="2.2uF" pcbX="6.440mm" pcbY="-21.141mm" pcbRotation={90}
      connections={{ pin1: "net.PGND", pin2: "net.BUS_PWR" }} />

    {/* === L3 — series inductor between the protection diode D2 and BUS_PWR. */}
    <chip name="L3" manufacturerPartNumber="SMMS0650-101M" supplierPartNumbers={{ jlcpcb: ["C2894722"] }}
      pcbX="5.805mm" pcbY="-14.156mm"
      footprint={(<footprint>
        <smtpad portHints={["pin1"]} pcbX="-2.913mm" pcbY="0mm" shape="rect" width="2.150mm" height="3.320mm" />
        <smtpad portHints={["pin2"]} pcbX="2.913mm"  pcbY="0mm" shape="rect" width="2.150mm" height="3.320mm" />
      </footprint>)}
      connections={{ pin1: "net.BUS_DC_RAW", pin2: "net.BUS_PWR" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2894722.obj?uuid=0b2f3a6975f24ed8b415db8419764f7a", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2894722.step?uuid=0b2f3a6975f24ed8b415db8419764f7a" }} />

    {/* ============================================================
         BUS RX front-end (analog) — all on BUS_GND
         BUS_HOT_F → D4 → BUS_RX_A → (R1 100k, C3 68n) → BUS_RX_FILT
                                          ↓
                                       R3 10k ↑ BUS_GND
                                          ↓
                                       R4 1k → BUS_RX_BIAS → Q1.B (S8050)
         BUS_GND → Q1.E.  Q1.C → BUS_RX_DET (open-collector detector output,
         pulled up to V3V3_ESP by R2). D3 clamps Q1.B reverse to BUS_GND.
         The 74LVC1G14 Schmitt (U3) reads BUS_RX_DET and outputs BUS_RX_PIN
         to the ESP32 GPIO4 (note: Schmitt is INVERTED).
         BUS_RX_A is the high-voltage (~bus) node and must NOT reach U3:
         keeping the Schmitt on BUS_RX_DET (not BUS_RX_A) is what keeps the
         74LVC1G14 input inside its VCC+0.5 V abs-max.
         ============================================================ */}

    <diode name="D4" footprint="sma" manufacturerPartNumber="SS24" supplierPartNumbers={{ jlcpcb: ["C7420362"] }}
      variant="schottky" pcbX="7.202mm" pcbY="-5.266mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_HOT_F", pin2: "net.BUS_RX_A" }} />
    <diode name="D3" footprint="sma" manufacturerPartNumber="SS24" supplierPartNumbers={{ jlcpcb: ["C7420362"] }}
      variant="schottky" pcbX="-17.309mm" pcbY="-12.632mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_GND", pin2: "net.BUS_RX_BIAS" }} />

    <resistor name="R1" footprint="0603" resistance="100k" pcbX="-15.404mm" pcbY="-5.266mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_RX_A", pin2: "net.BUS_RX_FILT" }} />
    <capacitor name="C3" footprint="0603" manufacturerPartNumber="CL10B683KB8NNNC" supplierPartNumbers={{ jlcpcb: ["C31658"] }}
      capacitance="68nF" pcbX="-15.404mm" pcbY="-3.361mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_RX_A", pin2: "net.BUS_RX_FILT" }} />
    <resistor name="R3" footprint="0603" resistance="10k" pcbX="-15.404mm" pcbY="-7.425mm"
      connections={{ pin1: "net.BUS_GND", pin2: "net.BUS_RX_FILT" }} />
    <resistor name="R4" footprint="0603" resistance="1k" pcbX="-15.404mm" pcbY="-9.457mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_RX_FILT", pin2: "net.BUS_RX_BIAS" }} />

    <BJT_S8050 name="Q1" pcbX="-19.214mm" pcbY="-9.203mm"
      connections={{ B: "net.BUS_RX_BIAS", E: "net.BUS_GND", C: "net.BUS_RX_DET" }} />

    {/* R2 — 10k pullup on the Q1 open-collector detector output BUS_RX_DET
       (= the Schmitt input) to V3V3_ESP. */}
    <resistor name="R2" footprint="0603" resistance="10k" pcbX="-19.214mm" pcbY="-6.282mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_RX_DET", pin2: "net.V3V3_ESP" }} />

    {/* Q6 — pulls the RX-activity LED cathode down when the Schmitt
       output is high (driven by BUS_RX_PIN, source on BUS_GND). */}
    <MOSFET_2N7002 name="Q6" pcbX="-19.214mm" pcbY="-3.361mm"
      connections={{ G: "net.BUS_RX_PIN", S: "net.BUS_GND", D: "net.RX_LED_K" }} />

    {/* ============================================================
         BUS TX driver — restored from the v2 EasyEDA topology.
         BUS_TX_PIN → R7 (75 Ω, EMI/gate-drive limit)
                   → TX_GATE → Q4.G, Q5.G (both gates in parallel)
         Q4.S, Q5.S → BUS_GND
         Q4.D → TX_DRAIN_A → R12 ∥ R13 (820 Ω) ─┐
         Q5.D → TX_DRAIN_B → R14 ∥ R15 (820 Ω) ─┴→ BUS_TX
         BUS_TX → D5 (anode = BUS_PROT_IN) → bus

         Effective pull-down on BUS_TX ≈ 4·820 / 4 = 205 Ω.
         R5 (1k) holds BUS_TX_PIN low while the ESP32 is in high-Z.
         ============================================================ */}

    <resistor name="R7" footprint="0603" resistance="75" pcbX="-2.577mm" pcbY="-12.759mm" pcbRotation={270}
      connections={{ pin1: "net.BUS_TX_PIN", pin2: "net.TX_GATE" }} />
    <resistor name="R5"  footprint="0603" resistance="1k"  pcbX="-0.545mm"  pcbY="-12.759mm" pcbRotation={90}
      connections={{ pin1: "net.DGND", pin2: "net.BUS_TX_PIN" }} />

    <MOSFET_2N7002 name="Q4" pcbX="-10.451mm" pcbY="-12.759mm" pcbRotation={180}
      connections={{ G: "net.TX_GATE", S: "net.BUS_GND", D: "net.TX_DRAIN_A" }} />
    <MOSFET_2N7002 name="Q5" pcbX="-6.133mm" pcbY="-12.759mm" pcbRotation={180}
      connections={{ G: "net.TX_GATE", S: "net.BUS_GND", D: "net.TX_DRAIN_B" }} />

    {/* R12-R15 power resistors (820 Ω, 2512).  supplierPartNumbers pinned to
       C2999541 because tscircuit's auto-match would otherwise pick C3018406
       which is no longer in JLCPCB stock. */}
    <resistor name="R12" footprint="2512" resistance="820"
      manufacturerPartNumber="FRC2512F8200TS" supplierPartNumbers={{ jlcpcb: ["C2999541"] }}
      pcbX="-11.213mm" pcbY="-6.282mm" pcbRotation={90}
      connections={{ pin1: "net.TX_DRAIN_A", pin2: "net.BUS_TX" }} />
    <resistor name="R13" footprint="2512" resistance="820"
      manufacturerPartNumber="FRC2512F8200TS" supplierPartNumbers={{ jlcpcb: ["C2999541"] }}
      pcbX="-7.022mm"  pcbY="-6.282mm" pcbRotation={90}
      connections={{ pin1: "net.TX_DRAIN_A", pin2: "net.BUS_TX" }} />
    <resistor name="R14" footprint="2512" resistance="820"
      manufacturerPartNumber="FRC2512F8200TS" supplierPartNumbers={{ jlcpcb: ["C2999541"] }}
      pcbX="-2.831mm"  pcbY="-6.282mm" pcbRotation={90}
      connections={{ pin1: "net.TX_DRAIN_B", pin2: "net.BUS_TX" }} />
    <resistor name="R15" footprint="2512" resistance="820"
      manufacturerPartNumber="FRC2512F8200TS" supplierPartNumbers={{ jlcpcb: ["C2999541"] }}
      pcbX="1.360mm"   pcbY="-6.282mm" pcbRotation={90}
      connections={{ pin1: "net.TX_DRAIN_B", pin2: "net.BUS_TX" }} />

    {/* D5 — bus-side TX coupling diode (anode on BUS_PROT_IN, cathode on BUS_TX). */}
    <diode name="D5" footprint="sma" manufacturerPartNumber="SS24" supplierPartNumbers={{ jlcpcb: ["C7420362"] }}
      variant="schottky" pcbX="7.202mm" pcbY="-2.218mm" pcbRotation={180}
      connections={{ pin1: "net.BUS_HOT_F", pin2: "net.BUS_TX" }} />

    {/* ============================================================
         TPS5430 buck converter (U1) — 3.3 V output
         Feedback: V3V3 → R19 (5.6 k) → FB_TAP → R18 (3.3 k) → PGND
                   (ratio 1.7 against the 1.221 V V_ref → V_OUT = 3.3 V)
         Bootstrap: C1 (10 nF) between BOOT_CAP and SW_NODE.
         EN: left floating; the TPS5430 has a weak internal pullup.
         ============================================================ */}

    <TPS5430 name="U1" pcbX="0.979mm" pcbY="-23.935mm"
      connections={{
        BOOT: "net.BOOT_CAP",
        VIN: "net.BUS_PWR",
        GND: "net.PGND",
        VSENSE: "net.FB_TAP",
        PH: "net.SW_NODE",
        EPAD: "net.PGND",
      }} />

    {/* C1 — bootstrap cap (BOOT ↔ PH). */}
    <capacitor name="C1" footprint="0603" manufacturerPartNumber="0603B103K500NT" supplierPartNumbers={{ jlcpcb: ["C57112"] }}
      capacitance="10nF" pcbX="-0.418mm" pcbY="-16.188mm" pcbRotation={180}
      connections={{ pin1: "net.BOOT_CAP", pin2: "net.SW_NODE" }} />

    {/* Feedback divider — R19 (top) and R18 (bottom). */}
    <resistor name="R19" footprint="0603" resistance="5.6k" pcbX="6.440mm" pcbY="-25.332mm" pcbRotation={180}
      connections={{ pin1: "net.V3V3", pin2: "net.FB_TAP" }} />
    <resistor name="R18" footprint="0603" resistance="3.3k" pcbX="9.742mm" pcbY="-25.332mm" pcbRotation={180}
      connections={{ pin1: "net.PGND", pin2: "net.FB_TAP" }} />

    {/* D1 — buck catch diode (cathode on SW_NODE, anode on PGND). */}
    <diode name="D1" footprint="sma" manufacturerPartNumber="SS24" supplierPartNumbers={{ jlcpcb: ["C7420362"] }}
      variant="schottky" pcbX="1.106mm" pcbY="-19.236mm"
      connections={{ pin1: "net.PGND", pin2: "net.SW_NODE" }} />

    {/* Buck output filter — C2 (output cap) + L2 (output inductor). */}
    <capacitor name="C2" footprint="1206" manufacturerPartNumber="TAJA106K016RNJ" supplierPartNumbers={{ jlcpcb: ["C7171"] }}
      capacitance="10uF" pcbX="-6.006mm" pcbY="-25.205mm"
      connections={{ pin1: "net.V3V3", pin2: "net.PGND" }} />
    <chip name="L2" manufacturerPartNumber="SMMS0650-101M" supplierPartNumbers={{ jlcpcb: ["C2894722"] }}
      pcbX="-6.260mm" pcbY="-19.363mm" pcbRotation={270}
      footprint={(<footprint>
        <smtpad portHints={["pin1"]} pcbX="-2.913mm" pcbY="0mm" shape="rect" width="2.150mm" height="3.320mm" />
        <smtpad portHints={["pin2"]} pcbX="2.913mm"  pcbY="0mm" shape="rect" width="2.150mm" height="3.320mm" />
      </footprint>)}
      connections={{ pin1: "net.SW_NODE", pin2: "net.V3V3" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2894722.obj?uuid=0b2f3a6975f24ed8b415db8419764f7a", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2894722.step?uuid=0b2f3a6975f24ed8b415db8419764f7a" }} />

    {/* V3V3 bulk capacitance (after the buck, before the ferrite bead). */}
    <chip name="C19" manufacturerPartNumber="RVT470UF16V67RV0031" supplierPartNumbers={{ jlcpcb: ["C2858857"] }}
      pcbX="-14.388mm" pcbY="-19.617mm" pcbRotation={90}
      footprint={(<footprint>
        <smtpad portHints={["pin1"]} pcbX="-3.295mm" pcbY="0mm" shape="rect" width="3.610mm" height="1.260mm" />
        <smtpad portHints={["pin2"]} pcbX="3.295mm"  pcbY="0mm" shape="rect" width="3.610mm" height="1.260mm" />
      </footprint>)}
      connections={{ pin1: "net.V3V3", pin2: "net.PGND" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2858857.obj?uuid=8beb57c9d1c84c45a863b52d65e6d25f", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2858857.step?uuid=8beb57c9d1c84c45a863b52d65e6d25f" }} />
    <capacitor name="C4" footprint="1206" manufacturerPartNumber="TAJA106K016RNJ" supplierPartNumbers={{ jlcpcb: ["C7171"] }}
      capacitance="10uF" pcbX="-11.594mm" pcbY="15.181mm" pcbRotation={270}
      connections={{ pin1: "net.V3V3", pin2: "net.PGND" }} />
    <capacitor name="C6" footprint="1210" manufacturerPartNumber="TAJB107K006RNJ" supplierPartNumbers={{ jlcpcb: ["C16133"] }}
      capacitance="100uF" pcbX="-12.864mm" pcbY="9.339mm" pcbRotation={270}
      connections={{ pin1: "net.V3V3", pin2: "net.PGND" }} />

    {/* ============================================================
         ESP32-S3 rail decoupling
         FB1 (600 Ω @ 100 MHz, 1.6 A) bridges V3V3 → V3V3_ESP so the
         buck-side switching noise stays out of the radio.
         C_DCP1..3 sit right next to the module pads.
         ============================================================ */}

    <inductor name="FB1" footprint="0805" inductance="0" manufacturerPartNumber="BLM21AG601SN1D"
      pcbX="-7mm" pcbY="-22mm"
      connections={{ pin1: "net.V3V3", pin2: "net.V3V3_ESP" }} />
    <capacitor name="C_DCP1" footprint="0805" capacitance="22uF"
      pcbX="-7mm" pcbY="22.5mm"
      connections={{ pin1: "net.V3V3_ESP", pin2: "net.DGND" }} />
    <capacitor name="C_DCP2" footprint="0603" capacitance="1uF"
      pcbX="-4.5mm" pcbY="22.5mm"
      connections={{ pin1: "net.V3V3_ESP", pin2: "net.DGND" }} />
    <capacitor name="C_DCP3" footprint="0603" capacitance="100nF"
      pcbX="-2mm" pcbY="22.5mm"
      connections={{ pin1: "net.V3V3_ESP", pin2: "net.DGND" }} />

    {/* ============================================================
         74LVC1G14 Schmitt trigger (U3)
         pin1 = A (input ← BUS_RX_DET), pin5 = VCC ← V3V3_ESP, pin2 = GND ← DGND,
         pin3 = Y (output → BUS_RX_PIN), pin4 = NC.
         Output is INVERTED — set inverted: true in firmware.
         C_U3 = 100 nF, placed next to pin5.
         ============================================================ */}

    <chip name="U3" footprint="sot23_5" manufacturerPartNumber="74LVC1G14"
      pinLabels={{ pin1: ["A"], pin2: ["GND"], pin3: ["Y"], pin4: ["NC"], pin5: ["VCC"] }}
      pcbX="-9mm" pcbY="-1mm"
      connections={{ A: "net.BUS_RX_DET", GND: "net.DGND", Y: "net.BUS_RX_PIN", VCC: "net.V3V3_ESP" }} />
    <capacitor name="C_U3" footprint="0603" capacitance="100nF"
      pcbX="-9mm" pcbY="-3.5mm" pcbRotation={90}
      connections={{ pin1: "net.V3V3_ESP", pin2: "net.DGND" }} />

    {/* ============================================================
         ESP32-S3-WROOM-1 (U2)
         GPIO assignment:
           BUS_RX_PIN  → GPIO4   (Schmitt output, inverted)
           BUS_TX_PIN  → GPIO5
           LED_PIN     → GPIO2   (status LED)
           BOOT_STRAP  → GPIO0   (FTDI auto-program only)
           RX (UART0)  → RXD0 (GPIO44)
           TX (UART0)  → TXD0 (GPIO43)
         ============================================================ */}

    <ESP32_S3_WROOM_1 name="U2" pcbX="0mm" pcbY="10mm"
      connections={{
        GND: "net.DGND",
        V3V3: "net.V3V3_ESP",
        EN: "net.EN",
        GPIO4: "net.BUS_RX_PIN",
        GPIO5: "net.BUS_TX_PIN",
        GPIO2: "net.LED_PIN",
        GPIO0: "net.BOOT_STRAP",
        RXD0: "net.RX",
        TXD0: "net.TX",
      }} />

    {/* ============================================================
         EN handling and FTDI auto-program
         R10 pulls EN up to V3V3_ESP, C5 forms an RC delay (~1 ms).
         Q2 (FTDI RTS) and Q3 (FTDI DTR) drive EN/BOOT for auto-program.
         SW1 (silk "RST") shorts EN to DGND through R11 (150 Ω).
         ============================================================ */}

    <resistor name="R10" footprint="0603" resistance="10k" pcbX="-14.007mm" pcbY="14.800mm" pcbRotation={270}
      connections={{ pin1: "net.EN", pin2: "net.V3V3_ESP" }} />
    <capacitor name="C5" footprint="0603" manufacturerPartNumber="CC0603KRX7R9BB104"
      supplierPartNumbers={{ jlcpcb: ["C14663"] }} capacitance="100nF"
      pcbX="-14.261mm" pcbY="17.975mm" pcbRotation={180}
      connections={{ pin1: "net.DGND", pin2: "net.EN" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C14663.obj?uuid=ac9b32e974bc448eab36b1293f859dcb", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C14663.step?uuid=ac9b32e974bc448eab36b1293f859dcb" }} />

    <BJT_S8050 name="Q2" pcbX="16.727mm" pcbY="17.975mm" pcbRotation={270}
      connections={{ B: "net.EN_DRIVE", E: "net.DGND", C: "net.EN" }} />
    <BJT_S8050 name="Q3" pcbX="16.727mm" pcbY="10.736mm" pcbRotation={90}
      connections={{ B: "net.D0_DRIVE", E: "net.DGND", C: "net.BOOT_STRAP" }} />

    <resistor name="R8" footprint="0603" resistance="100k" pcbX="17.616mm" pcbY="14.419mm" pcbRotation={270}
      connections={{ pin1: "net.RTS", pin2: "net.EN_DRIVE" }} />
    <resistor name="R9" footprint="0603" resistance="100k" pcbX="15.711mm" pcbY="14.419mm" pcbRotation={90}
      connections={{ pin1: "net.DTR", pin2: "net.D0_DRIVE" }} />

    {/* SW1 — RESET tactile button (silk "RST"). pin1+pin2 (one side of the
       switch) are tied as RST_BTN; pin3+pin4 are on DGND. R11 (150 Ω) is the
       series resistor between RST_BTN and EN. */}
    <resistor name="R11" footprint="0603" resistance="150" pcbX="-17.563mm" pcbY="17.975mm"
      connections={{ pin1: "net.RST_BTN", pin2: "net.EN" }} />
    <chip name="SW1" manufacturerPartNumber="TS-1187A-B-A-B" supplierPartNumbers={{ jlcpcb: ["C318884"] }}
      pcbX="-17.944mm" pcbY="12.133mm" pcbRotation={90}
      footprint={(<footprint>
        <smtpad portHints={["pin1"]} pcbX="-3.000mm" pcbY="1.850mm"  shape="rect" width="1.000mm" height="0.750mm" />
        <smtpad portHints={["pin2"]} pcbX="3.000mm"  pcbY="1.850mm"  shape="rect" width="1.000mm" height="0.750mm" />
        <smtpad portHints={["pin3"]} pcbX="-3.000mm" pcbY="-1.850mm" shape="rect" width="1.000mm" height="0.750mm" />
        <smtpad portHints={["pin4"]} pcbX="3.000mm"  pcbY="-1.850mm" shape="rect" width="1.000mm" height="0.750mm" />
      </footprint>)}
      connections={{ pin1: "net.RST_BTN", pin2: "net.RST_BTN", pin3: "net.DGND", pin4: "net.DGND" }}
      cadModel={{ objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C318884.obj?uuid=91b67c1735f643ffb2e7226c23dd3492", stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C318884.step?uuid=91b67c1735f643ffb2e7226c23dd3492" }} />

    {/* ============================================================
         Indicator LEDs
         LED1 (red)    — PWR, always-on through R17 to V3V3_ESP
         LED2 (yellow) — TX, driven by BUS_TX_PIN through R20
         LED3 (yellow) — RX, anode through R16 to V3V3_ESP, cathode pulled
                         to BUS_GND by Q6 (deliberate cross-island return)
         LED4 (blue)   — STAT, driven by LED_PIN (GPIO2) through R6
         ============================================================ */}

    <led name="LED1" footprint="0603" color="red"    pcbX="-15.912mm" pcbY="5.021mm"
      supplierPartNumbers={{ jlcpcb: ["C2286"] }} manufacturerPartNumber="KT-0603R"
      connections={{ neg: "net.DGND", pos: "net.PWR_LED_A" }} />
    <resistor name="R17" footprint="0603" resistance="1k" pcbX="-12.610mm" pcbY="5.021mm"
      connections={{ pin1: "net.PWR_LED_A", pin2: "net.V3V3_ESP" }} />

    <led name="LED2" footprint="0603" color="yellow" pcbX="-15.912mm" pcbY="1.465mm"
      supplierPartNumbers={{ jlcpcb: ["C72038"] }} manufacturerPartNumber="19-213_Y2C-CQ2R2L_3T"
      connections={{ neg: "net.DGND", pos: "net.TX_LED_A" }} />
    <resistor name="R20" footprint="0603" resistance="150" pcbX="-12.610mm" pcbY="1.465mm"
      connections={{ pin1: "net.TX_LED_A", pin2: "net.BUS_TX_PIN" }} />

    <led name="LED3" footprint="0603" color="yellow" pcbX="-15.912mm" pcbY="3.243mm"
      supplierPartNumbers={{ jlcpcb: ["C72038"] }} manufacturerPartNumber="19-213_Y2C-CQ2R2L_3T"
      connections={{ neg: "net.RX_LED_K", pos: "net.RX_LED_A" }} />
    <resistor name="R16" footprint="0603" resistance="150" pcbX="-12.610mm" pcbY="3.243mm"
      connections={{ pin1: "net.RX_LED_A", pin2: "net.V3V3_ESP" }} />

    <led name="LED4" footprint="0603" color="blue"   pcbX="-15.912mm" pcbY="-0.313mm"
      supplierPartNumbers={{ jlcpcb: ["C72041"] }} manufacturerPartNumber="19-217_BHC-ZL1M2RY_3T"
      connections={{ neg: "net.DGND", pos: "net.STAT_LED_A" }} />
    <resistor name="R6"  footprint="0603" resistance="1k"  pcbX="-12.610mm" pcbY="-0.313mm"
      connections={{ pin1: "net.STAT_LED_A", pin2: "net.LED_PIN" }} />

    {/* ============================================================
         Star-point ground stitching (3 × 0 Ω)
         The router treats PGND / DGND / BUS_GND as separate nets; they
         only meet at the GND node through these three 0 Ω resistors.
         net.GND has no other binding components in the schematic.
         ============================================================ */}

    <resistor name="R_PGND" footprint="0603" resistance="0"
      pcbX="-2mm" pcbY="-22mm" pcbRotation={90}
      connections={{ pin1: "net.PGND", pin2: "net.GND" }} />
    <resistor name="R_DGND" footprint="0603" resistance="0"
      pcbX="0.5mm" pcbY="-22mm" pcbRotation={90}
      connections={{ pin1: "net.DGND", pin2: "net.GND" }} />
    <resistor name="R_BGND" footprint="0603" resistance="0"
      pcbX="3mm" pcbY="-22mm" pcbRotation={90}
      connections={{ pin1: "net.BUS_GND", pin2: "net.GND" }} />

    {/* === Mounting holes === */}
    <hole name="H1" diameter="2.2677mm" pcbX="19.648mm"  pcbY="16.070mm" />
    <hole name="H2" diameter="2.2677mm" pcbX="13.552mm"  pcbY="-24.062mm" />
    <hole name="H3" diameter="2.2677mm" pcbX="-19.849mm" pcbY="-16.315mm" />

    {/* === Silkscreen labels === */}
    <silkscreentext text="ABB-Welcome Bus Interface"
      pcbX="0mm" pcbY="-26mm" fontSize="1.2mm" anchorAlignment="center" />
    <silkscreentext text="v3.0"
      pcbX="0mm" pcbY="-27.5mm" fontSize="0.8mm" anchorAlignment="center" />

    {/* P1 terminal block — bus connector. POLARITY MATTERS:
       L1 (= P1.pin2) is the fused hot leg (+).
       L2 (= P1.pin1) is the bus return / ground reference (−). */}
    <silkscreentext text="L1 (+)" pcbX="14.5mm" pcbY="-7mm" fontSize="0.7mm" />
    <silkscreentext text="L2 (-)" pcbX="14.5mm" pcbY="0mm"  fontSize="0.7mm" />
    <silkscreentext text="BUS"
      pcbX="19mm" pcbY="-3.5mm" pcbRotation={90} fontSize="0.9mm" anchorAlignment="center" />
    {/* Polarity markers next to each pad. */}
    <silkscreentext text="+" pcbX="19.5mm" pcbY="-6mm" fontSize="1.0mm" anchorAlignment="center" />
    <silkscreentext text="-" pcbX="19.5mm" pcbY="-1mm" fontSize="1.0mm" anchorAlignment="center" />

    {/* P2 FTDI pin numbering */}
    <silkscreentext text="GND" pcbX="14mm" pcbY="5mm"  fontSize="0.7mm" />
    <silkscreentext text="RTS" pcbX="14mm" pcbY="7.5mm" fontSize="0.7mm" />
    <silkscreentext text="3V3" pcbX="14mm" pcbY="10mm" fontSize="0.7mm" />
    <silkscreentext text="RX"  pcbX="14mm" pcbY="12.5mm" fontSize="0.7mm" />
    <silkscreentext text="TX"  pcbX="14mm" pcbY="15mm" fontSize="0.7mm" />
    <silkscreentext text="DTR" pcbX="14mm" pcbY="17.5mm" fontSize="0.7mm" />
    <silkscreentext text="FTDI"
      pcbX="10mm" pcbY="11.4mm" pcbRotation={90} fontSize="0.9mm" anchorAlignment="center" />

    {/* Reset button label (was "BOOT" — the circuit is actually RESET). */}
    <silkscreentext text="RST"
      pcbX="-17.9mm" pcbY="15mm" fontSize="0.7mm" anchorAlignment="center" />

    {/* LED labels — fixed to match circuit roles (PWR/TX/RX/STAT). */}
    <silkscreentext text="PWR"  pcbX="-13.5mm" pcbY="5mm"   fontSize="0.6mm" />
    <silkscreentext text="TX"   pcbX="-13.5mm" pcbY="1.5mm" fontSize="0.6mm" />
    <silkscreentext text="RX"   pcbX="-13.5mm" pcbY="3.2mm" fontSize="0.6mm" />
    <silkscreentext text="STAT" pcbX="-13.5mm" pcbY="-0.3mm" fontSize="0.6mm" />

    {/* TVS marker */}
    <silkscreentext text="TVS"
      pcbX="10mm" pcbY="-9mm" fontSize="0.6mm" anchorAlignment="center" />
  </board>
)

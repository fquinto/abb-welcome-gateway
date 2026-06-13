import { A_8205A } from "./imports/A_8205A"
import { DW01A } from "./imports/DW01A"
import { TP4056 } from "./imports/TP4056"
import { TYPE_C_16PIN_2MD_073_ } from "./imports/TYPE_C_16PIN_2MD_073_"

export default () => (
  <board width="36mm" height="22mm">
    <TYPE_C_16PIN_2MD_073_
      name="J1"
      pcbX="-14mm"
      pcbY="0mm"
      pcbRotation={-90}
      connections={{
        A4B9: "net.VUSB",
        B4A9: "net.VUSB",
        A1B12: "net.GND",
        B1A12: "net.GND",
        EH1: "net.GND",
        EH2: "net.GND",
      }}
    />

    <pinheader
      name="P1"
      pinCount={2}
      pitch="2.54mm"
      gender="female"
      footprint="pinrow2"
      pcbX="11.8mm"
      pcbY="6.8mm"
      pcbRotation={90}
      showSilkscreenPinLabels
      pinLabels={{ pin1: "BATP", pin2: "BATN" }}
      pcbPinLabels={{ pin1: "BAT+", pin2: "BAT-" }}
      connections={{ pin1: "net.BAT_PLUS", pin2: "net.BAT_NEG" }}
    />

    <pinheader
      name="P2"
      pinCount={2}
      pitch="2.54mm"
      gender="female"
      footprint="pinrow2"
      pcbX="11.8mm"
      pcbY="-6.8mm"
      pcbRotation={90}
      showSilkscreenPinLabels
      pinLabels={{ pin1: "OUTP", pin2: "OUTN" }}
      pcbPinLabels={{ pin1: "OUT+", pin2: "OUT-" }}
      connections={{ pin1: "net.BAT_PLUS", pin2: "net.OUT_NEG" }}
    />

    <TP4056
      name="U1"
      pcbX="-3.8mm"
      pcbY="0.3mm"
      schHeight="1mm"
      connections={{
        VCC: "net.VUSB",
        BAT: "net.BAT_PLUS",
        GND: "net.GND",
        EP: "net.GND",
        TEMP: "net.GND",
        CE: "net.VUSB",
      }}
    />

    <DW01A
      name="U2"
      pcbX="6mm"
      pcbY="1.5mm"
      connections={{
        VDD: "net.BAT_PLUS",
        VSS: "net.BAT_NEG",
        VM: "net.OUT_NEG_SENSE",
        DOUT: "net.DOUT",
        COUT: "net.COUT",
      }}
    />

    <A_8205A
      name="U3"
      pcbX="7mm"
      pcbY="-4.2mm"
      connections={{
        S1: "net.BAT_NEG",
        D1: "net.OUT_NEG",
        S2: "net.OUT_NEG",
        G1: "net.DOUT",
        G2: "net.COUT",
      }}
    />

    <capacitor
      name="C1"
      capacitance="10uF"
      footprint="0603"
      pcbX="-8mm"
      pcbY="-4.8mm"
      schOrientation="vertical"
      connections={{ pin1: "net.VUSB", pin2: "net.GND" }}
    />
    <capacitor
      name="C2"
      capacitance="10uF"
      footprint="0603"
      pcbX="1.2mm"
      pcbY="-4.8mm"
      schOrientation="vertical"
      connections={{ pin1: "net.BAT_PLUS", pin2: "net.GND" }}
    />
    <capacitor
      name="C3"
      capacitance="100nF"
      footprint="0603"
      pcbX="3.7mm"
      pcbY="4.9mm"
      schOrientation="vertical"
      connections={{ pin1: "net.BAT_PLUS", pin2: "net.BAT_NEG" }}
    />

    <resistor
      name="R1"
      resistance="1.2k"
      footprint="0603"
      pcbX="-4.2mm"
      pcbY="-5.2mm"
      connections={{ pin1: ".U1 > .PROG", pin2: "net.GND" }}
    />
    <resistor
      name="R2"
      resistance="1k"
      footprint="0603"
      pcbX="-4.8mm"
      pcbY="5.4mm"
      connections={{ pin1: "net.VUSB", pin2: ".LED1 > .pos" }}
    />
    <resistor
      name="R3"
      resistance="1k"
      footprint="0603"
      pcbX="-1.2mm"
      pcbY="5.4mm"
      connections={{ pin1: "net.VUSB", pin2: ".LED2 > .pos" }}
    />
    <resistor
      name="R4"
      resistance="2k"
      footprint="0603"
      pcbX="10.2mm"
      pcbY="2.9mm"
      connections={{ pin1: ".U2 > .VM", pin2: "net.OUT_NEG" }}
    />
    <resistor
      name="R5"
      resistance="5.1k"
      footprint="0603"
      pcbX="-9.6mm"
      pcbY="6.5mm"
      connections={{ pin1: ".J1 > .A5", pin2: "net.GND" }}
    />
    <resistor
      name="R6"
      resistance="5.1k"
      footprint="0603"
      pcbX="-9.3mm"
      pcbY="4.7mm"
      connections={{ pin1: ".J1 > .B5", pin2: "net.GND" }}
    />

    <led
      name="LED1"
      color="red"
      footprint="0603"
      pcbX="-4.8mm"
      pcbY="7.6mm"
      connections={{ neg: ".U1 > .CHRG" }}
    />
    <led
      name="LED2"
      color="green"
      footprint="0603"
      pcbX="-1.2mm"
      pcbY="7.6mm"
      connections={{ neg: ".U1 > .STDBY" }}
    />

    <silkscreentext
      text="1S Li-ion Charger + Protection"
      pcbX="-2mm"
      pcbY="-9.1mm"
      fontSize="1mm"
      anchorAlignment="center"
    />

    <hole name="H1" diameter="2.2mm" pcbX="-16mm" pcbY="8.2mm" />
    <hole name="H2" diameter="2.2mm" pcbX="-16mm" pcbY="-8.2mm" />
    <hole name="H3" diameter="2.2mm" pcbX="16mm" pcbY="8.2mm" />
    <hole name="H4" diameter="2.2mm" pcbX="16mm" pcbY="-8.2mm" />
  </board>
)

import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["GND"],
  pin2: ["V3V3"],
  pin3: ["EN"],
  pin4: ["GPIO4"],
  pin5: ["GPIO5"],
  pin6: ["GPIO6"],
  pin7: ["GPIO7"],
  pin8: ["GPIO15"],
  pin9: ["GPIO16"],
  pin10: ["GPIO17"],
  pin11: ["GPIO18"],
  pin12: ["GPIO8"],
  pin13: ["GPIO19"],
  pin14: ["GPIO20"],
  pin15: ["GPIO3"],
  pin16: ["GPIO46"],
  pin17: ["GPIO9"],
  pin18: ["GPIO10"],
  pin19: ["GPIO11"],
  pin20: ["GPIO12"],
  pin21: ["GPIO13"],
  pin22: ["GPIO14"],
  pin23: ["GPIO21"],
  pin24: ["NC"],
  pin25: ["NC"],
  pin26: ["NC"],
  pin27: ["NC"],
  pin28: ["NC"],
  pin29: ["NC"],
  pin30: ["NC"],
  pin31: ["NC"],
  pin32: ["NC"],
  pin33: ["NC"],
  pin34: ["NC"],
  pin35: ["GPIO47"],
  pin36: ["GPIO48"],
  pin37: ["GPIO45"],
  pin38: ["GPIO0"],
  pin39: ["GPIO35"],
  pin40: ["GPIO36"],
  pin41: ["GPIO37"],
  pin42: ["GPIO38"],
  pin43: ["GPIO39"],
  pin44: ["MTCK"],
  pin45: ["MTDO"],
  pin46: ["MTDI"],
  pin47: ["TXD0"],
  pin48: ["RXD0"],
  pin49: ["GPIO2"],
  pin50: ["GPIO1"],
  pin51: ["GND"],
  pin52: ["GND"],
  pin53: ["GND"],
  pin54: ["GND"],
  pin55: ["GND"],
  pin56: ["GND"],
  pin57: ["GND"],
  pin58: ["GND"],
  pin59: ["GND"],
  pin60: ["GND"],
  pin61: ["GND"],
} as const

export const ESP32_S3_WROOM_1 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      // Readable schematic symbol: only the pins this board actually uses are
      // placed, grouped by function. The remaining GPIOs / NC / extra GND pads
      // still exist as ports for the PCB — they're just omitted from the
      // schematic box so the symbol isn't a 61-pin wall. Power/control on top,
      // GND on the bottom, bus-side inputs on the left, driven outputs +
      // UART/boot on the right.
      schPinArrangement={{
        topSide: { direction: "left-to-right", pins: ["V3V3", "EN"] },
        bottomSide: { direction: "left-to-right", pins: ["pin1"] },
        leftSide: { direction: "top-to-bottom", pins: ["RXD0", "GPIO4"] },
        rightSide: { direction: "top-to-bottom", pins: ["TXD0", "GPIO5", "GPIO2", "GPIO0"] },
      }}
      supplierPartNumbers={{ jlcpcb: ["C5736265"] }}
      manufacturerPartNumber="ESP32-S3-WROOM-1-N16R8"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="-5.9000mm" pcbY="3.9751mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin2"]} pcbX="-5.9000mm" pcbY="3.1750mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin3"]} pcbX="-5.9000mm" pcbY="2.3749mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin4"]} pcbX="-5.9000mm" pcbY="1.5751mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin5"]} pcbX="-5.9000mm" pcbY="0.7750mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin6"]} pcbX="-5.9000mm" pcbY="-0.0249mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin7"]} pcbX="-5.9000mm" pcbY="-0.8250mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin8"]} pcbX="-5.9000mm" pcbY="-1.6251mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin9"]} pcbX="-5.9000mm" pcbY="-2.4249mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin10"]} pcbX="-5.9000mm" pcbY="-3.2250mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin11"]} pcbX="-5.9000mm" pcbY="-4.0251mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin12"]} pcbX="-4.8000mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin13"]} pcbX="-4.0001mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin14"]} pcbX="-3.2000mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin15"]} pcbX="-2.3999mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin16"]} pcbX="-1.6001mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin17"]} pcbX="-0.8000mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin18"]} pcbX="-0.0001mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin19"]} pcbX="0.8000mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin20"]} pcbX="1.6001mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin21"]} pcbX="2.3999mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin22"]} pcbX="3.2000mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin23"]} pcbX="4.0001mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin24"]} pcbX="4.8000mm" pcbY="-4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin25"]} pcbX="5.9000mm" pcbY="-4.0251mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin26"]} pcbX="5.9000mm" pcbY="-3.2250mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin27"]} pcbX="5.9000mm" pcbY="-2.4249mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin28"]} pcbX="5.9000mm" pcbY="-1.6251mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin29"]} pcbX="5.9000mm" pcbY="-0.8250mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin30"]} pcbX="5.9000mm" pcbY="-0.0251mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin31"]} pcbX="5.9000mm" pcbY="0.7750mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin32"]} pcbX="5.9000mm" pcbY="1.5751mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin33"]} pcbX="5.9000mm" pcbY="2.3749mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin34"]} pcbX="5.9000mm" pcbY="3.1750mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin35"]} pcbX="5.9000mm" pcbY="3.9751mm" width="0.8000mm" height="0.4000mm" shape="rect" />
        <smtpad portHints={["pin36"]} pcbX="4.8000mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin37"]} pcbX="4.0001mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin38"]} pcbX="3.2000mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin39"]} pcbX="2.3999mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin40"]} pcbX="1.6001mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin41"]} pcbX="0.8000mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin42"]} pcbX="0.0001mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin43"]} pcbX="-0.8000mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin44"]} pcbX="-1.6001mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin45"]} pcbX="-2.3999mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin46"]} pcbX="-3.2000mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin47"]} pcbX="-3.9999mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin48"]} pcbX="-4.8000mm" pcbY="4.8999mm" width="0.4000mm" height="0.8000mm" shape="rect" />
        <smtpad portHints={["pin49"]} pcbX="0.0250mm" pcbY="0.0500mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin50"]} pcbX="5.9501mm" pcbY="4.9500mm" width="0.7000mm" height="0.7000mm" shape="rect" />
        <smtpad portHints={["pin51"]} pcbX="5.9501mm" pcbY="-4.9500mm" width="0.7000mm" height="0.7000mm" shape="rect" />
        <smtpad portHints={["pin52"]} pcbX="-5.9501mm" pcbY="-4.9500mm" width="0.7000mm" height="0.7000mm" shape="rect" />
        <smtpad portHints={["pin53"]} pcbX="-5.9501mm" pcbY="4.9500mm" width="0.7000mm" height="0.7000mm" shape="rect" />
        <smtpad portHints={["pin54"]} pcbX="-1.7751mm" pcbY="0.0500mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin55"]} pcbX="-1.7751mm" pcbY="1.8501mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin56"]} pcbX="0.0250mm" pcbY="1.8501mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin57"]} pcbX="1.8249mm" pcbY="1.8501mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin58"]} pcbX="1.8249mm" pcbY="0.0500mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin59"]} pcbX="-1.7751mm" pcbY="-1.7498mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin60"]} pcbX="0.0250mm" pcbY="-1.7498mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <smtpad portHints={["pin61"]} pcbX="1.8249mm" pcbY="-1.7498mm" width="1.4500mm" height="1.4500mm" shape="rect" />
        <silkscreenpath route={[{"x":-6.603974600000015,"y":5.841974600000071},{"x":6.604025399999955,"y":5.841974600000071}]} />
        <courtyardoutline outline={[{"x":-7.816279000000122,"y":11.250993999999992},{"x":6.856920999999829,"y":11.250993999999992},{"x":6.856920999999829,"y":-5.886006000000066},{"x":-7.816279000000122,"y":-5.886006000000066},{"x":-7.816279000000122,"y":11.250993999999992}]} />
        <silkscreentext text="{NAME}" pcbX="0mm" pcbY="-5mm" anchorAlignment="center" fontSize="1mm" />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C5736265.obj?uuid=bef0e89b3c7b4ed6aaad31f267cf38e9",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C5736265.step?uuid=bef0e89b3c7b4ed6aaad31f267cf38e9",
        modelOriginPosition: { x: -0.000025399999913133797, y: -2.6899869999999737, z: 0 },
      }}
      {...props}
    />
  )
}

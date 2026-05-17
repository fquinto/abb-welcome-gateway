import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["GND"],
  pin2: ["V3V3"],
  pin3: ["EN"],
  pin4: ["SENSOR_VP"],
  pin5: ["SENSOR_VN"],
  pin6: ["GPIO34"],
  pin7: ["GPIO35"],
  pin8: ["GPIO32"],
  pin9: ["GPIO33"],
  pin10: ["GPIO25"],
  pin11: ["GPIO26"],
  pin12: ["GPIO27"],
  pin13: ["GPIO14"],
  pin14: ["GPIO12"],
  pin15: ["GND"],
  pin16: ["GPIO13"],
  pin17: ["SHD_SD2"],
  pin18: ["SWP_SD3"],
  pin19: ["SCS_CMD"],
  pin20: ["SCK_CLK"],
  pin21: ["SDO_SD0"],
  pin22: ["SDI_SD1"],
  pin23: ["GPIO15"],
  pin24: ["GPIO2"],
  pin25: ["GPIO0"],
  pin26: ["GPIO4"],
  pin27: ["GPIO16"],
  pin28: ["GPIO17"],
  pin29: ["GPIO5"],
  pin30: ["GPIO18"],
  pin31: ["GPIO19"],
  pin32: ["NC"],
  pin33: ["GPIO21"],
  pin34: ["RXD0"],
  pin35: ["TXD0"],
  pin36: ["GPIO22"],
  pin37: ["GPIO23"],
  pin38: ["GND"],
  pin39: ["GND"],
} as const

export const ESP32_SOLO_1 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{ jlcpcb: ["C473005"] }}
      manufacturerPartNumber="ESP32-SOLO-1"
      footprint={<footprint>
        <smtpad portHints={["pin32"]} pcbX="8.8501mm" pcbY="1.5850mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin31"]} pcbX="8.8501mm" pcbY="0.3150mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin30"]} pcbX="8.8501mm" pcbY="-0.9550mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin29"]} pcbX="8.8501mm" pcbY="-2.2250mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin28"]} pcbX="8.8501mm" pcbY="-3.4950mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin27"]} pcbX="8.8501mm" pcbY="-4.7650mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin26"]} pcbX="8.8501mm" pcbY="-6.0350mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin25"]} pcbX="8.8501mm" pcbY="-7.3050mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin24"]} pcbX="5.7150mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin23"]} pcbX="4.4450mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin22"]} pcbX="3.1750mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin21"]} pcbX="1.9050mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin20"]} pcbX="0.6350mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin19"]} pcbX="-0.6350mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin18"]} pcbX="-1.9050mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin17"]} pcbX="-3.1750mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin16"]} pcbX="-4.4450mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin15"]} pcbX="-5.7150mm" pcbY="-8.6550mm" width="0.9000mm" height="2.0000mm" shape="rect" />
        <smtpad portHints={["pin14"]} pcbX="-8.8501mm" pcbY="-7.3050mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin13"]} pcbX="-8.8501mm" pcbY="-6.0350mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin12"]} pcbX="-8.8501mm" pcbY="-4.7650mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin11"]} pcbX="-8.8501mm" pcbY="-3.4950mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin10"]} pcbX="-8.8501mm" pcbY="-2.2250mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin9"]} pcbX="-8.8501mm" pcbY="-0.9550mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin8"]} pcbX="-8.8501mm" pcbY="0.3150mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin7"]} pcbX="-8.8501mm" pcbY="1.5850mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin6"]} pcbX="-8.8501mm" pcbY="2.8550mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin5"]} pcbX="-8.8501mm" pcbY="4.1250mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin4"]} pcbX="-8.8501mm" pcbY="5.3950mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin3"]} pcbX="-8.8501mm" pcbY="6.6650mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin2"]} pcbX="-8.8501mm" pcbY="7.9350mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin1"]} pcbX="-8.8501mm" pcbY="9.2050mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin33"]} pcbX="8.8501mm" pcbY="2.8550mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin34"]} pcbX="8.8501mm" pcbY="4.1250mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin35"]} pcbX="8.8501mm" pcbY="5.3950mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin36"]} pcbX="8.8501mm" pcbY="6.6650mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin37"]} pcbX="8.8501mm" pcbY="7.9350mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin38"]} pcbX="8.8501mm" pcbY="9.2050mm" width="2.0000mm" height="0.9000mm" shape="rect" />
        <smtpad portHints={["pin39"]} pcbX="-1.0000mm" pcbY="1.7051mm" width="5.0000mm" height="5.0000mm" shape="rect" />
        <silkscreenpath route={[{"x":-6.396151800000098,"y":-8.82495695},{"x":-9.000007400000072,"y":-8.82495695}]} />
        <silkscreenpath route={[{"x":9.000007399999959,"y":-7.98614735000001},{"x":9.000007399999959,"y":-8.82495695},{"x":6.3961517999998705,"y":-8.82495695}]} />
        <silkscreenpath route={[{"x":-9.000007400000072,"y":9.886156250000113},{"x":-9.000007400000072,"y":16.675068250000095},{"x":9.000007399999959,"y":16.675068250000095},{"x":9.000007399999959,"y":9.886156250000113}]} />
        <silkscreenpath route={[{"x":-9.000007400000072,"y":-8.82495695},{"x":-9.000007400000072,"y":-7.9860965499999566}]} />
        <silkscreenpath route={[{"x":6.350000000000136,"y":15.055005450000067},{"x":7.620000000000118,"y":15.055005450000067},{"x":7.620000000000118,"y":11.245005450000008}]} />
        <silkscreenpath route={[{"x":5.079999999999927,"y":15.055005450000067},{"x":5.079999999999927,"y":11.245005450000008}]} />
        <silkscreenpath route={[{"x":-7.619999999999891,"y":12.515005450000217},{"x":-7.619999999999891,"y":15.055005450000067},{"x":-5.079999999999927,"y":15.055005450000067},{"x":-5.079999999999927,"y":12.515005450000217},{"x":-2.5399999999999636,"y":12.515005450000217},{"x":-2.5399999999999636,"y":15.055005450000067},{"x":0,"y":15.055005450000067},{"x":0,"y":12.515005450000217},{"x":2.540000000000191,"y":12.515005450000217},{"x":2.540000000000191,"y":15.055005450000067},{"x":6.350000000000136,"y":15.055005450000067}]} />
        <silkscreenpath route={[{"x":-8.98006840000005,"y":10.475029850000055},{"x":8.999931199999992,"y":10.3949690500001}]} />
        <courtyardoutline outline={[{"x":-10.32668799999999,"y":16.976452450000124},{"x":10.086911999999984,"y":16.976452450000124},{"x":10.086911999999984,"y":-9.914147549999825},{"x":-10.32668799999999,"y":-9.914147549999825},{"x":-10.32668799999999,"y":16.976452450000124}]} />
        <silkscreentext text="{NAME}" pcbX="0mm" pcbY="-5mm" anchorAlignment="center" fontSize="1mm" />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C473005.obj?uuid=089f75d296bc4ac0bea574df285ec5cf",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C473005.step?uuid=089f75d296bc4ac0bea574df285ec5cf",
        modelOriginPosition: { x: 0, y: -3.9440002500001627, z: 0 },
      }}
      {...props}
    />
  )
}

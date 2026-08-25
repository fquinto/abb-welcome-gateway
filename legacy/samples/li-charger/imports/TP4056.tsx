import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["TEMP"],
  pin2: ["PROG"],
  pin3: ["GND"],
  pin4: ["VCC"],
  pin5: ["BAT"],
  pin6: ["STDBY"],
  pin7: ["CHRG"],
  pin8: ["CE"],
  pin9: ["EP"]
} as const

export const TP4056 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C725790"
  ]
}}
      manufacturerPartNumber="TP4056"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="-1.905mm" pcbY="-2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="-0.635mm" pcbY="-2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin3"]} pcbX="0.635mm" pcbY="-2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin4"]} pcbX="1.905mm" pcbY="-2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin5"]} pcbX="1.905mm" pcbY="2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin6"]} pcbX="0.635mm" pcbY="2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin7"]} pcbX="-0.635mm" pcbY="2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin8"]} pcbX="-1.905mm" pcbY="2.9083mm" width="0.5999988mm" height="1.1999976mm" shape="rect" />
<smtpad portHints={["pin9"]} pcbX="0mm" pcbY="-0mm" width="3.2999934mm" height="2.3999952mm" shape="rect" />
<silkscreenpath route={[{"x":-2.549906000000007,"y":2.0500339999999966},{"x":2.5501600000000053,"y":2.0500339999999966}]} />
<silkscreenpath route={[{"x":2.549905999999993,"y":2.0500339999999966},{"x":2.549905999999993,"y":-2.050034000000011}]} />
<silkscreenpath route={[{"x":2.549905999999993,"y":-2.050034000000011},{"x":-2.5501600000000053,"y":-2.050034000000011}]} />
<silkscreenpath route={[{"x":-2.549906000000007,"y":0.8000999999999863},{"x":-2.549906000000007,"y":2.0500339999999966}]} />
<silkscreenpath route={[{"x":-2.549906000000007,"y":-0.8001000000000005},{"x":-2.549906000000007,"y":-2.050034000000011}]} />
<silkscreenpath route={[{"x":-2.499867999999992,"y":0.8000999999999863},{"x":-2.291342700086574,"y":0.6634482479307593},{"x":-2.1292805398622647,"y":0.47399546154056793},{"x":-2.0265793598305777,"y":0.24681938518638447},{"x":-1.9914127116567215,"y":-1.4210854715202004e-14},{"x":-2.0265793598305777,"y":-0.24681938518639868},{"x":-2.1292805398622647,"y":-0.47399546154058214},{"x":-2.291342700086574,"y":-0.6634482479307735},{"x":-2.499867999999992,"y":-0.8001000000000005}]} />
<silkscreentext text="{NAME}" pcbX="-0.3302mm" pcbY="4.5052mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-3.450400000000002,"y":3.755199999999988},{"x":2.7900000000000063,"y":3.755199999999988},{"x":2.7900000000000063,"y":-3.755200000000002},{"x":-3.450400000000002,"y":-3.755200000000002},{"x":-3.450400000000002,"y":3.755199999999988}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C725790.obj?uuid=9e2b03dd4dce46a190ce3fa245369fb2",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C725790.step?uuid=9e2b03dd4dce46a190ce3fa245369fb2",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: 0, y: 0, z: -0.099425 },
      }}
      {...props}
    />
  )
}
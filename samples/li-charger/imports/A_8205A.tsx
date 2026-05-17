import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["S1"],
  pin2: ["D1"],
  pin3: ["S2"],
  pin4: ["G2"],
  pin5: ["NC"],
  pin6: ["G1"]
} as const

export const A_8205A = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C2762931"
  ]
}}
      manufacturerPartNumber="A_8205A"
      footprint={<footprint>
        <smtpad portHints={["pin3"]} pcbX="1.35001mm" pcbY="0.94996mm" width="1.0999978mm" height="0.5999988mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="1.35001mm" pcbY="-0mm" width="1.0999978mm" height="0.5999988mm" shape="rect" />
<smtpad portHints={["pin1"]} pcbX="1.35001mm" pcbY="-0.94996mm" width="1.0999978mm" height="0.5999988mm" shape="rect" />
<smtpad portHints={["pin6"]} pcbX="-1.35001mm" pcbY="-0.94996mm" width="1.0999978mm" height="0.5999988mm" shape="rect" />
<smtpad portHints={["pin5"]} pcbX="-1.35001mm" pcbY="-0mm" width="1.0999978mm" height="0.5999988mm" shape="rect" />
<smtpad portHints={["pin4"]} pcbX="-1.35001mm" pcbY="0.94996mm" width="1.0999978mm" height="0.5999988mm" shape="rect" />
<silkscreenpath route={[{"x":-0.899998200000141,"y":1.5499080000000731},{"x":0.9000236000000541,"y":1.5499080000000731}]} />
<silkscreenpath route={[{"x":-0.899998200000141,"y":-1.5501111999999466},{"x":0.9000236000000541,"y":-1.5501111999999466}]} />
<silkscreentext text="{NAME}" pcbX="0.012446mm" pcbY="2.562354mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-2.1425540000000183,"y":1.8123540000000276},{"x":2.167445999999927,"y":1.8123540000000276},{"x":2.167445999999927,"y":-2.015045999999984},{"x":-2.1425540000000183,"y":-2.015045999999984},{"x":-2.1425540000000183,"y":1.8123540000000276}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2762931.obj?uuid=229b69761e2c45dba6a83d8866dec72d",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2762931.step?uuid=229b69761e2c45dba6a83d8866dec72d",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: 0, y: 0, z: -0.048939 },
      }}
      {...props}
    />
  )
}
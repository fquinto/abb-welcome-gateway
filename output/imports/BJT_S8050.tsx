import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["B"],
  pin2: ["E"],
  pin3: ["C"],
} as const

export const BJT_S8050 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{ jlcpcb: ["C2146"] }}
      manufacturerPartNumber="S8050"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="1.1013mm" pcbY="-0.9500mm" width="1.0375mm" height="0.5320mm" shape="rect" />
        <smtpad portHints={["pin2"]} pcbX="1.1013mm" pcbY="0.9500mm" width="1.0375mm" height="0.5320mm" shape="rect" />
        <smtpad portHints={["pin3"]} pcbX="-1.1013mm" pcbY="0.0000mm" width="1.0375mm" height="0.5320mm" shape="rect" />
        <silkscreenpath route={[{"x":0.8586978000000727,"y":1.5262098000000606},{"x":-0.8586978000000727,"y":1.5262098000000606},{"x":-0.8586978000000727,"y":0.49458879999997407}]} />
        <silkscreenpath route={[{"x":0.8586978000000727,"y":-1.5262097999999469},{"x":-0.8586978000000727,"y":-1.5262097999999469},{"x":-0.8586978000000727,"y":-0.49458879999997407}]} />
        <silkscreenpath route={[{"x":0.8586978000000727,"y":0.45539659999997184},{"x":0.8586978000000727,"y":-0.45539659999985815}]} />
        <courtyardoutline outline={[{"x":-1.8756000000000768,"y":1.774000000000001},{"x":2.0026000000000295,"y":1.774000000000001},{"x":2.0026000000000295,"y":-1.774000000000001},{"x":-1.8756000000000768,"y":-1.774000000000001},{"x":-1.8756000000000768,"y":1.774000000000001}]} />
        <silkscreentext text="{NAME}" pcbX="0mm" pcbY="-5mm" anchorAlignment="center" fontSize="1mm" />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2146.obj?uuid=cefd4596db214da394d9632b2b88f8f2",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2146.step?uuid=cefd4596db214da394d9632b2b88f8f2",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: -0.000012700000070253736, y: 0, z: 0 },
      }}
      {...props}
    />
  )
}

import type { ChipProps } from "@tscircuit/props"

// TPS5430DDA (SO PowerPAD-8) datasheet pinout.
// Pads 7 and 8 are both the switch node (PH) internally tied.
const pinLabels = {
  pin1: ["BOOT"],
  pin2: ["VIN"],
  pin3: ["EN"],
  pin4: ["GND"],
  pin5: ["VSENSE"],
  pin6: ["NC"],
  pin7: ["PH"],
  pin8: ["PH"],
  pin9: ["EPAD"],
} as const

export const TPS5430 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{ jlcpcb: ["C9864"] }}
      manufacturerPartNumber="TPS5430DDAR"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="-2.6999mm" pcbY="1.9050mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin2"]} pcbX="-2.6999mm" pcbY="0.6350mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin3"]} pcbX="-2.6999mm" pcbY="-0.6350mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin4"]} pcbX="-2.6999mm" pcbY="-1.9050mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin5"]} pcbX="2.6999mm" pcbY="-1.9050mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin6"]} pcbX="2.6999mm" pcbY="-0.6350mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin7"]} pcbX="2.6999mm" pcbY="0.6350mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin8"]} pcbX="2.6999mm" pcbY="1.9050mm" width="1.3000mm" height="0.6000mm" shape="rect" />
        <smtpad portHints={["pin9"]} pcbX="0.0001mm" pcbY="0.0000mm" width="2.5000mm" height="3.5000mm" shape="rect" />
        <silkscreenpath route={[{"x":-2.0500339999999824,"y":-2.436139400000016},{"x":-2.0500339999999824,"y":-2.549779000000001}]} />
        <silkscreenpath route={[{"x":-2.0500339999999824,"y":-1.16613940000002},{"x":-2.0500339999999824,"y":-1.3738606000000146}]} />
        <silkscreenpath route={[{"x":-2.0500339999999824,"y":0.1038605999999902},{"x":-2.0500339999999824,"y":-0.10386060000001862}]} />
        <silkscreenpath route={[{"x":-2.0500339999999824,"y":1.3738605999999862},{"x":-2.0500339999999824,"y":1.1661393999999916}]} />
        <silkscreenpath route={[{"x":-2.0500339999999824,"y":2.550032999999985},{"x":-2.0500339999999824,"y":2.4361393999999876}]} />
        <silkscreenpath route={[{"x":2.050034000000011,"y":-2.436139400000016},{"x":2.050034000000011,"y":-2.549779000000001}]} />
        <silkscreenpath route={[{"x":2.050034000000011,"y":-1.16613940000002},{"x":2.050034000000011,"y":-1.3738606000000146}]} />
        <silkscreenpath route={[{"x":2.050034000000011,"y":0.1038605999999902},{"x":2.050034000000011,"y":-0.10386060000001862}]} />
        <silkscreenpath route={[{"x":2.050034000000011,"y":1.3738605999999862},{"x":2.050034000000011,"y":1.1661393999999916}]} />
        <silkscreenpath route={[{"x":2.050034000000011,"y":2.550032999999985},{"x":2.050034000000011,"y":2.4361393999999876}]} />
        <silkscreenpath route={[{"x":0.8001000000000147,"y":2.550032999999985},{"x":2.050034000000011,"y":2.550032999999985}]} />
        <silkscreenpath route={[{"x":2.050034000000011,"y":-2.549779000000001},{"x":-2.0500339999999824,"y":-2.549779000000001}]} />
        <silkscreenpath route={[{"x":-0.8001000000000005,"y":2.550032999999985},{"x":-2.0500339999999824,"y":2.550032999999985}]} />
        <silkscreenpath route={[{"x":0.8001000000000147,"y":2.4999949999999984},{"x":0.6634482479307735,"y":2.2914697000865516},{"x":0.47399546154059635,"y":2.1294075398622425},{"x":0.24681938518639868,"y":2.0267063598305555},{"x":1.4210854715202004e-14,"y":1.9915397116566993},{"x":-0.24681938518639868,"y":2.0267063598305555},{"x":-0.4739954615405537,"y":2.1294075398622567},{"x":-0.6634482479307593,"y":2.291469700086566},{"x":-0.8001000000000005,"y":2.4999949999999984}]} />
        <courtyardoutline outline={[{"x":-3.8620069999999913,"y":3.4453199999999953},{"x":3.5975930000000034,"y":3.4453199999999953},{"x":3.5975930000000034,"y":-2.795080000000013},{"x":-3.8620069999999913,"y":-2.795080000000013},{"x":-3.8620069999999913,"y":3.4453199999999953}]} />
        <silkscreentext text="{NAME}" pcbX="0mm" pcbY="-5mm" anchorAlignment="center" fontSize="1mm" />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C9864.obj?uuid=f5377fc2ccbb41ff8aa998b5ab8a4f05",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C9864.step?uuid=f5377fc2ccbb41ff8aa998b5ab8a4f05",
        modelOriginPosition: { x: 0, y: 0.000012700000013410317, z: -0.825 },
      }}
      {...props}
    />
  )
}

#!/usr/bin/env python3
"""
TVS1 (SMBJ30A) clamp vs TPS5430 VIN absolute maximum (36 V).

Question (docs/STATUS.md): the SMBJ30A clamps at up to ~48 V at full rated
surge, which is above the buck's 36 V abs-max VIN. At what surge current does
the clamp actually exceed 36 V, and does the L3 series inductor cover the gap?

Model: piecewise-linear TVS, Vclamp(I) = VBR + I * Rdyn.
SMBJ30A datasheet points: VWM=30 V, VBR(min@1mA)=33.3 V, VC=48.4 V @ IPP=12.4 A
(10/1000 us). Rdyn = (VC - VBR) / IPP.
"""
VWM, VBR, VC, IPP = 30.0, 33.3, 48.4, 12.4
RDYN = (VC - VBR) / IPP
VIN_ABSMAX = 36.0
I_at_absmax = (VIN_ABSMAX - VBR) / RDYN

print(f"SMBJ30A: VWM=30 V (bus nominal 28 V -> no conduction),")
print(f"         VBR(min)=33.3 V, dynamic resistance Rdyn = {RDYN:.2f} ohm\n")
print(f"  {'I_TVS (A)':>9} {'Vclamp (V)':>11}  vs buck 36 V abs-max")
for I in (0.5, 1, 2, I_at_absmax, 5, 10, 12.4):
    vc = VBR + I * RDYN
    tag = "OK" if vc <= VIN_ABSMAX else "OVER abs-max"
    star = "  <-- = 36 V" if abs(I - I_at_absmax) < 1e-6 else ""
    print(f"  {I:>9.2f} {vc:>11.1f}  {tag}{star}")

print(f"\n=> Buck VIN abs-max (36 V) is exceeded once TVS current > {I_at_absmax:.1f} A.")
print("   L3 (100 uH) + input caps attenuate FAST transients (the buck node is")
print("   isolated by L3), so fast/ESD-type surges are covered. A SLOW, sustained")
print("   high-current overvoltage is the residual gap: L3 has no impedance at DC.")
print("   For guaranteed protection, relocate TVS1 to the buck VIN node (after L3)")
print("   so it clamps the node the buck actually sees, or use a 40-60 V buck.")

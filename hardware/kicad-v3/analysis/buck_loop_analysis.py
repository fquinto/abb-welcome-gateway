#!/usr/bin/env python3
"""
TPS5430 control-loop stability analysis for the abb-welcome-gateway v3 board.

Purpose
-------
Predict, before fabrication, whether the bus-powered 28 V -> 3.3 V buck
(U1 = TPS5430, L2 = 100 uH, ~590 uF electrolytic/tantalum bulk) is stable,
and quantify the two pre-fab concerns recorded in docs/STATUS.md:
  1. L2 = 100 uH sits at the top of the TPS5430's allowed range; is the loop
     still well behaved, or too slow / marginal?
  2. Is swapping the output bulk for low-ESR ceramics safe? (spoiler: no)

Method
------
The TPS5430 is a voltage-mode buck with a FIXED internal type-III compensation
network. Its transfer function is published in the datasheet (SLVS632, Eq.15):
    zeros  fz1 = 2170 Hz, fz2 = 2590 Hz
    poles  fp0 = 2165 Hz (integrator), fp1 = 24 kHz, fp2 = 54 kHz, fp3 = 440 kHz
We combine that with the buck power stage built from the REAL output-cap network
(each cap as ESR + 1/sC in parallel) and calibrate the one unknown constant
(the feed-forward modulator gain VIN/Vramp) so the datasheet's own worked
example (Vout=5 V, L=15 uH, C=220 uF, ESR=40 mR) crosses 0 dB at 18 kHz.
The same constant is then applied to this board.

IMPORTANT: this is a MODEL to guide the bench measurement, not a replacement.
Absolute phase-margin numbers carry roughly +-15 deg of modelling/tolerance
uncertainty; the trends (stable across ESR and load, ceramics bad) are robust.
The ESR values below are datasheet-typical estimates and are swept on purpose,
because the electrolytic ESR (which sets the crossover here) drifts with
temperature, frequency and age.

Run:  python3 buck_loop_analysis.py     (needs numpy, scipy, matplotlib)
"""
import numpy as np

TWO_PI = 2 * np.pi
VREF = 1.221          # TPS5430 feedback reference (datasheet)
FSW = 500e3           # fixed switching frequency

# ---- internal type-III compensation, datasheet SLVS632 Eq.15 ----
FZ = (2170.0, 2590.0)
FP = (2165.0, 24e3, 54e3, 440e3)         # fp0 is the integrator (origin) pole
WZ = [TWO_PI * f for f in FZ]
WP = [TWO_PI * f for f in FP]


def Hcomp(s):
    num = (1 + s / WZ[0]) * (1 + s / WZ[1])
    den = (s / WP[0]) * (1 + s / WP[1]) * (1 + s / WP[2]) * (1 + s / WP[3])
    return num / den


def zcap(s, caps):
    """Impedance of the parallel output-cap network; caps = [(C, ESR), ...]."""
    y = 0
    for C, ESR in caps:
        y = y + 1.0 / (ESR + 1.0 / (s * C))
    return 1.0 / y


def loop(f, Kff, Vout, L, RL, caps, Rload):
    """Open-loop gain T(jw) = Hcomp * (feed-forward modulator + LC filter) * beta."""
    s = 1j * TWO_PI * f
    Zc = zcap(s, caps)
    Zcl = Zc * Rload / (Zc + Rload)          # cap network || load
    Hfilt = Zcl / (s * L + RL + Zcl)         # PH(avg) -> Vout
    beta = VREF / Vout                        # feedback divider ratio
    return Hcomp(s) * (Kff * Hfilt) * beta    # Kff folds VIN/Vramp (feed-forward)


def margins(Kff, Vout, L, RL, caps, Rload, fmin=10, fmax=2e6, n=200000):
    f = np.logspace(np.log10(fmin), np.log10(fmax), n)
    T = loop(f, Kff, Vout, L, RL, caps, Rload)
    mag, ph = np.abs(T), np.unwrap(np.angle(T)) * 180 / np.pi
    fco = pm = gm = None
    dn = np.where((mag[:-1] >= 1) & (mag[1:] < 1))[0]     # 0 dB crossing (falling)
    if len(dn):
        i = dn[-1]
        fco = 10 ** np.interp(0, [np.log10(mag[i + 1]), np.log10(mag[i])],
                                 [np.log10(f[i + 1]), np.log10(f[i])])
        pm = 180 + np.interp(np.log10(fco), np.log10(f), ph)
    p180 = np.where((ph[:-1] >= -180) & (ph[1:] < -180))[0]
    if len(p180):
        j = p180[-1]
        f180 = 10 ** np.interp(-180, [ph[j + 1], ph[j]],
                                     [np.log10(f[j + 1]), np.log10(f[j])])
        gm = -20 * np.interp(np.log10(f180), np.log10(f), np.log10(mag))
    return fco, pm, gm, f, mag, ph


# --- calibrate the feed-forward modulator gain against the datasheet example ---
EX = dict(Vout=5.0, L=15e-6, RL=0.03, caps=[(220e-6, 0.040)], Rload=5.0 / 3.0)
lo, hi = 1e-3, 1e3
for _ in range(80):
    mid = np.sqrt(lo * hi)
    fc = margins(mid, **EX)[0]
    if fc is None or fc < 18e3:
        lo = mid
    else:
        hi = mid
KFF = np.sqrt(lo * hi)

# ---------- actual board ----------
VOUT, L2, RL2 = 3.3, 100e-6, 0.6         # RL2 = SMMS0650-101M DCR (assumed ~0.6 R)


def caps_at(esr_c19):
    # C19 470uF Al electrolytic, C6 100uF Ta, C2 & C4 10uF Ta
    return [(470e-6, esr_c19), (100e-6, 1.2), (10e-6, 3.0), (10e-6, 3.0)]


def main():
    print(f"Calibrated modulator gain VIN/Vramp = {KFF:.2f} "
          f"(datasheet example fCO = {margins(KFF, **EX)[0] / 1e3:.1f} kHz, target 18)\n")

    fLC = 1 / (TWO_PI * np.sqrt(L2 * 590e-6))
    print(f"Power stage: L2=100uH, Cbulk=590uF, Vout=3.3V")
    print(f"  LC double pole    fLC = {fLC:.0f} Hz")
    print(f"  TI Eq.7 (LC-only) fCO = {fLC**2 / (85 * VOUT):.0f} Hz  "
          f"[pessimistic: ignores the electrolytic ESR zero]\n")

    print("Stability vs C19 ESR (the parameter that sets the crossover here):")
    print(f"  {'ESR_C19(R)':>10} {'fCO(Hz)':>8} {'PM(deg)':>8} {'GM(dB)':>7}  verdict")
    for esr in (0.05, 0.08, 0.10, 0.12, 0.15, 0.20):
        fco, pm, gm, *_ = margins(KFF, VOUT, L2, RL2, caps_at(esr), VOUT / 0.3)
        v = "GOOD" if pm >= 45 else ("marginal" if pm >= 30 else "LOW")
        print(f"  {esr:>10.2f} {fco:>8.0f} {pm:>8.1f} {gm:>7.1f}  {v}")

    print("\nStability vs load current (ESR_C19=0.10 R):")
    print(f"  {'Iload(A)':>8} {'fCO(Hz)':>8} {'PM(deg)':>8}")
    for Il in (0.10, 0.30, 0.50, 1.0, 2.0):
        fco, pm, *_ = margins(KFF, VOUT, L2, RL2, caps_at(0.10), VOUT / Il)
        print(f"  {Il:>8.2f} {fco:>8.0f} {pm:>8.1f}")

    print("\nWARNING check - output bulk swapped for low-ESR ceramics:")
    for label, caps in (("590uF ceramic ~4mR", [(470e-6, .004), (100e-6, .004),
                                                 (10e-6, .004), (10e-6, .004)]),
                        ("220uF ceramic ~5mR", [(220e-6, .005)])):
        fco, pm, gm, *_ = margins(KFF, VOUT, L2, RL2, caps, VOUT / 0.3)
        note = "UNSTABLE/ringy" if pm < 30 else "ok"
        print(f"  {label:20} fCO={fco:>6.0f}Hz  PM={pm:>5.1f}  GM={gm:>5.1f}dB -> {note}")

    _bode(caps_at(0.10))


def _bode(caps):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fco, pm, gm, f, mag, ph = margins(KFF, VOUT, L2, RL2, caps, VOUT / 0.3)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(8, 7), sharex=True)
    for ax in (a1, a2):
        ax.axvspan(3e3, 30e3, color="green", alpha=0.08)     # TI recommended window
        ax.axvline(fco, color="tab:red", ls="--", lw=0.9)
        ax.grid(True, which="both", alpha=0.3)
    a1.semilogx(f, 20 * np.log10(mag), color="tab:blue")
    a1.axhline(0, color="k", lw=0.6)
    a1.set_ylabel("Loop gain (dB)")
    a1.set_ylim(-40, 80)
    a1.set_title(f"TPS5430 loop (model) - L=100uH, C=590uF, Vout=3.3V\n"
                 f"fCO={fco:.0f} Hz, PM={pm:.0f} deg, GM={gm:.0f} dB   "
                 f"(green = TI 3-30 kHz window)")
    a2.semilogx(f, ph, color="tab:orange")
    a2.axhline(-180, color="k", lw=0.6)
    a2.set_ylabel("Phase (deg)")
    a2.set_xlabel("Frequency (Hz)")
    a2.set_ylim(-270, 0)
    fig.tight_layout()
    fig.savefig("tps5430_bode.png", dpi=130)
    print("\nBode plot written to tps5430_bode.png")


if __name__ == "__main__":
    main()

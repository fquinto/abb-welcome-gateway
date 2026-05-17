// Parse the numeric value of a passive from its MPN. EasyEDA's `Value` field
// is unreliable in this project (often just the column name "Value" or
// "Resistance (Ohms)"), so we go to the manufacturer part number.
//
// All values returned as strings ready for tscircuit ("10k", "100n", "1u").

// Resistors: typical 4-digit code is the EIA-96 form: first 3 digits significand,
// 4th digit is the power-of-10 multiplier. e.g. 1002 → 100 × 10² = 10kΩ.
// 3-digit code: first 2 digits significand, 3rd is multiplier. 103 → 10 × 10³ = 10k.
export function resistanceFromMpn(mpn) {
    if (!mpn) return null;
    // UniOhm series: 0603WAF1002T5E (1% F-tol, 100×10² = 10k).
    let m = mpn.match(/^[0-9]{4}WAF(\d{3,4})/);
    if (m) return formatOhms(decodeEia(m[1]));
    // FRC power resistors: FRC2512F8200TS (1% F, 820 × 10⁰ = 820).
    m = mpn.match(/^FRC\d{4}[FJ](\d{3,4})/);
    if (m) return formatOhms(decodeEia(m[1]));
    // Generic fallback: any 3- or 4-digit code somewhere in the part.
    m = mpn.match(/(\d{3,4})/);
    if (m) return formatOhms(decodeEia(m[1]));
    return null;
}

function decodeEia(code) {
    if (code.length === 4) {
        const sig = parseInt(code.slice(0, 3), 10);
        const exp = parseInt(code[3], 10);
        return sig * Math.pow(10, exp);
    }
    if (code.length === 3) {
        const sig = parseInt(code.slice(0, 2), 10);
        const exp = parseInt(code[2], 10);
        return sig * Math.pow(10, exp);
    }
    return null;
}

function formatOhms(ohms) {
    if (ohms == null) return null;
    if (ohms >= 1e6) return (ohms / 1e6) + "M";
    if (ohms >= 1e3) return (ohms / 1e3) + "k";
    return String(ohms);
}

// Capacitors. Two MPN styles:
//   (a) EIA-coded ceramic / film: CC0603KRX7R9BB104, CL10B683KB8NNNC, 0603B103K500NT.
//       The 3-digit code maps significand × 10^exp pF.
//   (b) Explicit value in µF in the part name: RVT470UF16V67RV0031 (470µF, 16V),
//       VEJ101M1HTR-0810 (101 = 100 µF, "M" = ±20% — value is in µF here,
//       not pF, because tantalum/aluminium electrolytics use µF coding).
export function capacitanceFromMpn(mpn) {
    if (!mpn) return null;
    // (b) Explicit µF in the MPN
    let m = mpn.match(/(\d+(?:\.\d+)?)\s*UF/i);
    if (m) return parseFloat(m[1]) + "uF";

    // (b') Electrolytic series (RVT, VEJ, EEE, RV*, UVR, etc.) where the
    // 3-digit code right after the prefix encodes value in µF, not pF.
    m = mpn.match(/^(?:RVT|VEJ|EEE|UVR|RV[A-Z]?)(\d{3})/i);
    if (m) {
        const pf = decodeEia(m[1]);
        return pf == null ? null : pf + "uF";
    }

    // (c) Tantalum (TAJA106…, TAJB107…) where the 3-digit code after the
    // case letter is the EIA pF code (same as ceramics). Take the FIRST hit
    // — the trailing 3-digit chunk before "RNJ" is the rating sub-code.
    m = mpn.match(/^TAJ[A-D](\d{3})/);
    if (m) return formatFarads(decodeEia(m[1]));

    // (a) Ceramic EIA-code, in pF. Take the FIRST 3-digit run flanked by
    // letters/boundary. Subsequent runs are usually voltage rating
    // ("500" = 50.0 V in 0603B103K500NT) or other suffixes.
    const hits = [...mpn.matchAll(/([A-Z])(\d{3})(?=[A-Z]|$|_)/g)];
    if (hits.length === 0) return null;
    const code = hits[0][2];
    const pf = decodeEia(code);
    return formatFarads(pf);
}

function formatFarads(pf) {
    if (pf == null) return null;
    if (pf >= 1e6) return (pf / 1e6) + "uF";
    if (pf >= 1e3) return (pf / 1e3) + "nF";
    return pf + "pF";
}

// Inductors: same idea, value in nH or µH. Hard to parse generically; we make
// best-effort.
export function inductanceFromMpn(mpn) {
    if (!mpn) return null;
    // SMMS0650-101M → 100 nH. ACT45B-510 → choke (no single inductance).
    const m = mpn.match(/-(\d{3})M/);
    if (m) return formatHenries(decodeEia(m[1]));
    return null;
}

function formatHenries(nh) {
    if (nh == null) return null;
    if (nh >= 1e6) return (nh / 1e6) + "mH";
    if (nh >= 1e3) return (nh / 1e3) + "uH";
    return nh + "nH";
}

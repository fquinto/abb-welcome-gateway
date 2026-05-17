// Map an EasyEDA `package` string to a tscircuit footprinter string. The
// footprinter (https://github.com/tscircuit/footprinter) draws a generic 3D
// model from this name, so the viewer needs no external URL — fetching the
// `model_obj_url` from EasyEDA fails due to CORS / auth.
//
// Returns null when no clean footprinter string is known for the package.
// In that case the caller should drop `model_obj_url` / `model_step_url`
// anyway (to avoid the network error) and let the viewer fall back to a
// generic box derived from `size`.

// IMPORTANT: the 3D dispatcher in jscad-electronics' Footprinter3d.tsx maps
// the parsed `fn` to a case. Bare `0603` parses to `fn="res"`, but there is
// no `case "res"` in that file — only `case "cap"`. So we MUST emit explicit
// prefixes (`res0603` / `cap0603` / `led0603`) based on the component kind.
// Likewise `sot23` doesn't exist as a case; we have to use `sot23w`.

const RE_RC = /^[RC](\d{4})$/;
const RE_LED = /^LED(\d{4})/;
const RE_SOT23_3 = /^SOT-?23-?3/;
const RE_SOT23_5 = /^SOT-?23-?5/;
const RE_SOT223 = /^SOT-?223/;

// `lib` carries package + spicePre so we can disambiguate R from C from LED
// even when their packages share the same imperial size.
export function pickFootprinter(lib) {
    if (!lib) return null;
    const pkg = lib.package || "";
    const spicePre = (lib.spicePre || "").toUpperCase();
    const p = pkg.toUpperCase();

    let m;

    // LEDs: the `ledNNNN` dispatcher in jscad-electronics requires explicit
    // `_p`/`_pw`/`_ph` params and errors out without them ("could not
    // determine pad dimensions"). Until we have those defaults, fall back to
    // the cap variant — same imperial body, renders cleanly.
    if ((m = p.match(RE_LED))) return `cap${m[1]}`;

    // Imperial passives (R0603 / C0805 / etc.).
    if ((m = p.match(RE_RC))) {
        const size = m[1];
        const kind = pkg[0].toUpperCase();
        return kind === "R" ? `res${size}` : `cap${size}`;
    }

    // SMD fuses share the imperial body of their footprint.
    if (p.startsWith("F1206")) return "cap1206";

    // Tantalum cases (CASE-A is 1206-ish, CASE-B is 1210-ish, etc.). Treat
    // them all as caps because that's the spice prefix.
    if (p.startsWith("CASE-A")) return "cap0805";
    if (p.startsWith("CASE-B")) return "cap1210";
    if (p.startsWith("CASE-C")) return "cap1411";
    if (p.startsWith("CASE-D")) return "cap1815";
    if (p.startsWith("CAP-SMD_L3.2-W1.6")) return "cap1206";  // 3.2×1.6 ≈ 1206

    // Power resistor 2512 (this one DOES dispatch even without prefix in some
    // cached viewers, but we still send the explicit prefix for safety).
    if (p === "R2512" || p.startsWith("R2512")) return "res2512";
    if (p.startsWith("R2010")) return "res2010";

    // Transistors. The dispatcher has `sot23w`, `sot323`, `sot223`, etc., but
    // NOT plain `sot23`. Use the wide variant for SOT-23-3.
    if (RE_SOT23_3.test(p)) return "sot23w";
    if (RE_SOT23_5.test(p)) return "sot23_5";
    if (RE_SOT223.test(p)) return "sot223";

    // Diodes — these names DO exist in the dispatcher.
    if (p.startsWith("SOD-323") || p.startsWith("SOD323")) return "sod323";
    if (p.startsWith("SOD-123") || p.startsWith("SOD123")) return "sod123";
    if (p.startsWith("SMA")) return "sma";

    // ICs
    if (p.startsWith("SOIC-8") || p.startsWith("SOIC8")) return "soic8";
    if (p.startsWith("ESOP-8") || p.startsWith("ESOP8")) return "soic8";
    if (p.startsWith("MSOP-8")) return "msop8";
    if (p.startsWith("TSSOP-8")) return "tssop8";

    // Through-hole 2-pin connectors fall through with no footprinter — the
    // viewer skips them silently (no cuboid fallback today). User must host
    // a model URL or accept they're not visible in 3D.
    return null;

    // Anything else (terminal blocks, antennas, custom inductor / cap shapes)
    // — let the viewer fall back to the bounding-box cube.
    return null;
}

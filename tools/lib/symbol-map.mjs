// Pick a tscircuit `symbol_name` for each EasyEDA LIB based on its
// spicePre/MPN/package. Direction suffix (_left/_right/_up/_down) is chosen
// from pin layout, falling back to _right when unclear.

function direction(lib) {
    const pins = lib.pins;
    if (pins.length < 2) return "right";
    const p1 = pins.find(p => String(p.pinNumber) === "1") ?? pins[0];
    const p2 = pins.find(p => String(p.pinNumber) === "2") ?? pins[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    // EasyEDA Y is screen-down: dy>0 means pin2 is visually below pin1.
    // After flipping to math axes, "down" stays "down".
    return dy >= 0 ? "down" : "up";
}

function isPolarizedCap(lib) {
    if (!lib.mpn) return false;
    // Tantalum (TAJ*), aluminium electrolytics (RV*, VEJ*, CL31* polymer): treat as polarized.
    return /^(TAJ|VEJ|RV|EEE|UVR)/i.test(lib.mpn) || /CASE-B|CASE-C|CAP-SMD_BD/.test(lib.package ?? "");
}

function isLed(lib) {
    return (lib.package ?? "").toUpperCase().startsWith("LED");
}

function isMosfet(lib) {
    return /2N7002|AO[0-9]+|BSS|IRF|FDS|SI[0-9]+|SQ[0-9]+/i.test(lib.mpn ?? "");
}

function isPnp(lib) {
    return /S8550|2N3906|MMBT3906|BC857|PMBT3906/i.test(lib.mpn ?? "");
}
function isNpn(lib) {
    return /S8050|2N3904|MMBT3904|BC847|PMBT3904|BC817/i.test(lib.mpn ?? "");
}

export function pickSymbolName(lib) {
    const pre = lib.spicePre;
    const dir = direction(lib);

    if (pre === "R") return `boxresistor_${dir}`;
    if (pre === "C") return isPolarizedCap(lib) ? `capacitor_polarized_${dir}` : `capacitor_${dir}`;
    if (pre === "L") return `inductor_${dir}`;
    if (pre === "F") return `fuse_${dir}`;
    if (pre === "D") return isLed(lib) ? `led_${dir}` : `diode_${dir}`;
    if (pre === "Q") {
        if (isMosfet(lib)) return `mosfet_n_channel_${dir === "left" || dir === "right" ? "horz" : "vert"}`;
        if (isPnp(lib)) return `pnp_bipolar_transistor_${dir === "left" || dir === "right" ? "horz" : "vert"}`;
        if (isNpn(lib)) return `npn_bipolar_transistor_${dir === "left" || dir === "right" ? "horz" : "vert"}`;
    }
    if (pre === "SW") return null; // tscircuit auto-shapes pushbuttons; let the box render
    return null; // chips, headers, unknown: render as a box
}

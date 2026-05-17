// Per-LCSC pin label maps for IC parts. The numbers are the physical pin
// numbers as they appear in the EasyEDA footprint; the strings are the
// datasheet pin names that we want tscircuit to display in the schematic.

// Texas Instruments TPS5430DDAR — 8-pin SOIC (HSOP-PowerPad). Pin 9 is the
// exposed thermal pad (ties to GND). LCSC C9864.
const TPS5430DDAR = {
    "1": "BOOT",
    "2": "VIN",
    "3": "EN",
    "4": "GND",
    "5": "VSENSE",
    "6": "PH",
    "7": "PH",
    "8": "NC",
    "9": "EPAD", // exposed pad
};

// Espressif ESP32-SOLO-1 module — 38 leaded pads + a thermal pad. LCSC C473005.
// Names follow Espressif datasheet (rev v1.x), with the GPIO number when the
// pin is multiplexed.
const ESP32_SOLO_1 = {
    "1": "GND",
    "2": "V3V3",       // V3V3 instead of 3V3 (tscircuit nets can't start with a digit)
    "3": "EN",
    "4": "SENSOR_VP",  // GPIO36
    "5": "SENSOR_VN",  // GPIO39
    "6": "GPIO34",
    "7": "GPIO35",
    "8": "GPIO32",
    "9": "GPIO33",
    "10": "GPIO25",
    "11": "GPIO26",
    "12": "GPIO27",
    "13": "GPIO14",
    "14": "GPIO12",
    "15": "GND",
    "16": "GPIO13",
    "17": "SHD_SD2",   // GPIO9
    "18": "SWP_SD3",   // GPIO10
    "19": "SCS_CMD",   // GPIO11
    "20": "SCK_CLK",   // GPIO6
    "21": "SDO_SD0",   // GPIO7
    "22": "SDI_SD1",   // GPIO8
    "23": "GPIO15",
    "24": "GPIO2",
    "25": "GPIO0",
    "26": "GPIO4",
    "27": "GPIO16",
    "28": "GPIO17",
    "29": "GPIO5",
    "30": "GPIO18",
    "31": "GPIO19",
    "32": "NC",
    "33": "GPIO21",
    "34": "RXD0",      // GPIO3
    "35": "TXD0",      // GPIO1
    "36": "GPIO22",
    "37": "GPIO23",
    "38": "GND",
    "39": "GND",       // thermal pad
};

export const CHIP_PINOUTS = {
    C9864: TPS5430DDAR,
    C473005: ESP32_SOLO_1,
};

export function getPinLabels(lcsc) {
    return CHIP_PINOUTS[lcsc] || null;
}

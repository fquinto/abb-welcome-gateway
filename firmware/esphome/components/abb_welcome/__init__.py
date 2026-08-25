"""ABB-Welcome / Busch-Welcome 2-wire bus hub component."""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome import pins
from esphome.const import CONF_ID

CONF_ABB_WELCOME_ID = "abb_welcome_id"
CONF_RX_PIN = "rx_pin"
CONF_TX_PIN = "tx_pin"
CONF_ADDRESS = "address"

abb_welcome_ns = cg.esphome_ns.namespace("abb_welcome")
AbbWelcomeBus = abb_welcome_ns.class_("AbbWelcomeBus", cg.Component)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(AbbWelcomeBus),
        cv.Required(CONF_RX_PIN): pins.internal_gpio_input_pin_schema,
        cv.Required(CONF_TX_PIN): pins.gpio_output_pin_schema,
        cv.Optional(CONF_ADDRESS, default=0): cv.int_range(min=0, max=255),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    rx = await cg.gpio_pin_expression(config[CONF_RX_PIN])
    cg.add(var.set_rx_pin(rx))
    tx = await cg.gpio_pin_expression(config[CONF_TX_PIN])
    cg.add(var.set_tx_pin(tx))
    cg.add(var.set_address(config[CONF_ADDRESS]))

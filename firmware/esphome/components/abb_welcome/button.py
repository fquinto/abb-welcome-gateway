"""Door-open button backed by the ABB-Welcome bus hub."""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import button

from . import CONF_ABB_WELCOME_ID, AbbWelcomeBus, abb_welcome_ns

OpenDoorButton = abb_welcome_ns.class_("OpenDoorButton", button.Button)

CONFIG_SCHEMA = button.button_schema(OpenDoorButton).extend(
    {
        cv.GenerateID(CONF_ABB_WELCOME_ID): cv.use_id(AbbWelcomeBus),
    }
)


async def to_code(config):
    var = await button.new_button(config)
    await cg.register_parented(var, config[CONF_ABB_WELCOME_ID])

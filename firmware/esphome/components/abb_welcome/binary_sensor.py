"""Doorbell binary sensor fed by the ABB-Welcome bus hub."""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import binary_sensor

from . import CONF_ABB_WELCOME_ID, AbbWelcomeBus

CONFIG_SCHEMA = binary_sensor.binary_sensor_schema().extend(
    {
        cv.GenerateID(CONF_ABB_WELCOME_ID): cv.use_id(AbbWelcomeBus),
    }
)


async def to_code(config):
    hub = await cg.get_variable(config[CONF_ABB_WELCOME_ID])
    sens = await binary_sensor.new_binary_sensor(config)
    cg.add(hub.set_doorbell_sensor(sens))

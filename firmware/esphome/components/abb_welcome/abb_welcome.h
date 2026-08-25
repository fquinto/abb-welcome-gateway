#pragma once

#include "esphome/core/component.h"
#include "esphome/core/defines.h"
#include "esphome/core/gpio.h"
#include "esphome/core/hal.h"

#ifdef USE_BINARY_SENSOR
#include "esphome/components/binary_sensor/binary_sensor.h"
#endif

namespace esphome {
namespace abb_welcome {

// Ring buffer size for RX edge timestamps captured in the ISR.
static const uint8_t EDGE_BUFFER_SIZE = 64;

/// Hub for the ABB-Welcome / Busch-Welcome 2-wire bus.
///
/// Hardware mapping on the gateway board:
///  - rx_pin (GPIO4): digital bus RX, already Schmitt-buffered (74LVC1G14).
///  - tx_pin (GPIO5): gate of the open-drain TX driver chain.
///
/// The bus protocol decoder is under development: the ISR currently captures
/// edge timestamps into a ring buffer and the loop() drains it, which is the
/// substrate the frame parser will be built on.
class AbbWelcomeBus : public Component {
 public:
  void set_rx_pin(InternalGPIOPin *pin) { this->rx_pin_ = pin; }
  void set_tx_pin(GPIOPin *pin) { this->tx_pin_ = pin; }
  void set_address(uint8_t address) { this->address_ = address; }

#ifdef USE_BINARY_SENSOR
  void set_doorbell_sensor(binary_sensor::BinarySensor *sensor) { this->doorbell_sensor_ = sensor; }
#endif

  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::DATA; }

  /// Send the door-open command on the bus. TODO: protocol implementation.
  void send_open_door();

 protected:
  static void gpio_isr(AbbWelcomeBus *self);

  InternalGPIOPin *rx_pin_{nullptr};
  GPIOPin *tx_pin_{nullptr};
  uint8_t address_{0};

#ifdef USE_BINARY_SENSOR
  binary_sensor::BinarySensor *doorbell_sensor_{nullptr};
#endif

  ISRInternalGPIOPin rx_isr_pin_;
  // Edge timestamps (us), written by the ISR, drained in loop().
  volatile uint32_t edge_times_[EDGE_BUFFER_SIZE];
  volatile uint8_t edge_write_{0};
  uint8_t edge_read_{0};
  uint32_t edges_seen_{0};
  uint32_t last_activity_log_{0};
};

}  // namespace abb_welcome
}  // namespace esphome

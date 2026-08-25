#include "abb_welcome.h"
#include "esphome/core/log.h"

namespace esphome {
namespace abb_welcome {

static const char *const TAG = "abb_welcome";

void AbbWelcomeBus::setup() {
  this->rx_pin_->setup();
  this->rx_isr_pin_ = this->rx_pin_->to_isr();
  this->rx_pin_->attach_interrupt(AbbWelcomeBus::gpio_isr, this, gpio::INTERRUPT_ANY_EDGE);

  this->tx_pin_->setup();
  this->tx_pin_->digital_write(false);  // TX driver idle (open-drain chain off)
}

void IRAM_ATTR AbbWelcomeBus::gpio_isr(AbbWelcomeBus *self) {
  const uint8_t next = (self->edge_write_ + 1) % EDGE_BUFFER_SIZE;
  if (next == self->edge_read_)
    return;  // buffer full, drop the edge
  self->edge_times_[self->edge_write_] = micros();
  self->edge_write_ = next;
}

void AbbWelcomeBus::loop() {
  // Drain captured edges. The frame decoder will be built here; for now we
  // keep a throttled activity log so the RX path can be validated on real
  // hardware with nothing but this skeleton.
  while (this->edge_read_ != this->edge_write_) {
    this->edge_read_ = (this->edge_read_ + 1) % EDGE_BUFFER_SIZE;
    this->edges_seen_++;
  }

  const uint32_t now = millis();
  if (this->edges_seen_ != 0 && now - this->last_activity_log_ > 1000) {
    ESP_LOGD(TAG, "Bus activity: %u edges in the last second", this->edges_seen_);
    this->edges_seen_ = 0;
    this->last_activity_log_ = now;
  }
}

void AbbWelcomeBus::dump_config() {
  ESP_LOGCONFIG(TAG, "ABB-Welcome bus:");
  LOG_PIN("  RX pin: ", this->rx_pin_);
  LOG_PIN("  TX pin: ", this->tx_pin_);
  ESP_LOGCONFIG(TAG, "  Address: 0x%02X", this->address_);
  ESP_LOGCONFIG(TAG, "  Protocol decoder: not implemented yet");
}

void AbbWelcomeBus::send_open_door() {
  // TODO(protocol): build and transmit the door-open frame for address_.
  ESP_LOGW(TAG, "send_open_door(): bus protocol not implemented yet");
}

}  // namespace abb_welcome
}  // namespace esphome

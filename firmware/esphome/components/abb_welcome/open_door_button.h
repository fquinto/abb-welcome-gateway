#pragma once

#include "esphome/components/button/button.h"
#include "esphome/core/helpers.h"
#include "abb_welcome.h"

namespace esphome {
namespace abb_welcome {

class OpenDoorButton : public button::Button, public Parented<AbbWelcomeBus> {
 protected:
  void press_action() override { this->parent_->send_open_door(); }
};

}  // namespace abb_welcome
}  // namespace esphome

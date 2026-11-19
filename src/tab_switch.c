// SPDX-License-Identifier: GPL-2.0-or-later
#define DT_DRV_COMPAT torabo_behavior_tab_switch

#include <zephyr/device.h>
#include <drivers/behavior.h>
#include <zmk/behavior.h>
#include <zmk/events/keycode_state_changed.h>
#include <zmk/keymap.h>

#if DT_HAS_COMPAT_STATUS_OKAY(DT_DRV_COMPAT)

// Gesture shortcuts are invoked as sequential press/release pairs.
static uint32_t pressed_keycode;

static int press_tab(struct zmk_behavior_binding *binding,
                     struct zmk_behavior_binding_event event) {
    pressed_keycode = zmk_keymap_layer_active(DT_INST_PROP(0, mac_layer))
                          ? binding->param2
                          : binding->param1;
    return raise_zmk_keycode_state_changed_from_encoded(pressed_keycode, true, event.timestamp);
}

static int release_tab(struct zmk_behavior_binding *binding,
                       struct zmk_behavior_binding_event event) {
    // Release the same shortcut even if the OS layer changed during the tap.
    return raise_zmk_keycode_state_changed_from_encoded(pressed_keycode, false, event.timestamp);
}

static const struct behavior_driver_api tab_api = {
    .locality = BEHAVIOR_LOCALITY_CENTRAL,
    .binding_pressed = press_tab,
    .binding_released = release_tab,
};

BEHAVIOR_DT_INST_DEFINE(0, NULL, NULL, NULL, NULL, POST_KERNEL,
                        CONFIG_KERNEL_INIT_PRIORITY_DEFAULT, &tab_api);
#endif

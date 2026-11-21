// SPDX-License-Identifier: GPL-2.0-or-later
#define DT_DRV_COMPAT torabo_behavior_thumb_shift

#include <zephyr/device.h>
#include <drivers/behavior.h>
#include <dt-bindings/zmk/keys.h>
#include <zmk/behavior.h>
#include <zmk/events/keycode_state_changed.h>
#include <zmk/keymap.h>

#if DT_HAS_COMPAT_STATUS_OKAY(DT_DRV_COMPAT)

static const struct zmk_behavior_binding gesture = {
    .behavior_dev = DEVICE_DT_NAME(DT_INST_PHANDLE(0, gesture_behavior)),
};

static int press_shift(struct zmk_behavior_binding *binding,
                       struct zmk_behavior_binding_event event) {
    int err = raise_zmk_keycode_state_changed_from_encoded(LEFT_SHIFT, true, event.timestamp);
    if (err < 0) {
        return err;
    }
    err = zmk_keymap_layer_activate(DT_INST_PROP(0, gesture_layer));
    if (err < 0) {
        raise_zmk_keycode_state_changed_from_encoded(LEFT_SHIFT, false, event.timestamp);
        return err;
    }
    err = zmk_behavior_invoke_binding(&gesture, event, true);
    if (err < 0) {
        zmk_keymap_layer_deactivate(DT_INST_PROP(0, gesture_layer));
        raise_zmk_keycode_state_changed_from_encoded(LEFT_SHIFT, false, event.timestamp);
    }
    return err;
}

static int release_shift(struct zmk_behavior_binding *binding,
                         struct zmk_behavior_binding_event event) {
    // Always release Shift, even if gesture cleanup fails.
    int gesture_err = zmk_behavior_invoke_binding(&gesture, event, false);
    int layer_err = zmk_keymap_layer_deactivate(DT_INST_PROP(0, gesture_layer));
    int shift_err =
        raise_zmk_keycode_state_changed_from_encoded(LEFT_SHIFT, false, event.timestamp);
    return gesture_err < 0 ? gesture_err : layer_err < 0 ? layer_err : shift_err;
}

static const struct behavior_driver_api thumb_api = {
    .locality = BEHAVIOR_LOCALITY_CENTRAL,
    .binding_pressed = press_shift,
    .binding_released = release_shift,
#if IS_ENABLED(CONFIG_ZMK_BEHAVIOR_METADATA)
    .get_parameter_metadata = zmk_behavior_get_empty_param_metadata,
#endif
};

BEHAVIOR_DT_INST_DEFINE(0, NULL, NULL, NULL, NULL, POST_KERNEL,
                        CONFIG_KERNEL_INIT_PRIORITY_DEFAULT, &thumb_api);
#endif

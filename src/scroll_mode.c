// SPDX-License-Identifier: GPL-2.0-or-later
#define DT_DRV_COMPAT torabo_behavior_scroll_mode

#include <errno.h>
#include <zephyr/device.h>
#include <zephyr/sys/atomic.h>
#include <zephyr/dt-bindings/input/input-event-codes.h>
#include <drivers/behavior.h>
#include <drivers/input_processor.h>
#include <zmk/behavior.h>
#include <zmk/event_manager.h>
#include <zmk/events/layer_state_changed.h>

#if DT_HAS_COMPAT_STATUS_OKAY(DT_DRV_COMPAT)

enum scroll_axis_mode { SCROLL_FREE, SCROLL_VERTICAL, SCROLL_HORIZONTAL };
static atomic_t selected_mode = ATOMIC_INIT(SCROLL_FREE);
static const uint8_t scroll_layers[] = DT_INST_PROP(0, scroll_layers);

static int select_mode(struct zmk_behavior_binding *binding,
                       struct zmk_behavior_binding_event event) {
    if (binding->param1 > SCROLL_HORIZONTAL) {
        return -EINVAL;
    }
    atomic_set(&selected_mode, binding->param1);
    return ZMK_BEHAVIOR_OPAQUE;
}

static int release_mode(struct zmk_behavior_binding *binding,
                        struct zmk_behavior_binding_event event) {
    // A tap selects the mode; releasing H/J/K must not undo it.
    return ZMK_BEHAVIOR_OPAQUE;
}

static int reset_mode(const zmk_event_t *event) {
    const struct zmk_layer_state_changed *change = as_zmk_layer_state_changed(event);
    if (change != NULL) {
        for (size_t i = 0; i < ARRAY_SIZE(scroll_layers); i++) {
            if (change->layer == scroll_layers[i]) {
                atomic_set(&selected_mode, SCROLL_FREE);
                break;
            }
        }
    }
    return ZMK_EV_EVENT_BUBBLE;
}

ZMK_LISTENER(scroll_mode_reset, reset_mode);
ZMK_SUBSCRIPTION(scroll_mode_reset, zmk_layer_state_changed);

#if IS_ENABLED(CONFIG_ZMK_BEHAVIOR_METADATA)
static const struct behavior_parameter_value_metadata modes[] = {
    {.display_name = "Free", .type = BEHAVIOR_PARAMETER_VALUE_TYPE_VALUE, .value = SCROLL_FREE},
    {.display_name = "Vertical", .type = BEHAVIOR_PARAMETER_VALUE_TYPE_VALUE,
     .value = SCROLL_VERTICAL},
    {.display_name = "Horizontal", .type = BEHAVIOR_PARAMETER_VALUE_TYPE_VALUE,
     .value = SCROLL_HORIZONTAL},
};
static const struct behavior_parameter_metadata_set mode_sets[] = {
    {.param1_values = modes, .param1_values_len = ARRAY_SIZE(modes)},
};
static const struct behavior_parameter_metadata mode_metadata = {
    .sets = mode_sets, .sets_len = ARRAY_SIZE(mode_sets),
};
#endif

static const struct behavior_driver_api mode_api = {
    .locality = BEHAVIOR_LOCALITY_CENTRAL,
    .binding_pressed = select_mode,
    .binding_released = release_mode,
#if IS_ENABLED(CONFIG_ZMK_BEHAVIOR_METADATA)
    .parameter_metadata = &mode_metadata,
#endif
};

BEHAVIOR_DT_INST_DEFINE(0, NULL, NULL, NULL, NULL, POST_KERNEL,
                        CONFIG_KERNEL_INIT_PRIORITY_DEFAULT, &mode_api);

#if DT_HAS_COMPAT_STATUS_OKAY(torabo_input_processor_scroll_axis)
static int filter_scroll(const struct device *dev, struct input_event *event,
                         uint32_t param1, uint32_t param2,
                         struct zmk_input_processor_state *state) {
    const atomic_val_t mode = atomic_get(&selected_mode);
    if (event->type == INPUT_EV_REL &&
        ((mode == SCROLL_VERTICAL && event->code == INPUT_REL_HWHEEL) ||
         (mode == SCROLL_HORIZONTAL && event->code == INPUT_REL_WHEEL))) {
        // Keep sync even when the last event in a report is on the suppressed axis.
        event->value = 0;
    }
    return ZMK_INPUT_PROC_CONTINUE;
}

static const struct zmk_input_processor_driver_api filter_api = {
    .handle_event = filter_scroll,
};

DEVICE_DT_DEFINE(DT_NODELABEL(scroll_axis_filter), NULL, NULL, NULL, NULL, POST_KERNEL,
                 CONFIG_KERNEL_INIT_PRIORITY_DEFAULT, &filter_api);
#endif
#endif

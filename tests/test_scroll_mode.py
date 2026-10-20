"""Host regression test of the actual C callbacks; requires gcc, not a Zephyr SDK.

The shim supplies ZMK/Zephyr types and registration macros only. This does not
replace a firmware build, devicetree validation, or testing the physical ball.
Run: python tests/test_scroll_mode.py
"""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SHIM = r"""
#pragma once
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))
#define IS_ENABLED(x) (x)
#define CONFIG_ZMK_BEHAVIOR_METADATA TEST_METADATA
#define DT_HAS_COMPAT_STATUS_OKAY(x) 1
#define DT_INST_PROP(n, prop) {10, 11}
#define DT_NODELABEL(x) 0
#define ZMK_BEHAVIOR_OPAQUE 0
#define ZMK_EV_EVENT_BUBBLE 0
#define ZMK_INPUT_PROC_CONTINUE 0
#define INPUT_EV_REL 2
#define INPUT_EV_KEY 1
#define INPUT_REL_X 0
#define INPUT_REL_Y 1
#define INPUT_REL_HWHEEL 6
#define INPUT_REL_WHEEL 8
#define ATOMIC_INIT(x) (x)
typedef long atomic_t;
typedef long atomic_val_t;
static inline void atomic_set(atomic_t *a, atomic_val_t v) { *a = v; }
static inline atomic_val_t atomic_get(const atomic_t *a) { return *a; }
struct device { int unused; };
struct input_event { uint8_t type; uint16_t code; int32_t value; uint8_t sync; };
struct zmk_input_processor_state { uint8_t input_device_index; int16_t *remainder; };
struct zmk_behavior_binding { uint32_t param1, param2; };
struct zmk_behavior_binding_event { int64_t timestamp; uint32_t position; };
struct zmk_layer_state_changed { uint8_t layer; bool state; int64_t timestamp; };
typedef struct zmk_layer_state_changed zmk_event_t;
static inline const struct zmk_layer_state_changed *
as_zmk_layer_state_changed(const zmk_event_t *e) { return e; }
enum { BEHAVIOR_LOCALITY_CENTRAL, BEHAVIOR_PARAMETER_VALUE_TYPE_VALUE };
struct behavior_parameter_value_metadata {
    char *display_name; int type; uint32_t value;
};
struct behavior_parameter_metadata_set {
    size_t param1_values_len;
    const struct behavior_parameter_value_metadata *param1_values;
};
struct behavior_parameter_metadata {
    size_t sets_len; const struct behavior_parameter_metadata_set *sets;
};
struct behavior_driver_api {
    int locality;
    int (*binding_pressed)(struct zmk_behavior_binding *, struct zmk_behavior_binding_event);
    int (*binding_released)(struct zmk_behavior_binding *, struct zmk_behavior_binding_event);
#if TEST_METADATA
    const struct behavior_parameter_metadata *parameter_metadata;
#endif
};
struct zmk_input_processor_driver_api {
    int (*handle_event)(const struct device *, struct input_event *, uint32_t, uint32_t,
                        struct zmk_input_processor_state *);
};
#define ZMK_LISTENER(name, fn) static int (*registered_reset)(const zmk_event_t *) = fn
#define ZMK_SUBSCRIPTION(...)
#define BEHAVIOR_DT_INST_DEFINE(n, init, pm, data, cfg, level, priority, api) \
    static const struct behavior_driver_api *registered_behavior = api
#define DEVICE_DT_DEFINE(n, init, pm, data, cfg, level, priority, api) \
    static const struct zmk_input_processor_driver_api *registered_filter = api
"""
TEST = r"""
#include <assert.h>
#include "scroll_mode.c"
static struct zmk_behavior_binding_event key_event;
static void select_axis(unsigned int axis) {
    struct zmk_behavior_binding binding = {.param1 = axis};
    assert(registered_behavior->binding_pressed(&binding, key_event) == 0);
    assert(registered_behavior->binding_released(&binding, key_event) == 0);
}
int main(void) {
    assert(atomic_get(&selected_mode) == 0);
    const unsigned int sequence[] = {1, 2, 0, 2, 1, 0};
    const uint16_t codes[] = {INPUT_REL_WHEEL, INPUT_REL_HWHEEL, INPUT_REL_X, INPUT_REL_Y};
    for (size_t m = 0; m < ARRAY_SIZE(sequence); m++) {
        unsigned int mode = sequence[m];
        select_axis(mode);
        // All signs, both sync states, and non-wheel/non-relative events.
        for (int value = -13; value <= 13; value++) {
            for (size_t c = 0; c < ARRAY_SIZE(codes); c++) {
                for (int type = INPUT_EV_KEY; type <= INPUT_EV_REL; type++) {
                    for (int sync = 0; sync <= 1; sync++) {
                        struct input_event event = {
                            .type = type, .code = codes[c], .value = value, .sync = sync};
                        bool blocked = type == INPUT_EV_REL &&
                            ((mode == 1 && codes[c] == INPUT_REL_HWHEEL) ||
                             (mode == 2 && codes[c] == INPUT_REL_WHEEL));
                        assert(registered_filter->handle_event(NULL, &event, 0, 0, NULL) == 0);
                        assert(event.value == (blocked ? 0 : value));
                        assert(event.type == type && event.code == codes[c] && event.sync == sync);
                    }
                }
            }
        }
    }
    for (int layer = 0; layer < 12; layer++) {
        for (int active = 0; active <= 1; active++) {
            select_axis(2);
            struct zmk_layer_state_changed event = {.layer = layer, .state = active};
            assert(registered_reset(&event) == ZMK_EV_EVENT_BUBBLE);
            assert(atomic_get(&selected_mode) == (layer >= 10 ? 0 : 2));
        }
    }
    select_axis(1);
    struct zmk_behavior_binding invalid = {.param1 = UINT32_MAX};
    assert(registered_behavior->binding_pressed(&invalid, key_event) == -EINVAL);
    assert(atomic_get(&selected_mode) == 1);
    struct zmk_layer_state_changed exit_event = {.layer = 10, .state = false};
    registered_reset(&exit_event);
    struct zmk_behavior_binding released = {.param1 = 1};
    registered_behavior->binding_released(&released, key_event);
    assert(atomic_get(&selected_mode) == 0);
#if TEST_METADATA
    assert(registered_behavior->parameter_metadata->sets[0].param1_values_len == 3);
#endif
    return 0;
}
"""
HEADERS = [
    "zephyr/device.h", "zephyr/sys/atomic.h",
    "zephyr/dt-bindings/input/input-event-codes.h",
    "drivers/behavior.h", "drivers/input_processor.h", "zmk/behavior.h",
    "zmk/event_manager.h", "zmk/events/layer_state_changed.h",
]
with tempfile.TemporaryDirectory(prefix="torabo-scroll-test-") as temp:
    tmp = Path(temp)
    (tmp / "shim.h").write_text(SHIM, encoding="utf-8")
    for name in HEADERS:
        path = tmp / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('#include "shim.h"\n', encoding="utf-8")
    (tmp / "test.c").write_text(TEST, encoding="utf-8")
    for metadata in (0, 1):
        exe = tmp / f"test-{metadata}.exe"
        subprocess.run([
            "gcc", "-std=c11", "-Wall", "-Wextra", "-Werror", "-Wno-unused-parameter",
            f"-DTEST_METADATA={metadata}", "-I", str(tmp), "-I", str(ROOT / "src"),
            str(tmp / "test.c"), "-o", str(exe),
        ], check=True)
        subprocess.run([str(exe)], check=True)
print("PASS: axis filtering, sync preservation, tap persistence, layer reset, invalid modes; metadata off/on.")

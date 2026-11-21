"""Host check of held Shift, gesture lifetime and cleanup; not a firmware build."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SHIM = r"""
#pragma once
#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#define DT_HAS_COMPAT_STATUS_OKAY(x) 1
#define DT_INST_PROP(n, prop) 3
#define DT_INST_PHANDLE(n, prop) gesture_node
#define DEVICE_DT_NAME(node) "mouse_gesture"
#define LEFT_SHIFT 0x0700e1
#define IS_ENABLED(x) TEST_METADATA
struct device { int unused; };
struct behavior_parameter_metadata { int unused; };
struct zmk_behavior_binding { const char *behavior_dev; uint32_t param1, param2; };
struct zmk_behavior_binding_event { int layer; uint32_t position; int64_t timestamp; uint8_t source; };
enum { BEHAVIOR_LOCALITY_CENTRAL };
struct behavior_driver_api {
    int locality;
    int (*binding_pressed)(struct zmk_behavior_binding *, struct zmk_behavior_binding_event);
    int (*binding_released)(struct zmk_behavior_binding *, struct zmk_behavior_binding_event);
#if TEST_METADATA
    int (*get_parameter_metadata)(const struct device *, struct behavior_parameter_metadata *);
#endif
};
#if TEST_METADATA
static int zmk_behavior_get_empty_param_metadata(
    const struct device *dev, struct behavior_parameter_metadata *metadata) { return 0; }
#endif
static bool shift, gesture_on;
static uint32_t layers;
static int gesture_press_error, gesture_release_error, layer_press_error;
static int64_t shift_timestamp;
static struct zmk_behavior_binding_event gesture_event;
static int raise_zmk_keycode_state_changed_from_encoded(uint32_t key, bool pressed, int64_t ts) {
    assert(key == LEFT_SHIFT);
    shift = pressed;
    shift_timestamp = ts;
    return 0;
}
static int zmk_keymap_layer_activate(unsigned int layer) {
    assert(layer == 3);
    if (layer_press_error) return layer_press_error;
    layers |= 1u << layer;
    return 0;
}
static int zmk_keymap_layer_deactivate(unsigned int layer) {
    assert(layer == 3);
    layers &= ~(1u << layer);
    return 0;
}
static int zmk_behavior_invoke_binding(const struct zmk_behavior_binding *binding,
                                     struct zmk_behavior_binding_event event, bool pressed) {
    assert(strcmp(binding->behavior_dev, "mouse_gesture") == 0);
    gesture_event = event;
    if (pressed && gesture_press_error) return gesture_press_error;
    gesture_on = pressed;
    return pressed ? 0 : gesture_release_error;
}
#define BEHAVIOR_DT_INST_DEFINE(n, init, pm, data, cfg, level, priority, api) \
    static const struct behavior_driver_api *registered_behavior = api
"""
TEST = r"""
#include "thumb_shift.c"
int main(void) {
    struct zmk_behavior_binding binding = {0};
    assert(registered_behavior->locality == BEHAVIOR_LOCALITY_CENTRAL);
    for (unsigned int os = 0; os < 2; os++) {
        for (unsigned int overlay = 4; overlay < 12; overlay++) {
            uint32_t original = (1u << os) | (1u << overlay);
            layers = original;
            // Repeated taps must never latch Shift or leave gestures enabled.
            for (unsigned int tap = 0; tap < 3; tap++) {
                struct zmk_behavior_binding_event event = {
                    .layer = overlay, .position = 56, .source = 1, .timestamp = tap * 100,
                };
                assert(registered_behavior->binding_pressed(&binding, event) == 0);
                assert(shift && gesture_on && layers == (original | 8u));
                assert(shift_timestamp == event.timestamp);
                assert(gesture_event.source == 1 && gesture_event.position == 56);
                assert(gesture_event.layer == (int)overlay);
                event.timestamp += 20;
                assert(registered_behavior->binding_released(&binding, event) == 0);
                assert(!shift && !gesture_on && layers == original);
                assert(shift_timestamp == event.timestamp);
            }
        }
    }
    struct zmk_behavior_binding_event event = {.timestamp = 500};
    layers = 2;
    gesture_press_error = -5;
    assert(registered_behavior->binding_pressed(&binding, event) == -5);
    assert(!shift && !gesture_on && layers == 2);
    gesture_press_error = 0;
    layer_press_error = -6;
    assert(registered_behavior->binding_pressed(&binding, event) == -6);
    assert(!shift && !gesture_on && layers == 2);
    layer_press_error = 0;
    assert(registered_behavior->binding_pressed(&binding, event) == 0);
    gesture_release_error = -7;
    assert(registered_behavior->binding_released(&binding, event) == -7);
    assert(!shift && !gesture_on && layers == 2);
#if TEST_METADATA
    assert(registered_behavior->get_parameter_metadata == zmk_behavior_get_empty_param_metadata);
#endif
    return 0;
}
"""
HEADERS = [
    "zephyr/device.h", "drivers/behavior.h", "dt-bindings/zmk/keys.h",
    "zmk/behavior.h", "zmk/events/keycode_state_changed.h", "zmk/keymap.h",
]
with tempfile.TemporaryDirectory(prefix="torabo-thumb-test-") as temp:
    tmp = Path(temp)
    (tmp / "shim.h").write_text(SHIM, encoding="utf-8")
    for name in HEADERS:
        header = tmp / name
        header.parent.mkdir(parents=True, exist_ok=True)
        header.write_text('#include "shim.h"\n', encoding="utf-8")
    (tmp / "test.c").write_text(TEST, encoding="utf-8")
    for metadata in (0, 1):
        exe = tmp / f"test-{metadata}.exe"
        subprocess.run([
            "gcc", "-std=c11", "-Wall", "-Wextra", "-Werror", "-Wno-unused-parameter",
            f"-DTEST_METADATA={metadata}", "-I", str(tmp), "-I", str(ROOT / "src"),
            str(tmp / "test.c"), "-o", str(exe),
        ], check=True)
        subprocess.run([str(exe)], check=True)
print("PASS: held Shift/gestures, OS overlays, repeated taps, failure cleanup; metadata off/on.")

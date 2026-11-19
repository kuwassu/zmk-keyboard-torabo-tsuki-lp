"""Host check of OS selection and matching key releases; not a firmware build."""
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
#define DT_HAS_COMPAT_STATUS_OKAY(x) 1
#define DT_INST_PROP(n, prop) 1
struct zmk_behavior_binding { uint32_t param1, param2; };
struct zmk_behavior_binding_event { int64_t timestamp; };
enum { BEHAVIOR_LOCALITY_CENTRAL };
struct behavior_driver_api {
    int locality;
    int (*binding_pressed)(struct zmk_behavior_binding *, struct zmk_behavior_binding_event);
    int (*binding_released)(struct zmk_behavior_binding *, struct zmk_behavior_binding_event);
};
static uint32_t layers, emitted_keycode;
static bool emitted_pressed;
static int64_t emitted_timestamp;
static bool zmk_keymap_layer_active(unsigned int layer) { return layers & (1u << layer); }
static int raise_zmk_keycode_state_changed_from_encoded(uint32_t key, bool pressed, int64_t ts) {
    emitted_keycode = key;
    emitted_pressed = pressed;
    emitted_timestamp = ts;
    return 0;
}
#define BEHAVIOR_DT_INST_DEFINE(n, init, pm, data, cfg, level, priority, api) \
    static const struct behavior_driver_api *registered_behavior = api
"""
TEST = r"""
#include "tab_switch.c"
int main(void) {
    // Distinct encoded keys represent previous/next shortcuts for each OS.
    struct zmk_behavior_binding shortcuts[] = {{0x0307002b, 0x1207002b},
                                               {0x0107002b, 0x1007002b}};
    assert(registered_behavior->locality == BEHAVIOR_LOCALITY_CENTRAL);
    for (unsigned int os = 0; os < 2; os++) {
        for (unsigned int overlay = 0; overlay < 12; overlay++) {
            for (unsigned int direction = 0; direction < 2; direction++) {
                layers = (os ? 2u : 1u) | (1u << 3) | (1u << overlay);
                bool mac = layers & 2u;
                struct zmk_behavior_binding *binding = &shortcuts[direction];
                uint32_t expected = mac ? binding->param2 : binding->param1;
                struct zmk_behavior_binding_event event = {.timestamp = 123};
                assert(registered_behavior->binding_pressed(binding, event) == 0);
                assert(emitted_keycode == expected && emitted_pressed);
                assert(emitted_timestamp == 123);
                // An OS change between press and release must not leave Ctrl held.
                layers ^= 2u;
                event.timestamp = 143;
                assert(registered_behavior->binding_released(binding, event) == 0);
                assert(emitted_keycode == expected && !emitted_pressed);
                assert(emitted_timestamp == 143);
            }
        }
    }
    return 0;
}
"""
HEADERS = [
    "zephyr/device.h", "drivers/behavior.h", "zmk/behavior.h",
    "zmk/events/keycode_state_changed.h", "zmk/keymap.h",
]
with tempfile.TemporaryDirectory(prefix="torabo-tab-test-") as temp:
    tmp = Path(temp)
    (tmp / "shim.h").write_text(SHIM)
    for name in HEADERS:
        header = tmp / name
        header.parent.mkdir(parents=True, exist_ok=True)
        header.write_text('#include "shim.h"\n')
    (tmp / "test.c").write_text(TEST)
    exe = tmp / "test"
    subprocess.run([
        "gcc", "-std=c11", "-Wall", "-Wextra", "-Werror", "-Wno-unused-parameter",
        "-I", str(tmp), "-I", str(ROOT / "src"), str(tmp / "test.c"), "-o", str(exe),
    ], check=True)
    subprocess.run([str(exe)], check=True)
print("PASS: Windows/Mac shortcuts under overlays, directions, releases after OS changes.")

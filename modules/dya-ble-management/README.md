# DYA BLE management for seven host profiles

Vendored firmware-only sources from
[cormoran/zmk-module-ble-management](https://github.com/cormoran/zmk-module-ble-management/tree/851661cd21f2aded8ec649da86e01a207dc4b973),
tag `zmk-v0.3.0.0`, commit `851661cd21f2aded8ec649da86e01a207dc4b973`.
The upstream MIT license is preserved in `LICENSE`.

Changes:

- Generate `ble_management.options` from `.options.in` using `CONFIG_BT_MAX_PAIRED`
  instead of the upstream fixed `max_count:5`. The handler enumerates
  `ZMK_BLE_PROFILE_COUNT` entries; this keyboard has seven hosts plus one split bond.
- Assert at compile time that the generated array can contain every host profile.
- Omit the unused include directory from CMake. The original protocol and RPC
  subsystem identifier are unchanged, so DYA Studio uses its BLE management UI.

The parent module loads this directory's CMake and Kconfig; no dependency checkout
is patched. Both local Docker and manually triggered Actions builds use the same
generated buffer sizes.

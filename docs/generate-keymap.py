"""Refresh the manual's local data: python docs/generate-keymap.py (stdlib only)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "config/keymap.keymap").read_text(encoding="utf-8")
source = re.sub(r"//[^\n]*", "", source)
pointer = (ROOT / "boards/shields/torabo_tsuki_lp/torabo_tsuki_lp_right.overlay").read_text(encoding="utf-8")
pointer = re.sub(r"//[^\n]*", "", pointer)
layers = []
for name, body in re.findall(r"(L\d+_\w+)\s*\{\s*bindings\s*=\s*<(.*?)>;", source, re.S):
    # Optional switch/dial bindings are outside the 66-position main matrix.
    body = body.split("#if")[0]
    bindings = re.findall(r"&\w+(?:\s+[^&]+)?", body)
    bindings = [" ".join(binding.split()) for binding in bindings]
    if len(bindings) != 66:
        raise ValueError(f"{name}: expected 66 bindings, found {len(bindings)}")
    enabled = not name.startswith("L2_auto_mouse") or bool(re.search(r"&zip_temp_layer\s+2\b", pointer))
    system = "win" if re.match(r"L\d+_win_", name) else "mac" if re.match(r"L\d+_mac_", name) else "both"
    layers.append({"name": name, "bindings": bindings, "enabled": enabled, "os": system})
combos_source = source.split("combos {", 1)[1].split("macros {", 1)[0]
combos = []
for name, body in re.findall(r"(\w+)\s*\{([^{}]*)\};", combos_source, re.S):
    props = dict(re.findall(r"([\w-]+)\s*=\s*<(.*?)>;", body, re.S))
    combo = {"name": name, "binding": props["bindings"].strip(),
             "positions": list(map(int, props["key-positions"].split())),
             "layers": list(map(int, props["layers"].split()))}
    for prop in ("timeout-ms", "require-prior-idle-ms"):
        if prop in props:
            combo[prop] = int(props[prop])
    combos.append(combo)
assert len(layers) == 12 and len(combos) == 25
data = {"layers": layers, "combos": combos}
output = "// Generated from config/keymap.keymap by generate-keymap.py.\nconst KEYMAP = "
output += json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
(ROOT / "docs/keymap-data.js").write_text(output, encoding="utf-8", newline="\n")
print(f"Generated {len(layers)} layers and {len(combos)} combos.")

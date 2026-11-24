"""Run inside the build container after building both halves (see docs/compact-layout.md)."""
import json
from pathlib import Path
import pickle
import sys

WORKSPACE = Path('/workspaces/torabo')
REPO = Path('/repo')
sys.path.insert(0, str(WORKSPACE / 'zephyr/scripts/dts/python-devicetree/src'))

keymap_source = (REPO / 'docs/keymap-data.js').read_text()
keymap = json.loads(keymap_source.split('const KEYMAP = ', 1)[1].rstrip(';\n'))
assert len(keymap['layers']) == 12
assert all(len(layer['bindings']) == 42 for layer in keymap['layers'])
assert len(json.loads((REPO / 'config/info.json').read_text())['layouts']['LAYOUT']['layout']) == 42

for side, role, offset in [('left', 'peripheral', 0), ('right', 'central', 7)]:
    build = WORKSPACE / f'build/torabo_tsuki_lp_{side}_{role}/zephyr'
    with (build / 'edt.pickle').open('rb') as stream:
        edt = pickle.load(stream)
    layouts = [n for n in edt.nodes if n.status == 'okay' and 'zmk,physical-layout' in n.compats]
    assert len(layouts) == 1, (side, layouts)
    layout = layouts[0]
    assert edt.chosen_node('zmk,physical-layout') == layout
    assert len(layout.props['keys'].val) == 42
    transform = layout.props['transform'].val
    coords = [(value >> 8, value & 0xff) for value in transform.props['map'].val]
    assert len(coords) == len(set(coords)) == 42
    col_offset = transform.props.get('col-offset')
    assert (col_offset.val if col_offset else 0) == offset
    assert all(row < transform.props['rows'].val and col < transform.props['columns'].val for row, col in coords)
    assert not {(4, 11), (4, 10)} & set(coords), 'Trackball positions must not generate key events'
    # Q/A/Z and both edges of the gap must stay at the same electrical positions.
    assert [coords[p] for p in [0, 10, 20, 38, 39, 40, 41]] == [
        (1, 1), (2, 1), (3, 1), (4, 13), (4, 12), (4, 9), (4, 8)]
    layers = list(edt.get_node('/keymap').children.values())
    assert len(layers) == 12
    assert all(len(layer.props['bindings'].val) == 42 for layer in layers)
    combos = list(edt.get_node('/combos').children.values())
    assert len(combos) == len(keymap['combos']) == 27
    for combo in combos:
        assert all(0 <= pos < 42 for pos in combo.props['key-positions'].val), combo.name
    question = edt.get_node('/combos/question_mark')
    assert [coords[p] for p in question.props['key-positions'].val] == [(3, 1), (3, 8)]
    assert question.props['layers'].val == [0, 1]
    assert 'studio_unlock' in layers[2].props['bindings'].val[35].controller.labels
    print(f'PASS: {side} compiled layout, matrix bounds, split offset, 12 layers, 27 combos and Studio unlock')

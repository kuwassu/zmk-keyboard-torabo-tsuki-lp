"""Run inside the local-build container after building all targets."""
from pathlib import Path
import pickle, re, subprocess, sys
workspace=Path('/workspaces/torabo')
root=workspace/'build/torabo_tsuki_lp_right_central'
config=(root/'zephyr/.config').read_text()
for flag in ('BT_MAX_CONN=8','BT_MAX_PAIRED=8','ZMK_STUDIO_LOCKING=y','ZMK_BLE_MANAGEMENT_STUDIO_RPC=y','ZMK_SETTINGS_RPC_STUDIO=y','ZMK_RUNTIME_INPUT_PROCESSOR_STUDIO_RPC=y','ZMK_SPLIT_RELAY_EVENT=y'):
    assert 'CONFIG_'+flag+'\n' in config, flag
print('PASS: seven hosts + split bond, Studio lock and DYA RPC enabled')
left=(workspace/'build/torabo_tsuki_lp_left_peripheral/zephyr/.config').read_text()
assert 'CONFIG_ZMK_SPLIT_RELAY_EVENT=y\n' in left
assert 'CONFIG_ZMK_SETTINGS_RPC=y\n' in left
assert 'CONFIG_ZMK_BLE_MANAGEMENT_STUDIO_RPC=y\n' not in left
print('PASS: peripheral settings relay without duplicate central RPC')
sys.path.insert(0,str(workspace/'zephyr/scripts/dts/python-devicetree/src'))
with (root/'zephyr/edt.pickle').open('rb') as f: edt=pickle.load(f)
def chain(node):
    return [(p.controller.path,p.data) for p in node.props['input-processors'].val]
ball=edt.get_node('/pointing_listener')
pad=edt.get_node('/pointing_device_split_listener')
assert chain(ball)[-1][0].endswith('/mouse_runtime_input_processor')
assert chain(pad)[-1][0].endswith('/pad_runtime_input_processor')
for name in ('win-gesture-mouse','mac-gesture-mouse','tab-gesture-mouse'):
    assert all('runtime_input_processor' not in p[0] for p in chain(ball.children[name]))
for name,divisor in (('win-scroller',2),('mac-scroller',12)):
    entries=chain(ball.children[name])
    assert entries[-2][0].endswith('/scroll_runtime_input_processor')
    assert entries[-1][0].endswith('/scroll_axis_filter')
    assert list(entries[-3][1].values())==[1,divisor]
assert list(chain(pad)[-2][1].values())==[1,6]
assert list(chain(pad.children['mac-scroller'])[-2][1].values())==[1,8]
for label in ('mouse','scroll','pad'):
    node=next(n for n in edt.nodes if n.props.get('processor-label') and n.props['processor-label'].val==label)
    assert node.props['scale-multiplier'].val==1 and node.props['scale-divisor'].val==1
    assert not node.props['xy-to-scroll-enabled'].val
print('PASS: independent mouse/scroll/pad defaults; OS speeds, gestures and axis filter preserved')
headers=list(root.rglob('ble_management.pb.h'))
assert len(headers)==1, headers
header=headers[0]
assert re.search(r'ProfileInfo profiles\[8\]',header.read_text()),header
nanopb=workspace/'modules/lib/nanopb'
command=['gcc','-std=c11','-Wall','-Wextra','-Werror','-I',str(header.parents[2]),'-I',str(header.parents[3]),'-I',str(nanopb),'/repo/tests/test_dya_ble_profiles.c',str(header.with_suffix('.c')),str(nanopb/'pb_common.c'),str(nanopb/'pb_encode.c'),str(nanopb/'pb_decode.c'),'-o','/tmp/test-dya-ble']
subprocess.run(command,check=True)
subprocess.run(['/tmp/test-dya-ble'],check=True)

"""Run inside the ZMK build container; the PowerShell wrapper supplies mounts."""
import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import shutil
import subprocess

import yaml

REPO = Path('/repo')
WORKSPACE = Path('/workspaces/torabo')
OUTPUT = Path('/out')
SHIELDS = {
    'left': 'torabo_tsuki_lp_left',
    'right': 'torabo_tsuki_lp_right',
    'reset': 'settings_reset',
}


def run(*args):
    print('+', ' '.join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=WORKSPACE, check=True)


def build(args):
    entries = yaml.safe_load((REPO / 'build.yaml').read_text())['include']
    if args.target != 'all':
        entries = [e for e in entries if e.get('shield') == SHIELDS[args.target]]
    if not entries:
        raise RuntimeError(f'No build.yaml entry for {args.target}')

    names = [e.get('artifact-name', f"{e['shield']}-{e['board']}-zmk") for e in entries]
    for name in names:
        # A failed setup/build must not leave an old selected UF2 looking current.
        (OUTPUT / f'{name}.uf2').unlink(missing_ok=True)

    # Match CI: west's manifest lives in a writable, isolated config directory.
    config = WORKSPACE / 'config'
    if config.exists():
        shutil.rmtree(config)
    shutil.copytree(REPO / 'config', config)
    if not (WORKSPACE / '.west').exists():
        run('west', 'init', '-l', config)

    manifest_hash = hashlib.sha256((config / 'west.yml').read_bytes()).hexdigest()
    update_stamp = WORKSPACE / '.manifest-sha256'
    if args.update or not update_stamp.exists() or update_stamp.read_text() != manifest_hash:
        run('west', 'update', '--fetch-opt=--filter=tree:0')
        # Only mark a successful update; retry automatically after interruptions.
        update_stamp.write_text(manifest_hash)
    run('west', 'zephyr-export')

    for entry, name in zip(entries, names):
        build_dir = WORKSPACE / 'build' / name
        command = [
            'west', 'build', '-s', 'zmk/app', '-d', build_dir,
            '-b', entry['board'], '-p', 'always' if args.pristine else 'auto',
        ]
        if entry.get('snippet'):
            command += ['-S', entry['snippet']]
        command += [
            '--', f'-DZMK_CONFIG={config}', f"-DSHIELD={entry['shield']}",
            f'-DZMK_EXTRA_MODULES={REPO}',
        ]
        if entry.get('cmake-args'):
            import shlex
            command += shlex.split(entry['cmake-args'])
        run(*command)
        firmware = build_dir / 'zephyr/zmk.uf2'
        if not firmware.is_file():
            raise RuntimeError(f'Expected UF2 was not generated: {firmware}')
        shutil.copy2(firmware, OUTPUT / f'{name}.uf2')
        print(f'Built: /out/{name}.uf2', flush=True)

    with (OUTPUT / 'west-manifest-frozen.yml').open('w') as stream:
        subprocess.run(
            ['west', 'manifest', '--freeze', '--active-only'],
            cwd=WORKSPACE, stdout=stream, check=True,
        )
    (OUTPUT / 'build-image.txt').write_text(os.environ.get('ZMK_BUILD_IMAGE', '') + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', choices=['all', *SHIELDS], default='all')
    parser.add_argument('--update', action='store_true')
    parser.add_argument('--pristine', action='store_true')
    parser.add_argument('--jobs', type=int, default=4)
    args = parser.parse_args()
    if args.jobs < 1:
        parser.error('--jobs must be positive')
    os.environ['CMAKE_BUILD_PARALLEL_LEVEL'] = str(args.jobs)
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Shared cached dependencies/config must not be changed by concurrent builds.
    with (WORKSPACE / '.build.lock').open('w') as lock:
        print('Waiting for the local build lock...', flush=True)
        fcntl.flock(lock, fcntl.LOCK_EX)
        build(args)


if __name__ == '__main__':
    main()

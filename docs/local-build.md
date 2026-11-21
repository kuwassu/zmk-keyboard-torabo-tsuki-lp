# Windowsでのローカルビルド

PowerShell → Docker Desktop（WSL2・Linuxコンテナ）→ ZMKビルド → `.local-build/firmware/*.uf2`

現在はZMK v0.3ベースのDYA対応フォークと、v0.3用の拡張モジュールをコミット固定して使います。v0.4への更新は行いません。[DYA Studioの対応範囲と接続手順](dya-studio.md)。manifest変更時は依存ソースを自動更新します。移行時は `-Pristine` を付けて左右ともビルドします。

## 使い方

Docker Desktopを起動し、リポジトリのルートで実行します。

```powershell
# build.yamlの全構成：左・右・settings_reset
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1

# 右側だけ／左側だけ／リセット用だけ
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Target right
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Target left
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Target reset

# 依存ソースを再取得してクリーンビルド
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Update -Pristine
```

| 出力 | 書き込み先 |
| --- | --- |
| `torabo_tsuki_lp_left_peripheral.uf2` | 左側 |
| `torabo_tsuki_lp_right_central.uf2` | トラックボールのある右側 |
| `settings_reset-bmp_boost-zmk.uf2` | 設定リセットが必要な場合のみ |

出力先は `.local-build/firmware/`。選択した構成の古いUF2はビルド開始前に除去し、成功したものだけを出力します。書き込みは自動では行いません。`west-manifest-frozen.yml` に取得した依存コミット、`build-image.txt` に使用したコンテナイメージを記録します。

## 初回セットアップとキャッシュ

- WindowsのWSL2とDocker Desktopが必要です。Docker DesktopをLinuxコンテナで起動します。ホスト側へのwest・Zephyr SDKのインストールは不要です。
- 初回は公式ZMK ARMイメージと依存リポジトリをダウンロードするため、ネット接続と数GB以上の空き容量が必要です。
- ツールチェーンは `scripts/zmk-build-image.txt` のdigestで固定します。GitHub ActionsのZMK v0.3用ワークフローと同じ `zmkfirmware/zmk-build-arm:stable` から取得したイメージです。
- ソース・中間生成物はDockerの名前付きボリューム `torabotsuki-zmk-v03` に保存します。Windows側のリポジトリは読み取り専用でマウントし、未コミットの変更もビルドに反映します。
- `config/west.yml` が変わると依存ソースを自動更新します。変更がなければキャッシュを使います。依存先の `main` などを取り直す場合は `-Update` を付けます。
- 通常は差分ビルドです。設定やイメージの変更後に不整合が出る場合は `-Pristine` を使います。並列数は `-Jobs 4` が既定値です。
- 同じキャッシュを使うビルドはロックで直列化します。失敗時は終了コードを返し、依存更新に失敗した場合は次回に再試行します。

## GitHub Actions

pushとpull requestでは起動しません。GitHubの **Actions → Build ZMK firmware → Run workflow** から対象ブランチを選んだ場合だけ実行します。ビルド構成の共通定義は `build.yaml`、依存ソースは `config/west.yml` です。

## 確認済みの範囲

Windows上のDocker Desktop（WSL2バックエンド）で、左・右・settings_resetの全構成と、キャッシュを使った右側単独ビルドの成功を確認しています。3つのUF2のブロック形式と、有効な依存モジュールのコミット記録も確認済みです。ファームウェアの書き込み・実機動作の確認は含みません。

参考：[ZMKのコンテナ環境](https://zmk.dev/docs/development/local-toolchain/setup/container)、[ZMK v0.3のActionsビルド手順](https://github.com/zmkfirmware/zmk/blob/v0.3/.github/workflows/build-user-config.yml)。

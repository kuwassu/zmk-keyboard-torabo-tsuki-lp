# Windowsでのローカルビルド

PowerShell → Docker Desktop（WSL2・Linuxコンテナ）→ ZMKビルド → `.local-build/firmware/*.uf2`

現在はZMK v0.3ベースのDYA対応フォークと、v0.3用の拡張モジュールをコミット固定して使います。v0.4への更新は行いません。[DYA Studioの対応範囲と接続手順](dya-studio.md)。manifest変更時は依存ソースを自動更新します。移行時は `-Pristine` を付けて左右ともビルドします。

## 使い方

Docker Desktopを起動し、リポジトリのルートで実行します。

```powershell
# 通常更新用：左・右だけ（settings_resetは生成しない）
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1

# 右側だけ／左側だけ
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Target right
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Target left

# 依存ソースを再取得してクリーンビルド
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Update -Pristine
```

| 出力 | 書き込み先 |
| --- | --- |
| `torabo_tsuki_lp_left_peripheral.uf2` | 左側 |
| `torabo_tsuki_lp_right_central.uf2` | トラックボールのある右側 |

出力先は `.local-build/firmware/`。選択した構成の古いUF2はビルド開始前に除去し、成功したものだけを出力します。書き込みは自動では行いません。`west-manifest-frozen.yml` に取得した依存コミット、`build-image.txt` に使用したコンテナイメージを記録します。

## Bluetooth登録を残して更新する

ブートローダーを起動 → 左右それぞれの通常UF2をコピー → 再起動 → 元の接続先スロットへ

**通常更新では `settings_reset` を挟みません。** PC側のBluetooth登録も削除しません。通常のZMKファームウェア更新はペアリング情報を保存領域に残します。リセットボタンでブートローダーへ入る操作と、`settings_reset` の書き込みは別です。`-Pristine` はPC上のビルド生成物を作り直す指定で、キーボードの保存領域は消しません。

Studioの保存配列だけを戻すときは、Studioの **Restore Stock Settings** を使います。[42キー版への移行](compact-layout.md)でも、Bluetooth登録を消す全設定リセットは不要です。

### 全設定リセットが必要なときだけ

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-local.ps1 -Target reset
```

出力は **`.local-build/firmware/reset/settings_reset-bmp_boost-zmk.uf2`**。これを書き込むとBluetoothの接続先・左右間のペアリング・Studioの保存配列などを消します。左右間の接続を復旧するため全設定を消す場合は、[ZMK公式のリセット手順](https://zmk.dev/docs/troubleshooting/connection-issues#reset-split-keyboard-procedure)に従って左右をリセットし、通常UF2へ戻してから再ペアリングします。

以前のビルドで通常フォルダーに残っていたリセット用UF2も、次回ビルド時に `reset/` へ移動します。ローカルビルドの既定値と `-Target all` は通常ファームウェアだけを生成します。

## 初回セットアップとキャッシュ

- WindowsのWSL2とDocker Desktopが必要です。Docker DesktopをLinuxコンテナで起動します。ホスト側へのwest・Zephyr SDKのインストールは不要です。
- 初回は公式ZMK ARMイメージと依存リポジトリをダウンロードするため、ネット接続と数GB以上の空き容量が必要です。
- ツールチェーンは `scripts/zmk-build-image.txt` のdigestで固定します。GitHub ActionsのZMK v0.3用ワークフローと同じ `zmkfirmware/zmk-build-arm:stable` から取得したイメージです。
- ソース・中間生成物はDockerの名前付きボリューム `torabotsuki-zmk-v03` に保存します。Windows側のリポジトリは読み取り専用でマウントし、未コミットの変更もビルドに反映します。
- `config/west.yml` が変わると依存ソースを自動更新します。変更がなければキャッシュを使います。依存先の `main` などを取り直す場合は `-Update` を付けます。
- 通常は差分ビルドです。設定やイメージの変更後に不整合が出る場合は `-Pristine` を使います。並列数は `-Jobs 4` が既定値です。
- 同じキャッシュを使うビルドはロックで直列化します。失敗時は終了コードを返し、依存更新に失敗した場合は次回に再試行します。

## GitHub Actions

pushとpull requestでは起動しません。GitHubの **Actions → Build ZMK firmware → Run workflow** から対象ブランチを選んだ場合だけ実行します。ビルド構成の共通定義は `build.yaml`、依存ソースは `config/west.yml` です。Actionsの成果物には `build.yaml` にあるリセット用UF2も含まれるため、通常更新では左右の通常UF2だけを選びます。

## 確認済みの範囲

今回のDocker検証では、既定実行が左右の通常UF2だけを生成し、以前のリセット用UF2を内容を維持して `reset/` へ移すことを確認しました。明示的な `-Target reset` 相当の実行では、通常UF2を変更せず `reset/` にだけリセット用UF2と依存記録を生成します。左右の通常ビルドではBluetooth保存が有効で、起動時の全設定リセット・ボンド削除が無効であること、42キー構成とDYAの既存検証が通ることを確認しています。実機の更新後接続は未確認です。

42キー化ではmacOSのDocker Desktopでも同じPythonランナーを使い、変更前後の左・右・settings_resetをクリーンビルドしました。[容量差・依存条件・検証結果](compact-layout.md)。

Windows上のDocker Desktop（WSL2バックエンド）で、左・右・settings_resetの全構成と、キャッシュを使った右側単独ビルドの成功を確認しています。3つのUF2のブロック形式と、有効な依存モジュールのコミット記録も確認済みです。ファームウェアの書き込み・実機動作の確認は含みません。

参考：[ZMKの保存設定と通常更新](https://zmk.dev/docs/config/settings)、[ZMKのコンテナ環境](https://zmk.dev/docs/development/local-toolchain/setup/container)、[ZMK v0.3のActionsビルド手順](https://github.com/zmkfirmware/zmk/blob/v0.3/.github/workflows/build-user-config.yml)。

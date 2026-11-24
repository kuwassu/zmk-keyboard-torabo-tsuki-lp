# 42キーのS配列

L 66キー → S 44キー → 右ボール部分の2位置を除外 → **42キー**

右手の最下段：`Tab` · `Bspc` · **◯ トラックボール（キーなし）** · `Home` · `End`

全12レイヤーと27個のコンボを同じ物理位置に保ち、キー番号を0〜41に振り直しました。M・Lの物理配列、変換テーブル、配列間の位置対応表は外しています。Studioでは「S Trackball Layout」だけを表示します。Keymap Editorと操作ガイドの配列図も42キーです。

## 容量の実測

2026-11-24、変更前の `591a2f220f3ae015459a908e05a83b4f87b5f0ee` と42キー版を、同じ依存コミット・同じDockerイメージ・同じ `build.yaml` でクリーンビルドして比較しました。Studio・DYA・Bluetoothの7枠・左右の入力デバイスは有効なままです。

| 対象 | 項目 | 変更前 | 42キー版 | 削減 |
| --- | --- | ---: | ---: | ---: |
| 右・中央 | FLASH使用量 | 302,648 B | 294,468 B | **8,180 B（2.70%）** |
| 右・中央 | RAM使用量 | 99,932 B | 94,996 B | **4,936 B（4.94%）** |
| 右・中央 | UF2ファイル | 605,696 B | 589,312 B | 16,384 B（2.70%） |
| 左・周辺 | FLASH使用量 | 190,136 B | 186,560 B | **3,576 B（1.88%）** |
| 左・周辺 | RAM使用量 | 39,372 B | 39,276 B | 96 B（0.24%） |
| 左・周辺 | UF2ファイル | 380,416 B | 373,248 B | 7,168 B（1.88%） |
| settings_reset | FLASH / RAM / UF2 | 48,164 / 11,864 / 96,768 B | 同左 | 0 B |

FLASHとRAMはリンカーの `Memory region / Used Size`、UF2は生成ファイルのバイト数です。UF2には書き込み用ブロックの付加情報があるため、FLASH使用量とは異なります。上の差は66→42キー化全体の実測で、S化と追加2位置の削除を別々には測っていません。

初期選択をSにするだけでは、最大の有効配列に合わせた領域が残ります。今回は未使用配列と位置そのものを削除しました。電気的な行列とGPIOは左右とも維持し、Sの変換テーブルの行数は実際の行番号0〜4を含む5行に修正しています。任意の4方向スイッチ／ダイヤルを使う場合の追加位置は42以降です。今回の実測対象は `build.yaml` の通常構成です。

## 書き込みとStudio保存配列

1. Studioで66キー版の配列を編集・保存したことがある場合は、**旧ファームウェアのまま**配列をバックアップし、Studioで保存配列を既定に戻します。位置番号が変わるので、旧配列を42キー版にそのまま復元しません。
2. `.local-build/firmware/torabo_tsuki_lp_left_peripheral.uf2` を左側、`torabo_tsuki_lp_right_central.uf2` を右ボール側へ書き込みます。
3. Studioで「S Trackball Layout」の42キーと全レイヤーを確認します。独自の割り当ては新しい配列を基に再設定します。解除キーは接続管理L2の位置35（左親指Shift）です。

通常の移行に `settings_reset` は使いません。Bluetooth登録を消す操作は別です。ファームウェアの書き込み・実機動作・Studioでの移行は未確認です。

## 再現と検証

ビルドは [ローカルビルド手順](local-build.md) の `-Pristine` を使います。測定時のイメージは `scripts/zmk-build-image.txt` の `zmkfirmware/zmk-build-arm@sha256:edb1c953438c6f720ddb79c3762f3972013b7fbbaf4fff3592fc869983e7afc5`。変更前後の `west-manifest-frozen.yml` が完全一致することも確認しました。依存先のブランチが進んだあとの再取得では、絶対容量が変わることがあります。

測定ログと変更前のUF2・ELFは `.local-build/before/`、変更後は `.local-build/firmware/`、集計は `.local-build/size-comparison.json` に保存しています。このディレクトリはGit管理対象外です。

左右をビルドしたあと、PowerShellでは以下で生成されたDevicetreeを検証できます。

```powershell
$image = (Get-Content .\scripts\zmk-build-image.txt -Raw).Trim()
docker run --rm --mount "type=bind,source=$PWD,target=/repo,readonly" --mount type=volume,source=torabotsuki-zmk-v03,target=/workspaces/torabo $image python3 /repo/tests/check_compact_layout.py
```

今回の確認結果：

- 左・右・settings_resetのクリーンビルド成功。新しい種類のコンパイラー警告はありません。
- 両側の有効な物理配列は1つ、キー・変換・全12レイヤーの各要素数は42。行列の範囲、右の列オフセット、ボール位置の除外、27コンボ、Studio解除位置も生成物で検証しました。
- 変更前後の保持した全504バインドと27コンボを照合し、Windows／Macの透過キーの引き継ぎも一致しました。
- 既存の親指Shift・タブ切替・スクロール軸制限のホストテスト、DYAの7枠・入力経路の生成物検証が成功しました。
- Chromeの1280／390px幅で両OS・全レイヤー・コンボ強調・印刷用12配列を確認。ボールの位置にはキーを表示しません。

書き込み後はWindows／Macの通常入力、親指・Enterの各レイヤー、左右のキー、ボール・左パッド、クリック・「？」コンボ、L2の接続先とStudio解除を確認してください。

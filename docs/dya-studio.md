# DYA Studio

右側USB接続 → Studio解除 → DYA Studioで編集 → 保存

## 接続する

1. [ローカルビルド手順](local-build.md)で生成した左・右それぞれのUF2を書き込みます。左右ともDYA対応版にそろえます。
2. 右側（トラックボール・中央側）をPCにUSB接続します。
3. 入力を止めて `J＋K＋L＋Enter` をほぼ同時に押し、全キーを離して接続管理L2を開きます。
4. 左親指のShift位置を1回押すと **Studio解除**。`Enter` または `Esc` で通常配列へ戻ります。
5. Chrome／Edgeで [DYA Studio](https://studio.dya.cormoran.works/) を開き、USB接続でキーボードのシリアルポートを選びます。
6. 調整した値はDYA Studioの各画面で保存します。編集後はStudio側でロックできます。

ポインティング・デバイス設定の保存には遅延があります。変更後は10秒以上通電してから、再起動後も値が残ることを確認します（`CONFIG_ZMK_SETTINGS_SAVE_DEBOUNCE=10000`）。

Studioは起動時にロックされます。解除キーはL2の位置56（通常の左親指Shift位置）です。Windows／Mac共通で、通常入力時の親指Shiftとジェスチャーも使えます。

旧ファームウェアでStudioに保存した配列がある場合、保存済み配列がコンパイル時の配列より優先され、新しい解除キーが出ないことがあります。旧ファームウェアで配列をバックアップしてから、Studioで保存配列を既定に戻して移行してください。Bluetooth登録まで消すsettings_resetは通常の更新には使いません。

## 編集できる項目

| 画面 | この構成での対応 |
| --- | --- |
| キーマップ | キー割り当て・レイヤー名・物理レイアウト |
| 接続先 | Bluetoothの7スロットの一覧・名前・選択・登録削除、USB／BLE出力優先 |
| ポインティング | 下表の3プロセッサーを個別に調整 |
| デバイス設定 | 左右のアイドル・スリープ時間の取得と変更（split relay） |

キーボード上の接続先キーは、これまで通り偶数スロットをWindows、奇数をMac配列へ切り替えます。DYA Studioからの接続先選択はBluetoothスロットだけを変えるので、配列も変える場合は `Q＋W`（Windows）／`Q＋W＋E`（Mac）を押します。

| プロセッサー名 | 入力 → 調整先 | 既定値 |
| --- | --- | --- |
| `mouse` | 右ボール → 通常のポインター | 倍率1、回転0° |
| `scroll` | Enter保持＋右ボール → スクロール | 既存速度に対する倍率1 |
| `pad` | 左ミニパッド → スクロール | 既存速度に対する倍率1 |

スクロール調整はOS別の既存速度に追加する倍率です。右ボールはWindowsが1/2・Macが1/12、左パッドはWindowsが1/6・Macが1/8の経路を通ってから適用します。初期状態の速度は従来通りです。`scroll` と `pad` はすでにホイールイベントになった入力を処理するため、XY→スクロール変換を追加する必要はありません。

親指のタブ切替、F配列のウィンドウ配置は専用のジェスチャー経路を使います。`mouse`・`scroll`・`pad` の調整ではジェスチャーのしきい値を変えません。Enter保持中のH／J／Kによる縦横制限は、`scroll` の後段で適用します。

この対応範囲はフォーク元のv0.3対応版に基づきます。Webからのコンボ・マクロの新規作成／編集、電池履歴、OS自動判定、DYAの新しい汎用Custom Settingsや慣性処理は含みません。設定ファイルにある既存コンボとマクロは引き続き使えます。

## 実装の参照先

- 元にした対応版：[sekigon-gonnoc/zmk-keyboard-torabo-tsuki-lp `v0.3+dya-studio`](https://github.com/sekigon-gonnoc/zmk-keyboard-torabo-tsuki-lp/tree/0e8625d1bb26de8ea6f9a22698f8b8088e6b5346)。
- ZMK本体：**v0.3ベース**の [cormoran/zmk `v0.3-branch+dya`](https://github.com/cormoran/zmk/tree/4493783ef88ce2e653bf8217c92ee17140df71e3) をコミット固定。Zephyrは3.5のままです。DYA拡張RPCのためのフォークで、v0.4への更新ではありません。
- Settings RPCとRuntime Input Processor：提供元の `zmk-v0.3.0.0` タグのコミットに固定。最新版mainはv0.3とAPIが異なるため追従しません。
- BLE管理：同じv0.3タグを `modules/dya-ble-management/` にMITライセンス付きで取り込み。上流の返信配列は5枠固定なので、`CONFIG_BT_MAX_PAIRED` から生成し、7枠を安全に列挙できることをコンパイル時に検証します。
- Studioの独自ビヘイビア表示は、引数がない親指Shift、既存のスクロール軸選択に対応しています。

## 確認方法

ローカルDockerで左右・settings_resetをビルドします。生成された右側の`.config`でDYA RPCと8つの接続／登録枠（ホスト7＋左右間1）、DTSで3つのRuntime Input Processorと既存のOS別速度・ジェスチャー経路を確認します。`tests/test_dya_ble_profiles.c` は実際の生成protobufとnanopbを使い、7枠の一覧をエンコード・デコードするホスト検証です。

全構成をビルドしたあと、次のコマンドで生成設定・入力経路・7枠のprotobufをまとめて検証できます。

```powershell
$image = (Get-Content .\scripts\zmk-build-image.txt -Raw).Trim()
docker run --rm --mount "type=bind,source=$PWD,target=/repo,readonly" --mount type=volume,source=torabotsuki-zmk-v03,target=/workspaces/torabo $image python3 /repo/tests/check_dya_build.py
```

ローカルで3構成のクリーンビルド、上記の生成物検証、親指Shift・タブ切替・スクロール軸制限の既存ホストテストを確認済みです。

書き込み後はUSB接続・解除・配列の読込／保存、3プロセッサーの調整と再起動後の保存、スロット0〜6の一覧、左右の設定取得・変更、Windows／Macの既存ジェスチャーとスクロールを確認してください。実機でのDYA接続・保存は未確認です。

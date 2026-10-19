
[torabo-tsuki LP](https://github.com/sekigon-gonnoc/torabo-tsuki-lp)用のZMKファームウェア

* _centralがついているuf2をトラックボールがついている方に、_peripheralを反対側に書き込んでください
* キーマップはkeymap-editorおよびzmk-studioで編集できます

キーバインド・レイヤー・同時押しコンボの図解は [torabotsuki-xs 操作ガイド](docs/torabotsuki-xs.html) をブラウザーで開いて確認できます。

接続先の切替は、基本配列で `H + J + K` を同時押しして全キーを離し、`Y / U / I / O / P` でスロット `0 / 1 / 2 / 3 / 4` を選びます。選択後は対応するWindows／Macの基本配列に戻ります。選択前なら `Enter` または `Esc` でキャンセルできます。コンボは直前200ms入力なし・3キーを50ms以内の条件で有効です。Enter長押し中は接続先を切り替えません。

低速マウスは廃止しました。L3は既存の番号を保つため空きとして残しています。基本配列のZだけ文字入力を優先する判定（tap-preferred、長押し250ms、直前入力125ms以内・Z再押下175ms以内はタップ）です。ほかの修飾キー兼用キーと記号レイヤーのUndoは従来の判定です。

Macで設定すること一覧
- キーボード > キーボードショットカット > 装飾キー > Caps Lock → Globe
- ズーム機能 > スクロールジェスチャと装飾キーを使って拡大縮小

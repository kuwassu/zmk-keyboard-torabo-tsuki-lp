---
name: torabotsuki-maintenance
description: このリポジトリのZMK設定やキー操作を修正し、docsの操作ガイドと同期する。
---

# torabo-tsuki の修正ルール

- 修正時は必ず同じ変更で `docs/` も更新する。操作への影響、設定値、確認方法を該当箇所に反映し、実装だけを変更して完了にしない。
- 現在使うキーマップは `config/keymap.keymap`。`docs/torabotsuki-xs.html` が操作ガイド、`docs/manual.js` が図の表示ロジック。READMEに該当する説明があれば合わせて更新する。
- キーマップ変更後は `python docs/generate-keymap.py` で `docs/keymap-data.js` を再生成する。生成データを手編集しない。
- Windows / Mac両配列と、透過キーで引き継ぐレイヤーへの影響を確認する。MacのCaps Lock → Globeなど、OS側設定との関係も説明に反映する。
- `git diff --check`、生成処理、変更内容に応じた確認を行う。ファームウェアをビルドしていない場合、実機動作を確認済みとは書かない。ビルド構成は `build.yaml` と `.github/workflows/build.yml` を参照する。
- 修正した設定・docs・生成データ・このskillは必ずGit管理し、確認後にコミットして現在のブランチをリモートへプッシュする。Git管理とは追跡するだけでなく、コミット・プッシュまで完了することを指す。新規ファイルの取りこぼしを `git status --short` で確認し、関連する差分をまとめてコミットする。プッシュできない場合は理由と未完了の状態を報告する。

# デモ動画（Remotion）

ローデータ → 変換・投入 → Neo4j Browser → MCP → AI エージェントの回答、までのデータフローを 1 本の動画（1920×1080、30fps、約 107 秒）にする。

## 構成（10 シーン）

| # | シーン | 内容 |
| --- | --- | --- |
| 1 | 表紙 | タイトル |
| 2 | 課題 | 判断材料が 4 か所に散在 |
| 3 | バックエンド① ローデータ | equipment.csv・workorders.csv・マニュアルの実データが流れ込む |
| 4 | バックエンド② 変換・投入 | CSV が 12 種類のノードと 18 種類の関係になる。投入件数のカウントアップ |
| 5 | バックエンド③ グラフの確認 | Neo4j Browser の実スクリーンショット（P-301 周辺）とクエリ |
| 6 | バックエンド④ データフロー | 利用者 → AI → MCP（読み取り専用） → Neo4j / 手順書チャンク。往路・復路のパケットが流れる |
| 7 | フロントエンド AIエージェント | チャット画面で質問 → search_manual → Cypher 2 回 → 固定形式の回答がタイプされる |
| 8 | フロントエンド 根拠パス | P-301 → … → 6306ZZ の経路がノードごとに現れる |
| 9 | フロントエンド 横断と集計 | 型式経由の横断（質問2）と棒グラフ（質問4） |
| 10 | クロージング | 4 週間で御社データに |

## 使い方

```bash
cd movie
npm install
# プレビュー（ブラウザで Remotion Studio が開く）
npx remotion studio src/index.ts
# 静止画 1 枚
npx remotion still src/index.ts Demo out/frame.png --frame 930 --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# 本番レンダリング
npx remotion render src/index.ts Demo out/demo.mp4 --codec h264 --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

- 画面に出る数値や作業報告の内容は `src/data.json` から読む。CSV を変えたら `../.venv/bin/python ../scripts/export_movie_data.py` で再生成する（質問4の集計値と投入件数はスクリプト内の定数）。
- Neo4j Browser の画像は `public/neo4j_browser.png`（.playwright-mcp/neo4j_browser_p301.png のコピー）。
- 色はディスカッション資料と同じ 6 色（`src/lib.tsx` の `C`）。
- ナレーション音声は入れていない。字幕（画面下）がナレーション原稿を兼ねる。

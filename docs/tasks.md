# 開発タスク進捗

凡例：`[ ]` 未着手 `[~]` 作業中 `[x]` 完了 `[!]` ブロック中

最終更新：2026-10-04 15:30

## Day 1：グラフモデル確定と合成マスタデータ

- [x] 未決事項の決定（docs/decisions.md）
- [x] リポジトリ初期化（git init、.gitignore、requirements.txt、venv、.env.example）
- [x] docker-compose.yml（neo4j:5.26-community、APOC）
- [x] docs/model.md（12ノード・17リレーション、代表質問の正解パス）
- [x] docs/requirements.md、docs/architecture.md、docs/tasks.md
- [x] マスタ CSV：lines、models、equipment、components、parts、suppliers、failure_modes、symptoms、failure_mode_symptoms、procedures、procedure_parts、technicians
- [x] scripts/verify_csv.py：代表質問4本の正解パスが CSV 上で追えることを確認

## Day 2：作業報告生成と Neo4j 投入

- [x] scripts/gen_workorders.py（80件、シード固定、分布設計を反映）
- [x] scripts/load.py（制約・インデックス作成、全 CSV 投入、冪等）
- [x] Neo4j 起動（docker compose up -d、healthy 確認）
- [x] Neo4j Browser で P-301 周辺のサブグラフが表示できることを確認（Line 1、型式→部品→故障モード 7 パス、作業報告 16 件）

## Day 3：代表質問の Cypher と MCP 接続

- [x] queries/queries.cypher（質問1〜4の手書き Cypher と期待値）
- [x] scripts/verify.py（queries を実行し期待値と照合）
- [x] .mcp.json（Claude Code 用）
- [x] claude_desktop_config.json への追記（バックアップを取ってから。16:27 に両サーバーの接続と tools/list 成功をログで確認）
- [x] Claude が質問1〜4に根拠ID付きで答えることを確認（claude -p、4問とも正解。応答 37〜71 秒、ツール呼び出し 4 回前後）

## Day 4：手順書と埋め込み

- [x] manuals/*.md（CP-200 冷却ポンプ、BC-50 コンベア、PM-800 プレス、CT-10 冷却塔、AC-75 コンプレッサのうち3〜5本）
- [x] scripts/embed.py（チャンク化、multilingual-e5-small、ベクトル索引・全文索引、MENTIONS）
- [x] mcp/search_manual/server.py（FastMCP）
- [x] 質問1で手順書チャンクが根拠に引用されることを確認（CH-cp-200-002 / 006 を出典ページ付きで引用）

## Day 5：プロンプト調整とリハーサル

- [x] movie/out/demo.mp4（Remotion によるデータフロー説明動画、10 シーン 107 秒、1080p、約 10MB。レンダリング 3 分）
- [x] docs/discussion_deck.pptx（新規提案向けディスカッション資料 31 枚＝本編 29＋付録 2（Neo4j/Databricks 比較、二層アーキテクチャ）。deck/build.js で再生成、6 色テーマ、アクションタイトル形式）
- [x] docs/data_relationships.pdf（元データの関係性ガイド。タクソノミー・オントロジー・事例。scripts/build_data_guide.py で CSV から再生成）

- [x] docs/prompt.md（システムプロンプト）
- [x] queries/paths.cypher（根拠パス可視化クエリ）
- [x] docs/demo_script.md（デモ台本10分）
- [x] docs/next_steps_onepager.md（御社データでの構築手順）
- [~] リハーサル5回（4回以上一致で合格）、応答時間の計測（本日 6 回実行し 6 回とも正答。デモ前日に正式リハーサル 5 回を実施する）

## メモ

- 2026-10-04 16:45：Claude Desktop の通常チャットからツール呼び出しが届くことをログで確認（tools/call ×3）。プロジェクト内のチャットにはローカル MCP が渡らないため、デモは通常チャット＋プロンプト貼り付けで行う。質問カタログ docs/demo_questions.md を追加（A〜E の 14 問、期待値は Cypher で検証済み）。

- 2026-10-04 16:25：Claude Desktop で neo4j-maintenance が「Server disconnected」。ログは .venv/pyvenv.cfg への PermissionError（Desktop フォルダ配下をシェバン経由で起動した場合に macOS が拒否）。python 直起動のラッパー mcp/neo4j_cypher/server.py に切り替えて解消。search_manual は HF_HUB_OFFLINE=1 でオフライン起動に変更。

- 2026-10-04 16:30：プロンプト簡潔化とモデル先読み（初回検索 7.5 秒→0.4 秒）を実施。Q1 は検索→Cypher 2〜3 回→回答の構造上 50 秒前後が下限。Sonnet で Q1 を実行すると 21 秒・4 ターンで正答（ただし回答フォーマットの遵守がやや緩く、技術者の照会を省略）。デモで使うモデルは「正確さ優先なら Opus 系 50 秒前後、速さ優先なら Sonnet 20 秒前後」の選択。

- 2026-10-04 16:00：E2E 初回。4問とも正解だが応答 37〜71 秒で目標 10 秒を超過。内訳は search_manual の初回モデルロード 7.5 秒、ツール呼び出し 4 回、長文出力。対策：サーバー起動時のモデル先読み、プロンプトで呼び出し 3 回以内・400〜700 字に制限。10 秒は非現実的なので要件を「30 秒以内」に見直す提案を要件定義に反映予定。

- 2026-10-04 15:35：Neo4j 投入完了（252 ノード・715 リレーション＋Chunk 43・MENTIONS 186）。verify.py は Q1〜Q4 すべて PASS（最長 168ms）。mcp-neo4j-cypher 読み取り専用モードで write 拒否を確認。search_manual の E2E 動作確認済み。
- 手順書5本で 43 チャンク（brainstorm の目安100より少ない。必要なら手順書を増補）。
- Claude Desktop の設定はバックアップ（claude_desktop_config.json.bak-20261004-152353）を取って追記済み。Desktop の再起動で反映。

- Docker デーモンが停止中。`open -a Docker` で起動後に `docker compose up -d` を実行する。
- OpenAI 等の API キーは不要（埋め込みはローカル）。

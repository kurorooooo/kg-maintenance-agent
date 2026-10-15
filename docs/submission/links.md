# 提出物一覧（AI Builder Cup 2026）

更新：2026-10-13

| 提出物 | 状態 | リンク / 場所 |
| --- | --- | --- |
| デプロイ済みプロトタイプ（Cloud Run） | 稼働中 | https://kg-web-7ikzkb2evq-an.a.run.app |
| 公開 GitHub リポジトリ | 公開済み | https://github.com/kurorooooo/kg-maintenance-agent |
| デモ動画（3 分以内、英語、YouTube 限定公開） | レンダリング済み 2:39（movie/out/demo_en.mp4、1080p、Gemini TTS ナレーション、2 名クレジット） | YouTube URL：https://www.youtube.com/watch?v=TvJVhiY2rhg（2026-10-15 限定公開を外部から確認済み、2:40） |
| ピッチデッキ（英語、PDF、13 枚） | 作成済み（2026-10-07） | docs/pitch_deck.pdf（生成：`cd deck && NODE_PATH=$PWD/node_modules node build_pitch.js` → `soffice --headless --convert-to pdf`） |
| ドキュメント | README（英語）、docs/architecture.md、docs/model.md、提出フォーム用英文 docs/submission/form_answers.md | リポジトリ内 |
| 問題ステートメントのカテゴリ | Manufacturing | — |
| チーム | 黒澤 翔、福尾 幸太郎（藤岡さんは 2026-10-13 に離脱） | Hack2skill のチーム名：**Plant A**（2026-10-13 決定）。チームロゴ：docs/submission/team_logo.png（1024×1024、9 KB、3 ノードの三角形）。福尾さんの登録・チーム参加：確認済み（2026-10-13） |

## 審査期間中の運用チェック

- [x] 常時起動化（2026-10-13 実施）：`gcloud run services update kg-agent|kg-web --min-instances 1`。リビジョン kg-agent-00006 / kg-web-00003。以後 `infra/10_deploy_agent.sh` / `20_deploy_web.sh` で再デプロイするときは必ず `MIN_INSTANCES=1` を付ける（付けないと 0 に戻る）
- [x] Cloud Scheduler `kg-agent-warmup` の成功を確認（2026-10-13：10/13 03:00 JST と手動実行がともに HTTP 200）
- [x] Cloud Monitoring の Uptime check「kg-web home」（5 分間隔、3 リージョン）とアラート「kg-web down」を作成、失敗時に kurorooooo0927@gmail.com へメール通知（2026-10-13）
- [ ] Gemini のクォータ（1 分あたりのリクエスト数）を確認。審査員の同時アクセスを想定して max-instances 3 のままで足りるか
- [ ] 11/6 の審査終了後に min-instances を 0 に戻す

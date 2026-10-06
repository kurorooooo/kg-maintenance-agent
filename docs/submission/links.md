# 提出物一覧（AI Builder Cup 2026）

更新：2026-10-06

| 提出物 | 状態 | リンク / 場所 |
| --- | --- | --- |
| デプロイ済みプロトタイプ（Cloud Run） | 稼働中 | https://kg-web-7ikzkb2evq-an.a.run.app |
| 公開 GitHub リポジトリ | 公開済み | https://github.com/kurorooooo/kg-maintenance-agent |
| デモ動画（3 分以内、英語、YouTube 限定公開） | 未作成（P5） | — |
| ピッチデッキ（英語、PDF） | 未作成（P5） | deck/ で生成予定 |
| ドキュメント | README（英語）、docs/architecture.md、docs/model.md | リポジトリ内 |
| 問題ステートメントのカテゴリ | Manufacturing | — |
| チーム | 黒澤 翔、藤岡 淳一 | Hack2skill のチーム名：（未記入） |

## 審査期間中の運用チェック

- [ ] 10/18 までに `MIN_INSTANCES=1 infra/10_deploy_agent.sh` と `MIN_INSTANCES=1 infra/20_deploy_web.sh` を実行（コールドスタート回避）
- [ ] Cloud Scheduler `kg-agent-warmup` が 1 日 2 回成功していることを確認（AuraDB Free の停止防止）
- [ ] Cloud Monitoring の Uptime check を kg-web に設定し、失敗時にメール通知
- [ ] Gemini のクォータ（1 分あたりのリクエスト数）を確認。審査員の同時アクセスを想定して max-instances 3 のままで足りるか
- [ ] 11/6 の審査終了後に min-instances を 0 に戻す

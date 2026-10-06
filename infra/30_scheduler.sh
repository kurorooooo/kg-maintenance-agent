#!/usr/bin/env bash
# Cloud Scheduler: 1 日 2 回 kg-agent の /warmup を OIDC 認証付きで呼び、AuraDB Free の自動停止（3 日無操作）を防ぐ。
set -euo pipefail
source "$(dirname "$0")/env.sh"
URL=$(gcloud run services describe "$AGENT_SERVICE" --region "$GOOGLE_CLOUD_LOCATION" --format 'value(status.url)')
SA="$WEB_SA@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com"   # 呼び出し元は kg-web と同じ SA（run.invoker を持つ）
gcloud run services add-iam-policy-binding "$AGENT_SERVICE" --region "$GOOGLE_CLOUD_LOCATION" \
  --member "serviceAccount:$SA" --role roles/run.invoker --quiet >/dev/null
JOB="kg-agent-warmup"
ARGS=(--location "$GOOGLE_CLOUD_LOCATION" --schedule "0 3,15 * * *" --time-zone "Asia/Tokyo" \
      --uri "$URL/warmup" --http-method GET --oidc-service-account-email "$SA" --oidc-token-audience "$URL")
if gcloud scheduler jobs describe "$JOB" --location "$GOOGLE_CLOUD_LOCATION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB" "${ARGS[@]}"
else
  gcloud scheduler jobs create http "$JOB" "${ARGS[@]}"
fi
gcloud scheduler jobs run "$JOB" --location "$GOOGLE_CLOUD_LOCATION"
echo "== scheduler job $JOB -> $URL/warmup (03:00 / 15:00 JST)"

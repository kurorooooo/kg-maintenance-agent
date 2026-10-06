#!/usr/bin/env bash
# Cloud Run に kg-web（Next.js）をデプロイする。公開（審査員がログインなしで触れる）。
# kg-web-sa は kg-agent の呼び出し権限（run.invoker）を持ち、ID トークンで kg-agent を呼ぶ。
set -euo pipefail
source "$(dirname "$0")/env.sh"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIN_INSTANCES="${MIN_INSTANCES:-0}"

AGENT_URL=$(gcloud run services describe "$AGENT_SERVICE" --region "$GOOGLE_CLOUD_LOCATION" --format 'value(status.url)')
WEB_SA_EMAIL="$WEB_SA@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com"
gcloud run services add-iam-policy-binding "$AGENT_SERVICE" --region "$GOOGLE_CLOUD_LOCATION" \
  --member "serviceAccount:$WEB_SA_EMAIL" --role roles/run.invoker --quiet >/dev/null

gcloud run deploy "$WEB_SERVICE" \
  --source "$ROOT/web" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$GOOGLE_CLOUD_LOCATION" \
  --service-account "$WEB_SA_EMAIL" \
  --allow-unauthenticated \
  --min-instances "$MIN_INSTANCES" --max-instances 3 \
  --cpu 1 --memory 512Mi --timeout 300 --concurrency 40 \
  --set-env-vars "AGENT_URL=$AGENT_URL,NEXT_PUBLIC_DEFAULT_LOCALE=en" \
  --set-secrets "NEO4J_URI=neo4j-uri:latest,NEO4J_USERNAME=neo4j-username:latest,NEO4J_PASSWORD=neo4j-password:latest,NEO4J_DATABASE=neo4j-database:latest" \
  --quiet

URL=$(gcloud run services describe "$WEB_SERVICE" --region "$GOOGLE_CLOUD_LOCATION" --format 'value(status.url)')
echo "== deployed: $URL"
echo "== overview:"; curl -s "$URL/api/graph/overview?id=P-301" | head -c 200; echo

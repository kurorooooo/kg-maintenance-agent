#!/usr/bin/env bash
# Cloud Run に kg-agent（ADK）をデプロイする。--source で Dockerfile からビルド（Cloud Build）。
# 使い方: infra/10_deploy_agent.sh            # min-instances は MIN_INSTANCES（既定 0。審査期間は 1 にする）
set -euo pipefail
source "$(dirname "$0")/env.sh"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIN_INSTANCES="${MIN_INSTANCES:-0}"

gcloud run deploy "$AGENT_SERVICE" \
  --source "$ROOT/agent" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$GOOGLE_CLOUD_LOCATION" \
  --service-account "$AGENT_SA@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" \
  --no-allow-unauthenticated \
  --min-instances "$MIN_INSTANCES" --max-instances 3 \
  --cpu 1 --memory 1Gi --timeout 300 --concurrency 20 \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,GOOGLE_CLOUD_LOCATION=$VERTEX_LOCATION,AGENT_MODEL=$AGENT_MODEL,EMBED_MODEL=$EMBED_MODEL,EMBED_DIM=$EMBED_DIM" \
  --set-secrets "NEO4J_URI=neo4j-uri:latest,NEO4J_USERNAME=neo4j-username:latest,NEO4J_PASSWORD=neo4j-password:latest,NEO4J_DATABASE=neo4j-database:latest" \
  --quiet

URL=$(gcloud run services describe "$AGENT_SERVICE" --region "$GOOGLE_CLOUD_LOCATION" --format 'value(status.url)')
echo "== deployed: $URL"
echo "== warmup:"; curl -s -H "Authorization: Bearer $(gcloud auth print-identity-token)" "$URL/warmup"; echo

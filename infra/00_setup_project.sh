#!/usr/bin/env bash
# P0: プロジェクト選択、API 有効化、サービスアカウント作成、Artifact Registry 作成。冪等。
# 前提: gcloud auth login 済み。
set -euo pipefail
source "$(dirname "$0")/env.sh"

echo "== project: $GOOGLE_CLOUD_PROJECT / region: $GOOGLE_CLOUD_LOCATION"
gcloud config set project "$GOOGLE_CLOUD_PROJECT" >/dev/null
gcloud config set run/region "$GOOGLE_CLOUD_LOCATION" >/dev/null

echo "== enable APIs"
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com

PROJECT_NUMBER=$(gcloud projects describe "$GOOGLE_CLOUD_PROJECT" --format='value(projectNumber)')

echo "== service accounts"
for SA in "$AGENT_SA" "$WEB_SA"; do
  if ! gcloud iam service-accounts describe "$SA@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$SA" --display-name="$SA"
  fi
done

# kg-agent: Vertex AI（Gemini / Embeddings）と Secret Manager
for ROLE in roles/aiplatform.user roles/secretmanager.secretAccessor roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" \
    --member="serviceAccount:$AGENT_SA@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" \
    --role="$ROLE" --condition=None --quiet >/dev/null
done
# kg-web: Secret Manager（Neo4j 読み取り用）とログ。kg-agent の起動権限はデプロイ後に付与（10_deploy_agent.sh）
for ROLE in roles/secretmanager.secretAccessor roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" \
    --member="serviceAccount:$WEB_SA@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" \
    --role="$ROLE" --condition=None --quiet >/dev/null
done

echo "== artifact registry"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$GOOGLE_CLOUD_LOCATION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$GOOGLE_CLOUD_LOCATION"
fi

echo "== done. project number: $PROJECT_NUMBER"
echo "次: infra/01_secrets.sh で Neo4j 接続情報を Secret Manager に登録する"

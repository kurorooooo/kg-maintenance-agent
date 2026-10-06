#!/usr/bin/env bash
# GCP 共通設定。各スクリプトの先頭で `source "$(dirname "$0")/env.sh"` する。
# プロジェクト ID は GCP 上では小文字のみ（コンソールの表示名は大文字を含んでよい）。
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-empirical-vial-510800-i7}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-asia-northeast1}"   # Cloud Run / Artifact Registry のリージョン
export VERTEX_LOCATION="${VERTEX_LOCATION:-global}"                        # Gemini の接続先（3.8 Flash は global のみ提供）

export AGENT_SERVICE="kg-agent"
export WEB_SERVICE="kg-web"
export AGENT_SA="kg-agent-sa"
export WEB_SA="kg-web-sa"
export AR_REPO="kg"   # Artifact Registry リポジトリ名

# モデル（デプロイ日に AI Studio / Vertex AI で利用可能 ID を再確認する）
export AGENT_MODEL="${AGENT_MODEL:-gemini-3.8-flash}"
export EMBED_MODEL="${EMBED_MODEL:-gemini-embedding-001}"
export EMBED_DIM="${EMBED_DIM:-768}"

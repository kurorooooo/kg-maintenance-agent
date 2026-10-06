#!/usr/bin/env bash
# Neo4j（AuraDB）の接続情報を Secret Manager に登録する。冪等（新バージョンを追加）。
# 使い方: NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io NEO4J_PASSWORD=... infra/01_secrets.sh
set -euo pipefail
source "$(dirname "$0")/env.sh"

: "${NEO4J_URI:?NEO4J_URI を指定してください}"
: "${NEO4J_PASSWORD:?NEO4J_PASSWORD を指定してください}"
NEO4J_USERNAME="${NEO4J_USERNAME:-neo4j}"
NEO4J_DATABASE="${NEO4J_DATABASE:-neo4j}"

put_secret() {
  local name="$1" value="$2"
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    gcloud secrets create "$name" --replication-policy=automatic
  fi
  printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
}

put_secret neo4j-uri "$NEO4J_URI"
put_secret neo4j-username "$NEO4J_USERNAME"
put_secret neo4j-password "$NEO4J_PASSWORD"
put_secret neo4j-database "$NEO4J_DATABASE"
echo "== secrets registered: neo4j-uri, neo4j-username, neo4j-password, neo4j-database"

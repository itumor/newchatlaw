#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${LIBRECHAT_AGENT_BASE_URL:-http://localhost:3880}"
API_KEY="${LIBRECHAT_AGENT_API_KEY:-}"
MODEL="${LIBRECHAT_AGENT_MODEL_HAIKU:-}"
RECURSION_LIMIT="${LIBRECHAT_AGENT_RECURSION_LIMIT:-60}"

if [[ -z "${API_KEY}" ]]; then
  echo "LIBRECHAT_AGENT_API_KEY is required" >&2
  exit 1
fi

if [[ -z "${MODEL}" ]]; then
  echo "LIBRECHAT_AGENT_MODEL_HAIKU is required" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 \"your prompt\"" >&2
  exit 1
fi

PROMPT="$1"

curl -sS -X POST "${BASE_URL}/api/agents/v1/chat/completions" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"${MODEL}"'",
    "recursionLimit": '"${RECURSION_LIMIT}"',
    "messages": [
      {
        "role": "user",
        "content": "'"${PROMPT//$'\n'/\\n}"'"
      }
    ]
  }'

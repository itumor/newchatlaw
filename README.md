# newchatlaw

Local Docker stack for testing LibreChat against a PostgreSQL MCP server.

## Services

- LibreChat: `http://localhost:3880`
- PostgreSQL: `postgresql://postgres:postgres@localhost:35432/app`
- PostgreSQL MCP endpoint: `http://localhost:38081/mcp`

## Notes

- The MCP endpoint is intentionally unauthenticated for this local-only setup because LibreChat did not successfully forward a static bearer token during server inspection.
- LibreChat discovers the PostgreSQL MCP tools `ask`, `search`, and `stream`.
- The seeded sample data includes `customers` and `orders` rows so the stack is testable immediately.

## Verified LibreChat Agent API

I verified this against the running LibreChat instance at `http://localhost:3880`.

What works right now:

- `GET /api/agents/v1/models` works with a LibreChat agent API key.
- The agent `legal billing and utilization data haiku 4.5` resolves to model ID `agent_FCpGDtKOPOczIlqGUPm_p`.
- `POST /api/agents/v1/chat/completions` works end-to-end and returned a real analysis from the agent.
- Some agent questions require a higher recursion cap; `recursionLimit: 60` worked for the verified `Lawer242` query.

What did not work in this setup:

- `POST /api/agents/v1/responses` hung and timed out during verification, so this repo should not claim that path is working yet.
- The verified working path for this stack is `chat/completions`.

Store the live key outside git, for example in `.env.local`:

```bash
export LIBRECHAT_AGENT_BASE_URL=http://localhost:3880
export LIBRECHAT_AGENT_API_KEY=replace_with_real_agent_api_key
export LIBRECHAT_AGENT_MODEL_HAIKU=agent_FCpGDtKOPOczIlqGUPm_p
export LIBRECHAT_AGENT_RECURSION_LIMIT=60
```

Confirmed model listing:

```bash
curl http://localhost:3880/api/agents/v1/models \
  -H "Authorization: Bearer $LIBRECHAT_AGENT_API_KEY"
```

Confirmed agent invocation:

```bash
curl -X POST http://localhost:3880/api/agents/v1/chat/completions \
  -H "Authorization: Bearer $LIBRECHAT_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$LIBRECHAT_AGENT_MODEL_HAIKU"'",
    "recursionLimit": 60,
    "messages": [
      {
        "role": "user",
        "content": "Analyze legal billing utilization trends in one short paragraph."
      }
    ]
  }'
```

If you hit `Recursion limit of 25 reached without hitting a stop condition`, increase the request-level `recursionLimit`. The `haiku 4.5` agent completed successfully with `60`.

Reusable helper script:

```bash
bash scripts/call_librechat_agent.sh "How many hours did I Lawer242 record today 2026-03-14 (Saturday)?"
```

If you reuse the test key created during local verification, rotate or delete it afterward.

## Start

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```
# newchatlaw

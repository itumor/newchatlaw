# how to run local docker
```bash
#RM pgmcp-local
git pull
git rm --cached pgmcp-local
rm -rf .git/modules/pgmcp-local
rm -r pgmcp-local
rmdir pgmcp-local
# Re-add properly
git submodule add git@github.com:itumor/pgmcp-local.git pgmcp-local
# start 
docker compose up -d
```



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

## BI and Dashboards

This repo can be extended from chat-to-SQL into chat-driven analytics.

- Architecture overview: [`ARCHITECTURE.md`](/Users/eramadan/GitRepo/newchatlaw/ARCHITECTURE.md)
- BI extension guide: [`LIBRECHAT_BI.md`](/Users/eramadan/GitRepo/newchatlaw/LIBRECHAT_BI.md)

The current stack already supports the first step of a BI workflow:

1. User asks a question in LibreChat.
2. LibreChat calls the PostgreSQL MCP server.
3. The MCP server generates or executes read-only SQL.
4. PostgreSQL returns the result set.

To turn that into charts or dashboards, add a visualization layer behind LibreChat tool calls or in the LibreChat frontend.

### Implemented BI endpoints

The local `pgmcp` service now exposes:

- `POST /bi/chart` to create a chart from a natural-language question or direct SQL
- `POST /bi/dashboard` to create a dashboard from a natural-language question or direct SQL
- `GET /bi/charts/:id` to open the rendered chart page
- `GET /bi/dashboards/:id` to open the rendered dashboard page

The MCP server also exposes new LibreChat tools:

- `chart`
- `dashboard`

These tools return the generated SQL, result rows, and browser URLs for the rendered BI views.

### Quick test with direct SQL

After `docker compose up -d --build`, create a chart:

```bash
curl -X POST http://localhost:38081/bi/chart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT c.name, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY c.name ORDER BY revenue DESC LIMIT 10",
    "title": "Revenue by customer",
    "chart_type": "bar",
    "x": "name",
    "y": "revenue"
  }'
```

Create a dashboard:

```bash
curl -X POST http://localhost:38081/bi/dashboard \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT DATE(created_at) AS day, SUM(total) AS revenue FROM orders GROUP BY DATE(created_at) ORDER BY day LIMIT 30",
    "title": "Daily revenue dashboard",
    "chart_type": "line",
    "x": "day",
    "y": "revenue"
  }'
```

If LM Studio or another OpenAI-compatible model is running, you can also use natural language instead of SQL:

```json
{
  "query": "Show revenue by customer as a bar chart",
  "chart_type": "bar"
}
```

### Using it in LibreChat

In LibreChat, ask for analytics with explicit chart intent, for example:

- `Use the chart tool to show revenue by customer as a bar chart.`
- `Use the dashboard tool to build a daily revenue dashboard from the orders table.`
- `Create a dashboard for order totals by day and give me the dashboard link.`

If your model reliably performs tool calls, LibreChat can invoke the new `chart` and `dashboard` MCP tools and return the generated URL in the chat.

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

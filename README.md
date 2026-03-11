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

## Start

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```
# newchatlaw

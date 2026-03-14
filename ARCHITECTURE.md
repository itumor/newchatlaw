# Architecture

## Overview

`newchatlaw` is a local Docker-based integration stack that connects LibreChat to a PostgreSQL Model Context Protocol (MCP) server.

The repository contains two main parts:

1. A LibreChat deployment and its supporting services.
2. A forked/local `pgmcp` service that exposes PostgreSQL data through MCP tools over streamable HTTP.

At runtime, the user interacts with LibreChat in the browser, LibreChat calls the MCP server at `http://pgmcp:8080/mcp`, and the MCP server translates natural-language requests into read-only SQL against PostgreSQL-compatible storage.

## Primary Goals

- Run LibreChat locally for MCP testing.
- Expose PostgreSQL data to LibreChat through MCP tools.
- Support natural-language querying, direct read-only SQL, free-text search, and streamed pagination.
- Seed a small relational dataset so the stack is usable immediately.

## System Context

```mermaid
flowchart LR
    U[User in Browser]
    LC[LibreChat UI and API]
    MCP[PGMCP Server]
    DB[(PostgreSQL Database)]
    LLM[LLM API<br/>LM Studio compatible endpoint]
    MONGO[(MongoDB)]
    MEILI[(Meilisearch)]
    RAG[RAG API]
    VDB[(pgvector Vector DB)]

    U --> LC
    LC --> MCP
    LC --> MONGO
    LC --> MEILI
    LC --> RAG
    RAG --> VDB
    MCP --> DB
    MCP --> LLM
```

## Deployment View

The stack is defined in [`docker-compose.yml`](/Users/eramadan/GitRepo/newchatlaw/docker-compose.yml).

### Containers

- `librechat`: main chat application, exposed on port `3880`.
- `mongodb`: LibreChat application persistence.
- `meilisearch`: search/indexing dependency for LibreChat.
- `vectordb`: PostgreSQL with pgvector for RAG workloads.
- `rag_api`: LibreChat RAG backend.
- `postgres`: local PostgreSQL instance exposed on port `35432`.
- `pgmcp`: custom MCP server exposed on port `38081`.

```mermaid
flowchart TB
    subgraph Docker Network
        LC[librechat]
        MG[mongodb]
        MS[meilisearch]
        RA[rag_api]
        VD[vectordb]
        PG[postgres]
        PM[pgmcp]
    end

    Browser[Browser :3880] --> LC
    LC --> MG
    LC --> MS
    LC --> RA
    RA --> VD
    LC --> PM
    PM --> PG
    HostLLM[Host machine LM Studio :1234] --> PM
```

## Important Configuration Notes

### LibreChat MCP integration

[`librechat.yaml`](/Users/eramadan/GitRepo/newchatlaw/librechat.yaml) enables MCP support and registers one MCP server:

- Name: `postgres`
- Transport: `streamable-http`
- URL: `http://pgmcp:8080/mcp`

This makes the PostgreSQL tools available inside LibreChat agents/conversations.

### PGMCP runtime dependencies

From [`docker-compose.yml`](/Users/eramadan/GitRepo/newchatlaw/docker-compose.yml), `pgmcp` depends on:

- `DATABASE_URL` for the SQL backend.
- `OPENAI_BASE_URL` pointing to `http://host.docker.internal:1234/v1`.
- `OPENAI_MODEL` set to `openai/gpt-oss-20b`.

### Current default runtime

The local stack now defaults `pgmcp` to the repository's own `postgres` container:

- LibreChat local
- PGMCP local
- PostgreSQL local
- optional OpenAI-compatible model endpoint on the host machine for natural-language SQL generation

That makes the analytics and BI flow reproducible with the seeded sample data out of the box.

## Component Architecture

```mermaid
flowchart LR
    subgraph LibreChat
        UI[Web UI]
        CFG[MCP Config]
        AG[Agent Runtime]
    end

    subgraph PGMCP
        HTTP[Streamable HTTP Handler]
        TOOLS[MCP Tools<br/>ask, search, stream]
        CACHE[Schema Cache]
        SQLGEN[SQL Generation]
        GUARD[Read-only Guard]
        QUERY[Query Executor]
        AUDIT[Audit Logging]
    end

    subgraph Data and Model Backends
        PG[(PostgreSQL)]
        OAI[OpenAI-compatible API]
    end

    UI --> AG
    CFG --> AG
    AG --> HTTP
    HTTP --> TOOLS
    TOOLS --> CACHE
    TOOLS --> SQLGEN
    TOOLS --> GUARD
    TOOLS --> QUERY
    TOOLS --> AUDIT
    CACHE --> PG
    QUERY --> PG
    SQLGEN --> OAI
```

## Request Flow

### Natural-language query flow

```mermaid
sequenceDiagram
    participant User
    participant LibreChat
    participant PGMCP
    participant SchemaCache
    participant LLM
    participant Postgres

    User->>LibreChat: Ask question in chat
    LibreChat->>PGMCP: MCP tool call `ask`
    PGMCP->>SchemaCache: Load cached schema summary
    alt Cache miss or expired
        SchemaCache->>Postgres: Inspect tables, columns, foreign keys
        Postgres-->>SchemaCache: Schema metadata
    end
    PGMCP->>LLM: Generate SQL from question + schema
    LLM-->>PGMCP: SQL statement
    PGMCP->>PGMCP: Validate input and guard read-only SQL
    PGMCP->>Postgres: Execute paginated query
    Postgres-->>PGMCP: Rows
    PGMCP-->>LibreChat: Structured MCP result
    LibreChat-->>User: Answer with returned rows
```

### Direct SQL fast path

If the incoming `ask.query` already starts with `SELECT` or `WITH`, PGMCP skips LLM generation and treats the request as direct read-only SQL, then still applies the read-only guard and execution path.

## PGMCP Server Internals

The MCP server implementation lives in [`pgmcp-local/server/main.go`](/Users/eramadan/GitRepo/newchatlaw/pgmcp-local/server/main.go).

### Exposed tools

- `ask`: natural-language question answering with automatic streaming.
- `search`: free-text search across discovered textual columns.
- `stream`: multi-page streaming query execution.

### Internal pipeline

```mermaid
flowchart TD
    IN[Incoming MCP request]
    SAN[Input sanitization]
    DECIDE{Direct SQL?}
    SCHEMA[Load schema cache]
    GEN[Generate SQL with LLM]
    RO[Read-only guard]
    COST[Expensive query detection]
    EXEC[Run paginated query]
    ERR[Graceful error shaping]
    OUT[Structured tool response]

    IN --> SAN
    SAN --> DECIDE
    DECIDE -- Yes --> RO
    DECIDE -- No --> SCHEMA
    SCHEMA --> GEN
    GEN --> RO
    RO --> COST
    COST --> EXEC
    EXEC --> ERR
    ERR --> OUT
```

### Internal responsibilities

- Configuration validation for DB URL, timeouts, schema TTL, and max row limits.
- PostgreSQL connection pooling using `pgxpool`.
- Schema summary caching with TTL to reduce repeated introspection.
- SQL generation through an OpenAI-compatible client.
- Read-only enforcement before execution.
- Basic expensive-query detection and query simplification.
- Structured handling for common SQL generation failures such as missing columns or tables.
- Streamable HTTP transport for MCP.

## Data Architecture

The local seed schema is created in [`postgres-init/001-init.sql`](/Users/eramadan/GitRepo/newchatlaw/postgres-init/001-init.sql).

### Seeded relational model

```mermaid
erDiagram
    CUSTOMERS {
        int id PK
        text name
        text city
    }

    ORDERS {
        int id PK
        int customer_id FK
        numeric total
        timestamptz created_at
    }

    CUSTOMERS ||--o{ ORDERS : places
```

### Seed data purpose

The sample data gives the MCP server a minimal but realistic schema for testing:

- Customer dimension data.
- Order fact data.
- A single foreign-key relationship usable for joins and aggregation questions.

## Trust Boundaries

```mermaid
flowchart LR
    subgraph User Boundary
        U[Browser User]
    end

    subgraph App Boundary
        LC[LibreChat]
    end

    subgraph Tooling Boundary
        PM[PGMCP]
    end

    subgraph Data Boundary
        PG[(PostgreSQL)]
    end

    subgraph Model Boundary
        LLM[OpenAI-compatible LLM service]
    end

    U --> LC
    LC --> PM
    PM --> PG
    PM --> LLM
```

### Boundary implications

- User prompts cross from the browser into LibreChat and then into PGMCP.
- PGMCP sends schema context and user intent to the model backend for SQL generation.
- Database access is intended to be read-only, enforced both by SQL guarding and, ideally, by database credentials.
- If the active `DATABASE_URL` points to a remote database, the stack boundary extends beyond local Docker.

## Security and Operational Characteristics

### Present safeguards

- Request body size limit middleware.
- Input sanitization and suspicious-pattern logging.
- Read-only SQL guard before execution.
- Schema caching to reduce metadata load.
- Query timeout and row/page limits.
- Optional bearer-token protection in the server code.
- Audit logging for security-relevant events.

### Current risks and caveats

- The README states the MCP endpoint is intentionally unauthenticated for local use.
- The compose file currently leaves bearer auth unset.
- The active database target in compose is remote rather than the local seeded PostgreSQL container.
- `host.docker.internal` is required for the local LLM endpoint, so the stack depends on host-level model availability.

## Runtime Ports and Endpoints

| Component | Endpoint | Purpose |
|---|---|---|
| LibreChat | `http://localhost:3880` | User-facing chat UI |
| Local PostgreSQL | `postgresql://postgres:postgres@localhost:35432/app` | Local seeded database |
| PGMCP | `http://localhost:38081/mcp` | MCP endpoint exposed to host |
| Health check | `http://localhost:38081/healthz` | PGMCP health probe |
| Host LLM | `http://host.docker.internal:1234/v1` | SQL-generation model backend |

## Startup and Interaction Lifecycle

```mermaid
flowchart TD
    A[docker compose up -d]
    B[Start infrastructure containers]
    C[Postgres runs init SQL]
    D[PGMCP waits for Postgres health]
    E[PGMCP starts HTTP MCP server]
    F[LibreChat starts with librechat.yaml]
    G[LibreChat registers MCP server]
    H[User opens chat and invokes tool-assisted workflow]

    A --> B
    B --> C
    C --> D
    D --> E
    B --> F
    E --> G
    F --> G
    G --> H
```

## Recommended Future Improvements

1. Align `pgmcp` with the local `postgres` container if the goal is a fully local stack.
2. Enable `AUTH_BEARER` even for local testing when practical.
3. Document whether Neon is intentional or a temporary override.
4. Split infrastructure concerns from application concerns by adding separate docs for LibreChat setup and PGMCP internals.
5. Add an explicit architecture decision record for the host-based LLM dependency.

## Source References

- [`README.md`](/Users/eramadan/GitRepo/newchatlaw/README.md)
- [`docker-compose.yml`](/Users/eramadan/GitRepo/newchatlaw/docker-compose.yml)
- [`librechat.yaml`](/Users/eramadan/GitRepo/newchatlaw/librechat.yaml)
- [`postgres-init/001-init.sql`](/Users/eramadan/GitRepo/newchatlaw/postgres-init/001-init.sql)
- [`pgmcp-local/server/main.go`](/Users/eramadan/GitRepo/newchatlaw/pgmcp-local/server/main.go)
- [`pgmcp-local/README.md`](/Users/eramadan/GitRepo/newchatlaw/pgmcp-local/README.md)

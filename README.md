# CostSharing

## Docker Compose (Development)

Für die lokale Entwicklung gibt es eine zentrale Compose-Datei: `docker-compose.dev.yml`.

Sie startet in dieser Reihenfolge:

- `db` (PostgreSQL, inkl. Healthcheck)
- `backend` (`npm run start:dev`, abhängig von gesunder DB)
- `frontend` (`npm run start -- --host 0.0.0.0 --port 4200`)

### Start

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Stop

```bash
docker compose -f docker-compose.dev.yml down
```

### Reset (inkl. Volumes)

```bash
docker compose -f docker-compose.dev.yml down -v
```

## Warum diese Variante (robust & reproduzierbar)

- `backend` und `frontend` nutzen je ein `Dockerfile.dev` mit `npm ci`.
- Abhängigkeiten werden deterministisch aus `package-lock.json` installiert.
- Bei unveränderten Lockfiles nutzt Docker den Build-Cache, dadurch sind weitere Starts schneller.
- Quellcode bleibt per Bind-Mount live editierbar für den Dev-Workflow.

## Hinweis zu File-Watching

- Polling-Variablen (`CHOKIDAR_USEPOLLING`, `WATCHPACK_POLLING`) sind im Compose bewusst nur beim `frontend` gesetzt.
- Im `backend` können diese Variablen mit `nest start --watch` zu Watcher-Fehlern führen (z. B. `ERR_INVALID_ARG_TYPE` für `interval`).

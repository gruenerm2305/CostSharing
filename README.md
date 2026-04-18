# CostSharing

## Docker Compose

Es gibt zwei Varianten:

- `docker-compose.dev.yml` für lokale Entwicklung (`frontend` auf `http://localhost:4200`, `backend` mit `start:dev`)
- `docker-compose.yml` für referenznahe, produktionsnahe Ausführung (`frontend` auf `http://localhost`)

### Wichtige Architekturpunkte

- `postgres` ist **nur intern** im Docker-Netzwerk erreichbar (kein Host-Port).
- In der produktionsnahen Variante läuft auch das `backend` nur intern; Zugriff erfolgt über das `frontend` via `/api`.
- Swagger ist über `http://localhost/api/docs` erreichbar.
- Persistente Volumes sind getrennt: Development nutzt `pg_data_dev` und `backend_uploads_dev`, die produktionsnahe Variante nutzt `pg_data` und `backend_uploads`.

### Vorbereitung

Kopiere die Vorlage und passe Werte an:

```bash
cp backend/.env.example backend/.env
```

Unter Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Danach Werte in `backend/.env` anpassen (insbesondere `JWT_SECRET`).

### Development starten

```bash
docker compose -f docker-compose.dev.yml up --build
```

Stoppen:

```bash
docker compose -f docker-compose.dev.yml down
```

### (produktive) Variante starten

```bash
docker compose up --build
```

Stoppen:

```bash
docker compose down
```

### Volumes zurücksetzen (beide Varianten)

```bash
docker compose down -v
docker compose -f docker-compose.dev.yml down -v
```

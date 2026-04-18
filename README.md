# CostSharing

CostSharing ist eine Full-Stack-Anwendung zum Erfassen, Verarbeiten und Aufteilen von Belegen. Das Projekt besteht aus einem NestJS-Backend, einem Angular-Frontend und einer PostgreSQL-Datenbank. Belege können per Upload oder manuell angelegt, kategorisiert, statistisch ausgewertet, exportiert und mit anderen Nutzern geteilt werden.

## Was die Anwendung kann

- Belege per Bild-Upload mit OCR auslesen oder manuell erfassen
- Artikel und Gesamtbeträge bearbeiten, löschen und neu zuordnen
- Belege in Kostenanteile aufteilen und mit anderen Nutzern teilen
- Kategorien verwalten und Ausgaben übersichtlich organisieren
- Dashboard- und Statistikansichten für die Auswertung nutzen
- Benutzerkonto, Benutzernamen, Passwort und Rollen verwalten
- Geteilte Belege über einen öffentlichen Link read-only anzeigen
- Die Oberfläche auf Deutsch oder Englisch nutzen

## Architektur im Überblick

### Backend

Das Backend liegt in `backend/` und basiert auf NestJS. Der Einstiegspunkt ist `backend/src/main.ts`:

- globaler API-Prefix: `/api`
- CORS aktiviert mit der Frontend-URL aus `FRONTEND_URL`
- globale Validierung über `ValidationPipe`
- Swagger-Dokumentation unter `/api/docs`

Die wichtigsten Module sind in `backend/src/app.module.ts` eingebunden:

- `AuthModule` für Registrierung, Login und JWT-Authentifizierung
- `UsersModule` für Profil, Passwort, Benutzername und Rollen
- `CategoriesModule` für Kategorien pro Nutzer
- `ReceiptsModule` für Belegverwaltung, Upload, Statistik und Export
- `OcrModule` für die KI-gestützte Belegerkennung
- `SplittingModule` für Teilen, Einladen, Claiming und Zusammenfassungen

### Frontend

Das Frontend liegt in `frontend/` und ist eine Angular-App. Die Routen aus `frontend/src/app/app.routes.ts` zeigen die wichtigsten Bereiche:

- `login` und `register` für Authentifizierung
- `home` als geschützter Einstieg nach dem Login
- `receipts/capture`, `receipts/editor`, `receipts/list` und `receipts/:id/split`
- öffentlicher, read-only Zugriff auf geteilte Belege über einen Share-Token
- `dashboard`, `categories`, `account` und `admin`

Die App initialisiert Auth-Interceptor, Routing, Animationen und i18n in `frontend/src/app/app.config.ts`.

## Voraussetzungen

Wenn auf dem Rechner noch nichts installiert ist, richte zuerst diese Werkzeuge ein:

1. `Git`
2. `Docker Desktop`
3. `Node.js` mit `npm` für lokale Entwicklung ohne Docker
4. Ein Browser wie Chrome, Edge oder Firefox
5. Optional: `Visual Studio Code`

Empfehlung:

- Für den schnellsten Start: Docker Desktop installieren und die Compose-Variante nutzen
- Für lokale Code-Entwicklung: zusätzlich Node.js LTS installieren

## Ersteinrichtung

### 1) Repository klonen

```powershell
git clone https://github.com/gruenerm2305/CostSharing.git
cd CostSharing
```

### 2) Umgebungsdatei anlegen

Kopiere die Backend-Vorlage nach `backend/.env`:

```powershell
Copy-Item backend/.env.example backend/.env
```

Wichtige Werte in `backend/.env`:

- `DATABASE_URL` für die PostgreSQL-Verbindung
- `JWT_SECRET` als geheimer Signierschlüssel
- `JWT_EXPIRATION` für die Token-Laufzeit
- `FRONTEND_URL` für CORS und Redirects
- `PORT` für den Backend-Port

Für OCR-Funktionen erwartet das Backend zusätzlich diese Umgebungsvariablen:

- `GEMINI_API_KEY`
- optional `GEMINI_MODEL`
- optional `GEMINI_BASE_URL`

## Installation und Start

### Empfohlener Start mit Docker

#### Development-Umgebung

Diese Variante startet Frontend, Backend und Datenbank mit Live-Reload:

```powershell
docker compose -f docker-compose.dev.yml up --build
```

Zugriffe:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

Stoppen:

```powershell
docker compose -f docker-compose.dev.yml down
```

#### Produktionsnahe Compose-Variante

Diese Variante nutzt die produktionsnahe Docker-Konfiguration:

```powershell
docker compose up --build
```

Zugriffe:

- Frontend: `http://localhost`
- API: `http://localhost/api`
- Swagger: `http://localhost/api/docs`

Stoppen:

```powershell
docker compose down
```

#### Volumes zurücksetzen

Wenn du Datenbank und Uploads vollständig neu aufsetzen willst:

```powershell
docker compose down -v
docker compose -f docker-compose.dev.yml down -v
```

### Lokale Entwicklung ohne Docker

Wenn Docker nicht verwendet werden soll, kannst du die Anwendungen auch direkt starten.

#### Backend

```powershell
cd backend
npm install
npm run start:dev
```

Backend-URL: `http://localhost:3000/api`

#### Frontend

```powershell
cd frontend
npm install
npm start
```

Frontend-URL: `http://localhost:4200`

Wichtig: Das Frontend erwartet, dass das Backend unter der in der App konfigurierten API-URL erreichbar ist. Für lokale Entwicklung ist `http://localhost:3000/api` vorgesehen.

## Projektstruktur

```text
backend/
	src/
		auth/        Login, Registrierung, JWT
		categories/  Kategorien pro Benutzer
		ocr/         OCR-Verarbeitung für Belege
		receipts/    Belegverwaltung, Statistik, Export, Share-Links
		splitting/   Teilnehmer, Claims, Zusammenfassung
		users/       Profil, Rollen, Kontoänderungen
	DatabaseDocker/
		init.sql     Datenbankschema und Seed-Daten
frontend/
	src/app/
		auth/        Login und Registrierung
		account/     Kontoverwaltung
		admin/       Benutzerverwaltung
		dashboard/   Auswertungen
		receipt/     Erfassen, Bearbeiten, Aufteilen, Teilen
		cathegory/   Kategorienverwaltung
		core/        Services, Guards, Interceptors, i18n
```

## Backend im Detail

### Authentifizierung

Die Authentifizierung läuft über `backend/src/auth/`:

- Registrierung über `POST /api/auth/register`
- Login über `POST /api/auth/login`
- JWT-geschützte Endpunkte werden über Guards abgesichert

### Benutzerverwaltung

`backend/src/users/` deckt folgende Funktionen ab:

- eigenes Profil abrufen
- Berechtigungen anzeigen
- Benutzername und Passwort ändern
- Rolle ändern, sofern die aktuelle Rolle das erlaubt
- Benutzer listen oder löschen, abhängig von der Rolle

### Kategorien

`backend/src/categories/` stellt eine geschützte CRUD-API für nutzerspezifische Kategorien bereit.

### Belege

`backend/src/receipts/` ist der Kernbereich für Belege:

- Upload eines Belegbilds und OCR-Verarbeitung
- manuelle Erstellung und Bearbeitung
- Liste, Detailansicht und Löschen
- Statistikabfragen mit Zeitraumfiltern
- ZIP-Export der Belege
- Erzeugen von Share-Links
- öffentliche, read-only Anzeige geteilter Belege über `/api/share/:shareToken`

### Kostenaufteilung

`backend/src/splitting/` unterstützt das gemeinsame Aufteilen von Belegen:

- Teilnehmer einladen
- Artikel einem Teilnehmer zuweisen oder Claims entfernen
- Zusammenfassung der Anteile abrufen
- Beleg wieder privat machen
- eigene Teilnahme verlassen

### OCR

`backend/src/ocr/ocr.service.ts` nutzt eine externe Gemini-kompatible API, um Belegbilder auszulesen. Das Ergebnis wird als XML verarbeitet und in strukturierte Belegdaten überführt.

### Swagger / API-Testing

Swagger läuft unter `http://localhost:3000/api/docs` im Development-Setup und unter `http://localhost/api/docs` in der produktionsnahen Compose-Variante. Dort kann die REST-API direkt im Browser getestet werden, Requests mit JWT ausführen und die verfügbaren Endpunkte der Anwendung erkunden.

## Datenbank

Die Datenbank läuft auf PostgreSQL 16.

### Schema und Seed

`backend/DatabaseDocker/init.sql`:

- aktiviert `pgcrypto`
- setzt die Zeitzone auf UTC
- legt die `users`-Tabelle an
- erzeugt einen Owner-Startaccount

Der lokale Startnutzer ist:

- Benutzername: `Owner`
- Passwort: `startowner`

### Docker-Datenbank

- Entwicklung: separate Volumes für `pg_data_dev` und `backend_uploads_dev`
- produktionsnahe Variante: separate Volumes für `pg_data` und `backend_uploads`
- die Datenbank ist nur intern im Docker-Netzwerk erreichbar

## Frontend im Detail

### Oberfläche und Navigation

Die Angular-App ist in Bereiche für Login, Dashboard, Belege, Kategorien, Konto und Admin gegliedert.

### Schutz der Routen

- `AuthGuard` schützt angemeldete Bereiche
- `roleGuard` schützt Admin-Bereiche
- der Admin-Bereich ist für `Admin` und `Owner` vorgesehen

### Internationalisierung

Die Oberfläche lädt Sprachdateien aus `frontend/public/i18n/`:

- `en.json` für Englisch
- `de.json` für Deutsch

Die Sprachauswahl wird beim Start initialisiert und die Auswahl wird im Frontend verwaltet.

### UI-Bibliotheken

- Angular Material und CDK für Komponenten
- Chart.js und `ng2-charts` für Dashboard-Diagramme

## Tests

### Backend

```powershell
cd backend
npm test
npm run test:cov
```

Weitere Befehle:

- `npm run test:watch`
- `npm run test:e2e`

### Frontend

```powershell
cd frontend
npm test
npm run test:e2e
```

## Nützliche Befehle

### Backend

```powershell
cd backend
npm run build
npm run start:dev
npm run lint
npm run format
```

### Frontend

```powershell
cd frontend
npm run build
npm start
npm run watch
```

## Häufige Stolpersteine

- `backend/.env` muss existieren, sonst fehlen Konfigurationen für Datenbank, JWT und Frontend-URL.
- Für OCR-Uploads muss ein gültiger `GEMINI_API_KEY` gesetzt sein.
- Wenn du Docker verwendest, muss `Docker Desktop` laufen, bevor du `docker compose` startest.
- Die produktionsnahe Compose-Variante erwartet Zugriff über das Frontend und nicht direkt über den Backend-Port.

## Kurzfazit

Diese README ist bewusst als technische Projektdokumentation aufgebaut: Sie beschreibt, wie die Anwendung gestartet wird, wie die Codebereiche zusammenhängen und wo die wichtigsten Funktionen im Repository liegen.

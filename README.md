# n8n-nodes-ameise

n8n Community Node für die **Ameise-APIs** von blau direkt. Mit einem einzigen Node „Ameise“ lassen sich in n8n-Workflows nutzen:

- **Stocks**: Kunden, Kundennotizen, Kommunikationsdaten, Adressen, Kundenbeziehungen, Tags, Verträge, Vermittler, Vermittler-Mitarbeiter, Gesellschaften, Agenturen und Wertelisten (alle nicht-deprecated Endpunkte, `/api/v1` und ältere `/api`-Endpunkte ohne v1-Entsprechung)
- **Archive**: Kundenarchiv, also Archiveinträge mit Dateien, Logs und Tags
- **Panda**: Ausschreibungen (Tender), Kundenlinks, Panda-Kundendaten, Sparten, Branchen, Versicherer und Angebotsdateien

[n8n](https://n8n.io/) ist eine [fair-code lizenzierte](https://docs.n8n.io/sustainable-use-license/) Plattform zur Workflow-Automatisierung.

## Installation

Sobald das Paket auf npm veröffentlicht ist: In n8n unter **Settings → Community Nodes → Install** den Paketnamen `n8n-nodes-ameise` eintragen. Details stehen in der [Installationsanleitung](https://docs.n8n.io/integrations/community-nodes/installation/).

### Testen ohne npm-Release (Docker)

**Am schnellsten: Dev-Build mit einem Befehl einspielen**

Bei jedem Push auf `main` baut GitHub den Node und stellt ihn als Pre-Release [`dev`](https://github.com/hayBIT/n8n-nodes-ameise/releases/tag/dev) bereit. Auf dem Docker-Host (braucht nur `curl`, `tar` und `docker`):

```bash
curl -fsSL https://raw.githubusercontent.com/hayBIT/n8n-nodes-ameise/main/scripts/update-dev.sh | sh -s -- <container>
```

Das Skript lädt den aktuellen Build, ersetzt `/home/node/.n8n/custom/n8n-nodes-ameise` im Container und zeigt den eingespielten Commit an.

- Mit `N8N_DEV_RELOAD=true` in der Umgebung des n8n-Containers lädt n8n den Node **ohne Neustart** neu. Danach im Browser nur den Editor neu laden.
- Ohne die Variable startet das Skript den Container neu (Option `--restart` erzwingt das immer).
- `N8N_DEV_RELOAD=true` schaltet in n8n den Endpunkt `POST /rest/dev/reload` frei, der ohne Anmeldung die Custom-Nodes neu lädt. Für Test-Instanzen gedacht; auf einer öffentlich erreichbaren Produktivinstanz besser weglassen.

**Manuell: Dateien in einen bestehenden Container kopieren**

```bash
git clone https://github.com/hayBIT/n8n-nodes-ameise && cd n8n-nodes-ameise
npm ci && npm run build                     # erzeugt den Ordner dist/
docker exec -u root <container> sh -c 'rm -rf /home/node/.n8n/custom/n8n-nodes-ameise && mkdir -p /home/node/.n8n/custom'
docker cp dist <container>:/home/node/.n8n/custom/n8n-nodes-ameise
docker exec -u root <container> chown -R node:node /home/node/.n8n/custom
docker restart <container>
```

n8n lädt beim Start alles aus `~/.n8n/custom`. Liegt `/home/node/.n8n` auf einem Volume (Standard bei Docker Compose), bleibt der Node auch nach Updates des Containers erhalten. Für eine neue Version kopiert ihr `dist` einfach erneut und startet neu.

**Dauerhaft: eigenes Image bauen**

Das `Dockerfile` im Repo baut den Node und legt ihn in ein offizielles n8n-Image (Version per `--build-arg N8N_VERSION=…`):

```bash
docker compose -f docker-compose.example.yml up --build
# oder im eigenen Compose beim n8n-Service `image: n8nio/n8n` ersetzen durch:
#   build: /pfad/zu/n8n-nodes-ameise
```

**Hinweis:** So geladen heißt der Node-Typ `CUSTOM.ameise`, nach einer späteren npm-Installation `n8n-nodes-ameise.ameise`. Nodes in Test-Workflows müssen nach dem Umstieg einmal neu eingefügt werden. Nicht beides gleichzeitig installieren.

## Credentials

Der Node unterstützt zwei Anmeldearten (Parameter **Authentication**):

### OAuth2 (Service Account), empfohlen

Credential **Ameise Service Account OAuth2 API**. Sie nutzt den JWT-Bearer-Grant (`urn:ietf:params:oauth:grant-type:jwt-bearer`) laut [Ameise-Dokumentation](https://docs.blaudirekt.dev/ameise-apis/auth/#serviceaccount).

1. In der Ameise einen ServiceAccount anlegen. Ihr erhaltet ein JSON-Dokument mit `issuer`, `token_endpoint`, `audience`, `sub`, `scope`, `jwk`, `client_id` und `client_secret`.
2. Das **komplette JSON** in das Feld *Service Account (JSON)* einfügen.
3. Optional *Scope* setzen, z. B. `ameise.stocks panda ameise.customer-archives`. Ist das Feld leer, werden alle Scopes des ServiceAccounts angefragt.

n8n signiert für jede Token-Anfrage eine neue Assertion (ES512 mit dem `jwk`, Gültigkeit 5 Sekunden, neue `jti`). Der Access-Token wird mit seinem Ablaufzeitpunkt (`expires_in`, laut Ameise 3600 Sekunden) verschlüsselt in der Credential gespeichert und bis zum Ablauf über alle Ausführungen hinweg wiederverwendet.

- **Erneuerung:** Beim ersten Request nach Ablauf antwortet die API mit `401` (bzw. `403`). n8n holt dann einen neuen Token und wiederholt den Request automatisch. Ein `403` bei gültigem Token (fehlende Rechte) wird als Fehler angezeigt.
- **Parallele Ausführungen:** Starten mehrere Ausführungen gleichzeitig, während kein gültiger Token vorliegt, kann es vereinzelt mehrere Token-Anfragen geben.
- **Credential-Test:** Der Test in den n8n-Credential-Einstellungen holt immer einen frischen Token.

Beachtet das `expires_at` des ServiceAccounts und erneuert ihn rechtzeitig.

### Access Token

Credential **Ameise Access Token API**: Ein vorhandenes Bearer-Token (JWT) wird direkt verwendet. Es läuft ab und muss dann manuell ersetzt werden. Diese Variante eignet sich vor allem für Tests.

### Umgebungen / Base-URLs

Beide Credentials enthalten überschreibbare Base-URLs (Standard: Produktion):

| API | Produktion |
|---|---|
| Panda | `https://panda.ameiseapis.com/public/api/v1` |
| Stocks | `https://stocks.ameiseapis.com/api` (ein älteres `…/api/v1` wird automatisch korrigiert) |
| Archive | `https://customer-archives.ameiseapis.com/api` |

Für die Integrationsumgebung tragt ihr die entsprechenden URLs ein (z. B. Panda: `https://panda-ameiseapis.inte.dionera.dev/public/api/v1`) und verwendet einen ServiceAccount der Integrationsumgebung (Issuer `https://auth.inte.dionera.dev`).

Der Credential-Test ruft `GET {Panda}/insurance-lines` auf.

## Operations

Im Node wählt ihr zuerst die **API**, dann **Resource** und **Operation**.

### Stocks

| Resource | Operations |
|---|---|
| Customer | Create, Get, Get Many, Get Many for Broker, Get Names, Get Logs, Get State, Get Tags, Get All Tags, Update, Update Block Type, Update Broker, Update State, Update Tags, Send Notification |
| Customer Note | Create, Get Many, Update, Delete |
| Customer Communication | Create, Get Many, Update, Delete, Set as Default |
| Customer Address | Get/Update Main Address, Create/Get/Update/Delete Additional Address |
| Customer Relation | Create, Get Many, Delete |
| Customer Suggested Tag | Create, Get Many, Delete (global oder je Vermittler) |
| Contract | Create, Get, Get Many, Get Many for Customer, Get Many Grouped by Address, Get Insured Contracts, Get Sum of Premiums, Get Bank Accounts, Get Aggregated Bank Accounts, Update, Update Address, Update Bank Account, Update Broker, Add Note, Notify Company (VDA), Get Logs, Get Contact People, Validate Policy Number, Get States, Get Lines, Get Cancellation Reasons, Get Line Group Categories |
| Broker (Vermittler) | Get, Get Many, Update, Create Sub-Broker, Get/Update Legal IDs, Get/Update Status, Get Supporter, Set Supporter Role, Update Contractual Dates, Update Bank Account, Update Legal Status, Get Names, Get Parent IDs, Upload/Remove Logo, Get/Update/Reset Legitimation Document Template |
| Broker Employee (Vermittler-Mitarbeiter) | Create, Get, Get Many, Get Many for Broker, Get Special Roles, Update, Set/Remove Contract Signer Role, Set/Remove Customer Supporter Role, Upload Profile/Signature Image |
| Agency (Agentur) | Create, Get, Get Many, Update |
| Company | Get, Get Many, Get Valid Agencies, Get Valid Agencies by BaFin Number |
| Dictionary | Get Blocked Reasons, Get Legal Forms, Get Nations, Get Salutations |

### Archive

| Resource | Operations |
|---|---|
| Archive Entry | Create (inkl. Datei-Upload aus Binary-Feldern), Get, Get by ID, Get Many (Filter, Return All), Get Latest by Tag, Get Logs, Update, Delete, Send Notification, Map ID |
| Archive File | Download (als Binary) |
| Archive Tag | Customer/Contract Tags, Favourite Tags, Latest Entries per Tag |

### Panda

| Resource | Operations |
|---|---|
| Tender | Create, Get, Get Many, Archive, Create Order, Update Cascade Answers |
| Customer Link | Create, Get, Get Many |
| Customer | Get, Update, Get Insurance Lines, Update Cascade Answers |
| Contract | Get Status |
| File | Download (als Binary) |
| Industry / Insurance Line / Insurance Company | Get Many |

## Usage

- **Listen** („Get Many“) mit Paginierung haben *Return All* und *Limit*. Der Node lädt die Seiten über `page`/`pageSize` automatisch nach.
- **Dateien hochladen** (Archive Entry → Create): Unter *Files* gebt ihr das Binary-Feld des Eingabe-Items an (z. B. `data`). Die Datei wird als Data-URI übertragen.
- **Dateien herunterladen** (Archive File, Panda File) liefern ein Binary-Feld, Standardname `data`.
- **Update Fields**: Ein hinzugefügtes, aber leeres Feld wird als `null` gesendet und damit in der Ameise geleert.
- **Cascade Answers** (Panda) erwarten ein JSON-Objekt, z. B. `{"123": "foo", "risk-0-125": "bar"}`.

## Entwicklung

```bash
npm install
npm run build      # kompilieren
npm run lint       # n8n Community-Node-Regeln
npm test           # Unit-Tests (vitest)
npm run dev        # lokales n8n mit dem Node auf http://localhost:5678
```

### Weitere Ameise-API ergänzen

Der Node ist datengetrieben. Jede Operation wird in `nodes/Ameise/resources/<api>/` als Objekt mit Methode, Pfad und Feldern beschrieben. Request-Aufbau, Paginierung, Binärdaten und Fehlerbehandlung übernimmt `nodes/Ameise/shared/execute.ts`.

1. API-Schlüssel und Default-URL in `nodes/Ameise/shared/constants.ts` ergänzen.
2. Base-URL-Feld in `nodes/Ameise/shared/credentialFields.ts` ergänzen.
3. Ordner `nodes/Ameise/resources/<api>/` mit den Resources anlegen und in `nodes/Ameise/resources/index.ts` registrieren.

## Compatibility

Getestet mit n8n 2.44 (Node.js 24).

## Resources

- [n8n Community Nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Ameise-APIs: Authentifizierung](https://docs.blaudirekt.dev/ameise-apis/auth/)

## Version history

Siehe [CHANGELOG.md](CHANGELOG.md).

## Lizenz

[MIT](LICENSE)

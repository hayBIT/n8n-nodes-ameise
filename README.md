# n8n-nodes-ameise

n8n Community Node für die **Ameise-APIs** von blau direkt. Mit einem einzigen Node „Ameise“ lassen sich in n8n-Workflows nutzen:

- **Stocks**: Kunden, Kundennotizen, Kommunikationsdaten, Adressen, Kundenbeziehungen, Tags, Verträge, Vermittler, Vermittler-Mitarbeiter, Gesellschaften/Agenturen und Wertelisten (`/api/v1`)
- **Archive**: Kundenarchiv, also Archiveinträge mit Dateien, Logs und Tags
- **Panda**: Ausschreibungen (Tender), Kundenlinks, Panda-Kundendaten, Sparten, Branchen, Versicherer und Angebotsdateien

[n8n](https://n8n.io/) ist eine [fair-code lizenzierte](https://docs.n8n.io/sustainable-use-license/) Plattform zur Workflow-Automatisierung.

## Installation

In n8n unter **Settings → Community Nodes → Install** den Paketnamen `n8n-nodes-ameise` eintragen. Details stehen in der [Installationsanleitung](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

Der Node unterstützt zwei Anmeldearten (Parameter **Authentication**):

### OAuth2 (Service Account), empfohlen

Credential **Ameise Service Account OAuth2 API**. Sie nutzt den JWT-Bearer-Grant (`urn:ietf:params:oauth:grant-type:jwt-bearer`) laut [Ameise-Dokumentation](https://docs.blaudirekt.dev/ameise-apis/auth/#serviceaccount).

1. In der Ameise einen ServiceAccount anlegen. Ihr erhaltet ein JSON-Dokument mit `issuer`, `token_endpoint`, `audience`, `sub`, `scope`, `jwk`, `client_id` und `client_secret`.
2. Das **komplette JSON** in das Feld *Service Account (JSON)* einfügen.
3. Optional *Scope* setzen, z. B. `ameise.stocks panda ameise.customer-archives`. Ist das Feld leer, werden alle Scopes des ServiceAccounts angefragt.

n8n signiert für jede Token-Anfrage eine neue Assertion (ES512 mit dem `jwk`, Gültigkeit 5 Sekunden, neue `jti`). Der Access-Token wird gecacht und erst erneuert, wenn eine API mit `401` antwortet. Beachtet das `expires_at` des ServiceAccounts und erneuert ihn rechtzeitig.

### Access Token

Credential **Ameise Access Token API**: Ein vorhandenes Bearer-Token (JWT) wird direkt verwendet. Es läuft ab und muss dann manuell ersetzt werden. Diese Variante eignet sich vor allem für Tests.

### Umgebungen / Base-URLs

Beide Credentials enthalten überschreibbare Base-URLs (Standard: Produktion):

| API | Produktion |
|---|---|
| Panda | `https://panda.ameiseapis.com/public/api/v1` |
| Stocks | `https://stocks.ameiseapis.com/api/v1` |
| Archive | `https://customer-archives.ameiseapis.com/api` |

Für die Integrationsumgebung tragt ihr die entsprechenden URLs ein (z. B. Panda: `https://panda-ameiseapis.inte.dionera.dev/public/api/v1`) und verwendet einen ServiceAccount der Integrationsumgebung (Issuer `https://auth.inte.dionera.dev`).

Der Credential-Test ruft `GET {Panda}/insurance-lines` auf.

## Operations

Im Node wählt ihr zuerst die **API**, dann **Resource** und **Operation**.

### Stocks

| Resource | Operations |
|---|---|
| Customer | Create, Get, Get Many, Get Many for Broker, Get Names, Get Logs, Update, Update Block Type, Update Broker, Update State, Update Tags, Send Notification |
| Customer Note | Create, Get Many, Update, Delete |
| Customer Communication | Create, Update, Delete, Set as Default |
| Customer Address | Get/Update Main Address, Get/Update/Delete Additional Address |
| Customer Relation | Create, Get Many, Delete |
| Customer Suggested Tag | Create, Get Many, Delete (global oder je Vermittler) |
| Contract | Create, Update, Update Address, Update Broker, Get Logs, Get Contact People, Validate Policy Number, Get Cancellation Reasons, Get Line Group Categories |
| Broker (Vermittler) | Get, Get Many, Update, Create Sub-Broker, Get/Update Legal IDs, Get/Update Status, Get Supporter, Set Supporter Role, Update Contractual Dates, Update Bank Account, Update Legal Status |
| Broker Employee (Vermittler-Mitarbeiter) | Create, Get, Update |
| Company | Get, Get Many, Get Valid Agencies, Get Valid Agencies by BaFin Number |
| Dictionary | Get Blocked Reasons, Get Legal Forms, Get Nations |

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

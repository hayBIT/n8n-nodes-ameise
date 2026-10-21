# Changelog

## 0.1.0

- Erste Version des Nodes „Ameise“ mit den APIs Stocks (`/api/v1`), Archive und Panda
- Credentials: Ameise Service Account OAuth2 (JWT Bearer) und Access Token
- Token-Erneuerung bei `401` sowie bei `403` mit abgelaufenem Token
- Stocks: alle nicht-deprecated Endpunkte außerhalb von `/api/v1` ohne v1-Entsprechung (u. a. Verträge lesen, Kunden-Tags, Agenturen); Stocks-Base-URL jetzt `…/api`
- Anrede als Auswahlliste aus der API; Stocks steht in der API-Auswahl oben

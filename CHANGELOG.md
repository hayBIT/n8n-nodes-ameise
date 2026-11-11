# Changelog

## 0.2.0

Stocks an die aktualisierte OpenAPI-Spezifikation angepasst:

- Neu: Broker „Get Departments“ (`GET /api/v1/brokers/{brokerId}/departments`) und „Set Sub-Broker Creation“ (`PUT /api/v1/brokers/{brokerId}/sub-broker-creation`)
- Neu: Broker Employee „Update“ kann die öffentlichen Kontaktdaten freigeben (`publicContactDetails`: Adresse, E-Mail, Mobil, Telefon; nur durch den Mitarbeiter selbst)
- Contract „Get Sum of Premiums“ heißt jetzt „Get Premiums Total“ und nutzt `GET /api/v1/customers/{customerId}/contracts/premiums-total` (Jahresbeitrag netto, brutto und Versicherungssteuer); der alte Endpunkt ist deprecated
- Contract „Update Bank Account“ nutzt `PUT /api/v1/contracts/{contractId}/bank-accounts`: neues Pflichtfeld Zahlungsweise (Standard: Lastschrift); die Bankverbindung wird nur bei Lastschrift gesendet, sonst `null`. **In bestehenden Workflows müssen die optionalen Kontoinhaber-Felder (Name, Adresse, Geburtsdatum, Nation) neu gesetzt werden**, IBAN bleibt erhalten.
- Customer Communication „Get Many“ nutzt `GET /api/v1/customers/{customerId}/communications`
- Customer Address „Create Additional Address“ nutzt `POST /api/v1/customers/{customerId}/additional-addresses` und gibt nur noch die ID der neuen Adresse zurück

## 0.1.1

- Archive: Vertrags-IDs von Archiveinträgen werden als Zahlen gesendet

## 0.1.0

- Erste Version des Nodes „Ameise“ mit den APIs Stocks (`/api/v1`), Archive und Panda
- Credentials: Ameise Service Account OAuth2 (JWT Bearer) und Access Token
- Token-Erneuerung bei `401` sowie bei `403` mit abgelaufenem Token
- Stocks: alle nicht-deprecated Endpunkte außerhalb von `/api/v1` ohne v1-Entsprechung (u. a. Verträge lesen, Kunden-Tags, Agenturen); Stocks-Base-URL jetzt `…/api`
- Anrede als Auswahlliste aus der API; Stocks steht in der API-Auswahl oben

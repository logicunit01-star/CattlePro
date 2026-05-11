# Newly added API endpoints (payloads)

Base URL example: `http://localhost:8381`. JSON: `Content-Type: application/json`.

These routes were **added** in the recent backend pass (new paths or new controllers). They do **not** include older CRUD that already existed (e.g. plain `GET/POST /api/livestock` without new paths).

---

## Finance — `/api/finance`

### `POST /api/finance/payments`

```json
{
  "entityId": "string",
  "amount": 1000.0,
  "date": "2026-04-03",
  "type": "RECEIPT",
  "notes": "optional",
  "paymentMethod": "CASH"
}
```

### `GET /api/finance/summary`

Query (no body): `farmId` (optional), `from` (optional `yyyy-MM-dd`), `to` (optional `yyyy-MM-dd`).

### `GET /api/finance/profitability/animals`

Query (no body): `farmId` **(required)**, `status` (optional, default `ALL`).

### `POST /api/finance/expenses/{id}/payments`

```json
{
  "amount": 500.0,
  "date": "2026-04-03",
  "paymentMethod": "BANK",
  "notes": "optional"
}
```

### `POST /api/finance/sales/{id}/payments`

Same JSON body as expense payment above.

---

## Entities — `/api/entities`

### `GET /api/entities/{id}/ledger`

No body. Path: `id` = entity id.

### `PATCH /api/entities/{id}/balance-adjustment`

```json
{
  "amount": 100.0,
  "direction": "CREDIT",
  "date": "2026-04-03",
  "reason": "Opening correction"
}
```

`direction`: `CREDIT` or `DEBIT`.

---

## Operations — `/api/operations`

### `PUT /api/operations/feed-ledgers/{id}`

Partial body (send fields to update):

```json
{
  "processedBy": "user@example.com",
  "date": "2026-04-03",
  "farmId": "string",
  "dietPlanId": "string",
  "totalAnimalsFed": 10,
  "totalCost": 1234.5,
  "status": "PROCESSED"
}
```

### `POST /api/operations/feed/adjustments`

```json
{
  "feedItemId": "feed-inventory-id",
  "direction": "INCREASE",
  "quantity": 10.0,
  "reason": "Stock count correction"
}
```

`direction`: `INCREASE` or `DECREASE`.

### `GET /api/operations/inventory/valuation`

Query (no body): `farmId` (optional).

### `GET /api/operations/feed/low-stock`

Query (no body): `farmId` (optional).

---

## Procurement — `/api/procurement`

### `POST /api/procurement/feed-purchases`

**Existing row:**

```json
{
  "farmId": "required",
  "feedItemId": "existing-feed-inventory-id",
  "vendorId": "optional",
  "quantity": 500.0,
  "unitCost": 2.5,
  "amount": 1250.0,
  "amountPaid": 1250.0,
  "date": "2026-04-03",
  "batchNumber": "optional",
  "expiryDate": "optional",
  "description": "optional"
}
```

**New row:**

```json
{
  "farmId": "required",
  "newFeedItem": {
    "name": "Alfalfa",
    "category": "FEED",
    "unit": "KG",
    "reorderLevel": 100.0,
    "feedType": "TMR"
  },
  "vendorId": "optional",
  "quantity": 100.0,
  "unitCost": 1.0,
  "amount": 100.0,
  "amountPaid": 0.0,
  "date": "2026-04-03"
}
```

---

## Sync — `/api/sync`

### `POST /api/sync/mobile-mutations`

```json
{
  "mutations": [
    {
      "clientMutationId": "client-uuid-1",
      "operation": "WEIGHT_RECORD_CREATE",
      "payload": {
        "livestockId": "animal-id",
        "weight": 450.5,
        "date": "2026-04-03",
        "id": "optional-client-id",
        "notes": "optional"
      }
    }
  ]
}
```

Supported `operation` values: `WEIGHT_RECORD_CREATE`, `WEIGHT_RECORD_UPSERT` (same handling).

---

## Palai — `/api/palai`

### `GET /api/palai/clients`

No body.

### `POST /api/palai/clients`

Body: **`BusinessEntity`** JSON (e.g. `name`, `farmId`, `contact`, `email`, …). Server sets `type` to `PALAI_CLIENT`.

### `POST /api/palai/assignments`

```json
{
  "livestockId": "animal-id",
  "clientId": "business-entity-id"
}
```

### `POST /api/palai/invoices`

Body: **`Sale`** entity JSON (same shape as finance sales).

### `POST /api/palai/invoices/{id}/payments`

```json
{
  "amount": 500.0,
  "date": "2026-04-03",
  "paymentMethod": "CASH",
  "notes": "optional"
}
```

### `GET /api/palai/summary`

No body.

---

## Notifications — `/api/notifications`

### `GET /api/notifications`

No body.

### `POST /api/notifications`

```json
{
  "id": "optional-uuid",
  "title": "Title",
  "message": "Body",
  "readFlag": false
}
```

### `PATCH /api/notifications/{id}/read`

No body.

---

## Users directory — `/api/users`

### `GET /api/users`

No body.

### `POST /api/users`

```json
{
  "id": "optional",
  "email": "user@example.com",
  "displayName": "Name",
  "role": "STAFF"
}
```

### `PUT /api/users/{id}`

Same JSON fields as `POST`; path `id` is the user id.

### `DELETE /api/users/{id}`

No body.

---

## Reports (aliases) — `/api/reports` **and** `/reports`

Same paths on both prefixes.

### `GET /api/reports/mobile-dashboard`

No body. Returns a JSON object: `summary`, `kpis` (dashboard aggregates).

### `GET /api/reports/financial`

Query (no body): `farmId`, `interval` (default `monthly`), `startDate`, `endDate`, `accrual` (default `false`) — same as `financial-overview`.

### `GET /api/reports/herd`

Query (no body): `farmId` **(required)**, `status` (optional, default `ALL`).

### `GET /api/reports/operations`

Query (no body): `farmId` (optional), `medicineExpiryDays` (optional, default `30`).

### `GET /api/reports/logs`

Query (no body): `farmId` (optional), `limit` (optional, default `100`, max `500`).

---

## Livestock — one new path only

### `PATCH /api/livestock/{id}/status`

```json
{
  "status": "ACTIVE",
  "palaiCustomerId": "optional-or-omit"
}
```

---

Full OpenAPI surface (including older routes): `GET /v3/api-docs` · Swagger UI: `/swagger-ui`.

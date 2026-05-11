# API Reference Guide — Cattle Pro

Base URL example: `http://localhost:8381` (see your deployment). JSON bodies: `Content-Type: application/json`.

**Authoritative spec:** OpenAPI `GET /v3/api-docs` · Swagger UI `/swagger-ui`

---

## Finance — `/api/finance`

Money-related APIs: entity payments, summaries, profitability, and partial payments on expenses and sales.

### Record a payment (entity balance)

**`POST /api/finance/payments`**

Logs a payment against a **BusinessEntity** (customer, vendor, etc.). Persists a **`PaymentTransaction`** (`refType`: `ENTITY`), updates **`currentBalance`**, and appends a **`LedgerRecord`**.

| Field | Type | Notes |
|--------|------|--------|
| `entityId` | string | **Required.** Entity this payment applies to. |
| `amount` | number | **Required.** Must be &gt; 0. |
| `date` | string | Optional. `yyyy-MM-dd` (or ISO string; first 10 chars used). Omitted → **today**. |
| `type` | string | Optional label (e.g. `RECEIPT`, `PAYMENT`). Used in ledger text. **Current behaviour:** balance is always adjusted by **subtracting** `amount` regardless of `type` — do not assume different debit/credit semantics per type until the API documents otherwise. |
| `paymentMethod` | string | Optional; defaults to `CASH` if omitted. |
| `notes` | string | Optional. |

---

### Get financial summary

**`GET /api/finance/summary`**

Aggregates sales and expenses in a date window. **All query parameters are optional.**

| Query | Notes |
|--------|--------|
| `farmId` | Filter by farm. |
| `from` | Start date `yyyy-MM-dd`. Default: **30 days ago**. |
| `to` | End date `yyyy-MM-dd`. Default: **today**. |

---

### Animal profitability report

**`GET /api/finance/profitability/animals`**

Profit / cost view **per animal** (same data as the reports animal-profitability endpoint).

| Query | Notes |
|--------|--------|
| `farmId` | **Required.** |
| `status` | Optional; default `ALL`. Can be a `LivestockStatus` name (e.g. `ACTIVE`) when not `ALL`. |

---

### Pay against an expense

**`POST /api/finance/expenses/{id}/payments`**

`{id}` = expense id. Creates a **`PaymentTransaction`** with `refType` `EXPENSE` and updates the expense **`amountPaid`** / **`paymentStatus`**.

| Field | Type | Notes |
|--------|------|--------|
| `amount` | number | **Required.** &gt; 0. |
| `date` | string | Optional `yyyy-MM-dd`. Omitted → **today**. |
| `paymentMethod` | string | Optional; default `CASH`. |
| `notes` | string | Optional. |

---

### Pay against a sale

**`POST /api/finance/sales/{id}/payments`**

Same JSON fields as expense payment; applies to the sale with `id` in the path. Updates sale **`paymentStatus`** using payment rows plus any legacy **`amountReceived`** on the sale.

---

## Entities — `/api/entities`

Parties you deal with: customers, vendors, Palai clients, etc. ( **`BusinessEntity`** ).

### View entity ledger

**`GET /api/entities/{id}/ledger`**

Returns **`LedgerRecord`** rows for that `entityId`. **No body.** Order is **newest-first** from persistence.

---

### Adjust an entity’s balance

**`PATCH /api/entities/{id}/balance-adjustment`**

Manual corrections (opening balance fixes, write-offs, etc.).

| Field | Type | Notes |
|--------|------|--------|
| `amount` | number | **Required.** &gt; 0. |
| `direction` | string | `CREDIT` (increase balance) or `DEBIT` (decrease). If omitted, treated as **`CREDIT`**. |
| `date` | string | Optional `yyyy-MM-dd`. Omitted → **today**. |
| `reason` | string | Optional; stored on ledger line. |

---

## Operations — `/api/operations`

Feed ledgers, inventory, stock.

### Update a feed ledger entry

**`PUT /api/operations/feed-ledgers/{id}`**

Send only fields to change. **Not allowed** if the ledger’s status is already **`REVERSED`**. Do not use this endpoint to reverse a ledger (use the **reverse** endpoint instead).

| Field | Type | Notes |
|--------|------|--------|
| `processedBy` | string | Free text (e.g. name or email); **not validated** as an email address. |
| `date` | string | `yyyy-MM-dd` |
| `farmId` | string | |
| `dietPlanId` | string | |
| `totalAnimalsFed` | number | |
| `totalCost` | number | |
| `status` | string | e.g. `PROCESSED`. Do not set to `REVERSED` here. |

---

### Adjust feed inventory

**`POST /api/operations/feed/adjustments`**

Physical count corrections.

| Field | Type | Notes |
|--------|------|--------|
| `feedItemId` | string | **Required.** Feed inventory row id. |
| `direction` | string | **`INCREASE`** or **`DECREASE`**. Default if omitted: `INCREASE`. |
| `quantity` | number | **Required.** &gt; 0. |
| `reason` | string | Optional. |

---

### Inventory valuation

**`GET /api/operations/inventory/valuation`**

Optional query: **`farmId`**. Returns rows with quantity × unit cost (see **`InventoryValuationRowDto`** in OpenAPI). **No body.**

---

### Low stock alert

**`GET /api/operations/feed/low-stock`**

Lists feed items where **`reorderLevel` &gt; 0** and **`quantity` ≤ `reorderLevel`**. Optional query: **`farmId`**. **No body.**

---

## Procurement — `/api/procurement`

Purchasing feed: add to an existing stock row or create a new **`FeedInventory`** plus a linked **FEED** **`Expense`**.

### Record a feed purchase

**`POST /api/procurement/feed-purchases`**

#### Option A — Existing feed item

| Field | Type | Notes |
|--------|------|--------|
| `farmId` | string | **Required.** |
| `feedItemId` | string | **Required** for this option. |
| `vendorId` | string | Optional. |
| `quantity` | number | **Required.** &gt; 0. |
| `unitCost` | number | |
| `amount` | number | Total; if omitted, derived as `quantity × unitCost` when possible. |
| `amountPaid` | number | Optional. |
| `date` | string | `yyyy-MM-dd`; defaults if invalid/empty. |
| `batchNumber` | string | Optional. |
| `expiryDate` | string | Optional. |
| `description` | string | Optional. |

#### Option B — New feed item

| Field | Type | Notes |
|--------|------|--------|
| `farmId` | string | **Required.** |
| `newFeedItem` | object | **Required** for this option (instead of `feedItemId`). |
| `newFeedItem.name` | string | **Required** inside object. |
| `newFeedItem.category` | string | e.g. `FEED` (invalid values may fall back server-side). |
| `newFeedItem.unit` | string | e.g. `KG`; default `KG` if empty. |
| `newFeedItem.reorderLevel` | number | Optional. |
| `newFeedItem.feedType` | string | e.g. `TMR` (invalid may map to `OTHER`). |
| `vendorId` | string | Optional. |
| `quantity` | number | **Required.** &gt; 0. |
| `unitCost` | number | |
| `amount` | number | |
| `amountPaid` | number | |
| `date` | string | `yyyy-MM-dd` |

---

## Sync — `/api/sync`

Bulk apply **whitelisted** offline actions from mobile clients.

### Submit mobile mutations

**`POST /api/sync/mobile-mutations`**

Each item should include a **`clientMutationId`** your app generates so you can **match** responses (`idMappings` / `failures`) to local queue rows. Unsupported operations are **not** executed; they appear under **`failures`**.

```json
{
  "mutations": [
    {
      "clientMutationId": "a unique ID you generate",
      "operation": "WEIGHT_RECORD_CREATE",
      "payload": {
        "livestockId": "animal-id",
        "weight": 450.5,
        "date": "2026-04-03",
        "id": "optional",
        "notes": "optional"
      }
    }
  ]
}
```

**Supported operations:** `WEIGHT_RECORD_CREATE`, `WEIGHT_RECORD_UPSERT` (same handling).

**Response shape:** `success`, `idMappings[]` (`clientMutationId`, `resourceType`, `serverId`), `failures[]` (`clientMutationId`, `operation`, `error`). `success` is `true` only if there are no failures.

---

## Palai — `/api/palai`

Client / consignment style flows: Palai clients, assignments, invoices (sales), payments.

### List all Palai clients

**`GET /api/palai/clients`** — no body. Returns **`BusinessEntity`** rows with **`type`** `PALAI_CLIENT`.

### Add a Palai client

**`POST /api/palai/clients`**

Body: **`BusinessEntity`** (e.g. `name`, `farmId`, `contact`, `email`, …). Server sets **`type`** to **`PALAI_CLIENT`**.

### Assign an animal to a client

**`POST /api/palai/assignments`**

| Field | Type |
|--------|------|
| `livestockId` | string |
| `clientId` | string |

Both **required.** Sets **`Livestock.palaiCustomerId`**.

### Create a Palai invoice

**`POST /api/palai/invoices`**

Body: **`Sale`** (same shape as finance sales). Persisted via **`saveSale`**.

### Record payment on a Palai invoice

**`POST /api/palai/invoices/{id}/payments`**

| Field | Type | Notes |
|--------|------|--------|
| `amount` | number | **Required.** |
| `date` | string | Optional `yyyy-MM-dd`; default today. |
| `paymentMethod` | string | Optional; default `CASH`. |
| `notes` | string | Optional. |

### Palai summary

**`GET /api/palai/summary`** — no body.

Returns a **small JSON object** (e.g. **`tenantId`**, **`palaiClientCount`**). It is **not** a full activity dashboard; use other endpoints for detail.

---

## Notifications — `/api/notifications`

In-app **`UserNotification`** records (tenant-scoped when tenant context is set).

### Get all notifications

**`GET /api/notifications`** — no body.

### Create a notification

**`POST /api/notifications`**

| Field | Type | Notes |
|--------|------|--------|
| `id` | string | Optional; server can generate. |
| `title` | string | |
| `message` | string | Body text (JSON property name is **`message`**). |
| `readFlag` | boolean | Optional; default **false** for new. |

### Mark as read

**`PATCH /api/notifications/{id}/read`** — no body.

---

## Users — `/api/users`

**Directory API** for **`AppUser`** records (id, email, displayName, role, tenant). This is **not** automatically the same as **login / authentication** unless your deployment wires these rows into your auth provider.

### List all users

**`GET /api/users`** — no body.

### Create a user

**`POST /api/users`**

| Field | Type | Notes |
|--------|------|--------|
| `id` | string | Optional. |
| `email` | string | |
| `displayName` | string | |
| `role` | string | e.g. `STAFF` |

### Update a user

**`PUT /api/users/{id}`** — same fields as create; path **`id`** wins.

### Delete a user

**`DELETE /api/users/{id}`** — no body.

---

## Reports — `/api/reports` **or** `/reports`

Both prefixes are equivalent.

### Mobile dashboard

**`GET /api/reports/mobile-dashboard`** (or `/reports/mobile-dashboard`)

| Query | Notes |
|--------|--------|
| `farmId` | Optional. If provided, metrics are scoped to that farm. |
| `locationId` | Optional. Used only when `farmId` is not provided; includes farms under this location. |
| `from` | Optional `yyyy-MM-dd`. Default is last 30 days. |
| `to` | Optional `yyyy-MM-dd`. Default is today. |

Returns:
- `summary` (`DashboardSummary`) with totals in the resolved date window.
- `kpis` (`DashboardKpis`) built from the same scoped data.

### Financial report

**`GET /api/reports/financial`**

| Parameter | Notes |
|------------|--------|
| `farmId` | Optional filter. |
| `interval` | Default **`monthly`**. |
| `startDate` | `yyyy-MM-dd` |
| `endDate` | `yyyy-MM-dd` |
| `accrual` | Default **`false`**. |

### Herd report

**`GET /api/reports/herd`**

| Query | Notes |
|--------|--------|
| `farmId` | **Required.** |
| `status` | Optional; default **`ALL`**. |

### Operations report

**`GET /api/reports/operations`**

| Query | Notes |
|--------|--------|
| `farmId` | Optional. |
| `from` | Optional `yyyy-MM-dd`. Echoed in response; reserved for windowed rollups. |
| `to` | Optional `yyyy-MM-dd`. Echoed in response; reserved for windowed rollups. |
| `medicineExpiryDays` | Default **30**. |

Returns compact aggregate object:
- `farmId`, `from`, `to`
- `lowStockCount`
- `lowStockTotalQuantity`
- `medicineExpiringCount`

### Activity log

**`GET /api/reports/logs`**

| Query | Notes |
|--------|--------|
| `farmId` | Optional. |
| `from` | Optional `yyyy-MM-dd`. |
| `to` | Optional `yyyy-MM-dd`. |
| `type` | Optional string (echoed in response for client-side classification). |
| `limit` | Default **100**, max **500**. |

Returns compact aggregate object:
- `farmId`, `from`, `to`, `type`
- `rowsCount`
- `totalQuantityUsed`
- `totalCost`
- `distinctItems`
- `distinctAnimals`

---

## Livestock — status update

### Change an animal’s status (and optional Palai link)

**`PATCH /api/livestock/{id}/status`**

| Field | Type | Notes |
|--------|------|--------|
| `status` | string | Optional only if you still send `palaiCustomerId`. If set, must be a valid enum: **`ACTIVE`**, **`SICK`**, **`SOLD`**, **`DECEASED`** (case-insensitive). |
| `palaiCustomerId` | string | Optional. Empty string **clears** the link. |

---

*For response DTOs and enums, prefer the live OpenAPI document over this guide.*

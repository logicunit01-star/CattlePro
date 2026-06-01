# CattlePro Backend API Audit v2.0

Audit date: 2026-06-01  
Auditor view: senior QA engineer, head of product, and management-risk auditor  
Swagger validated: `http://139.59.8.119:8381/swagger-ui` and `GET /v3/api-docs`  
Live API title/version: `CattlePro API` / Swagger `1.0`  
Document version: 2.0

## Executive Summary

The backend API has materially improved since the first audit. Most of the critical v1 blockers are now visible in Swagger, including farm/location update and delete, medical/weight/milk record edit and delete, sale update and reverse, feed-purchase read/update/reverse, inventory movement history, Palai invoice list/detail/void, audit logs, notification unread count, and notification bulk read.

The backend is now close to supporting a production-grade frontend, but a few governance and accounting gaps remain. The most important remaining backend concerns are role/current-user discovery, explicit expense reversal, stronger correction semantics around delete versus reverse, API versioning metadata, and final frontend integration of the new endpoints.

## Swagger Validation Snapshot

Validated live Swagger returned 131 paths.

Major exposed modules:

- Tenant setup
- Dashboard
- Livestock
- Finance
- Financials
- Entities
- Categories
- Operations
- Inventory
- Inventory movement
- Procurement
- Palai
- Reports
- Users
- Notifications
- Audit logs
- Mobile sync

Operational note:

- Swagger UI is reachable.
- `/v3/api-docs` fetched successfully with compressed JSON.
- Swagger document still advertises version `1.0`; this document should be treated as audit version `2.0`, not API semantic version `2.0`.

## Resolved Since v1 Audit

### Farm and Location Lifecycle

Now present:

- `GET /api/operations/locations`
- `POST /api/operations/locations`
- `PUT /api/operations/locations/{id}`
- `DELETE /api/operations/locations/{id}`
- `PATCH /api/operations/locations/{id}/status`
- `GET /api/operations/farms`
- `POST /api/operations/farms`
- `PUT /api/operations/farms/{id}`
- `DELETE /api/operations/farms/{id}`
- `PATCH /api/operations/farms/{id}/status`

Audit result: v1 backend blocker resolved.

Remaining validation:

- Confirm delete returns a structured conflict when linked livestock, inventory, ledgers, expenses, assets, or Palai records exist.
- Confirm `force=false` default is enforced server-side.
- Confirm deactivate/status update is the preferred workflow for linked records.

### Animal History Correction

Now present:

- `PUT /api/livestock/{id}/medical-records/{recordId}`
- `DELETE /api/livestock/{id}/medical-records/{recordId}`
- `PUT /api/livestock/{id}/weight-records/{recordId}`
- `DELETE /api/livestock/{id}/weight-records/{recordId}`
- `PUT /api/livestock/{id}/milk-records/{recordId}`
- `DELETE /api/livestock/{id}/milk-records/{recordId}`

Audit result: v1 backend blocker resolved.

Remaining validation:

- Confirm medical record edit/delete reverses or adjusts medicine inventory.
- Confirm linked medical/vaccine expenses are updated or reversed safely.
- Confirm deleting the latest weight record recalculates the animal's current weight.
- Confirm milk production reports recalculate after corrections.
- Confirm each correction writes an audit log entry.

### Sale Transaction Lifecycle

Now present:

- `GET /api/finance/sales`
- `POST /api/finance/sales`
- `POST /api/finance/sales/bulk`
- `PUT /api/finance/sales/{id}`
- `DELETE /api/finance/sales/{id}`
- `POST /api/finance/sales/{id}/reverse`
- `GET /api/finance/sales/{id}/invoice`
- `POST /api/finance/sales/{id}/payments`

Audit result: mostly resolved.

Remaining backend concern:

- No `POST /api/finance/sales/{id}/void` endpoint is visible. This is acceptable if `reverse` is the canonical correction action, but the API description should avoid saying "reverse/void" unless both are supported.
- `DELETE /api/finance/sales/{id}` remains risky unless it is clearly documented as either hard delete, soft delete, or a ledger-safe reversal.

Required QA validation:

- Create animal sale and confirm livestock status becomes `SOLD`.
- Reverse sale and confirm animal status, receivable, payment, ledger, and profit metrics are restored or adjusted.
- Retry sale creation with the same `clientMutationId` and confirm no duplicate sale appears.

### Procurement Feed Purchase Lifecycle

Now present:

- `GET /api/procurement/feed-purchases`
- `POST /api/procurement/feed-purchases`
- `GET /api/procurement/feed-purchases/{id}`
- `PUT /api/procurement/feed-purchases/{id}`
- `POST /api/procurement/feed-purchases/{id}/reverse`
- `POST /api/procurement/repair`

Audit result: v1 backend blocker resolved.

Remaining validation:

- Confirm editing a purchase applies only the inventory delta.
- Confirm reversing a purchase restores feed quantity, expense/payable balance, ledger, and inventory movement history.
- Confirm supplier payment status remains consistent after reversal.

### Inventory Movement Ledger

Now present:

- `GET /api/operations/inventory-movements`
- `GET /api/operations/inventory-movements/{itemId}`
- `GET /api/operations/inventory-movements/by-item/{itemId}`
- `GET /api/operations/inventory-movements/{movementId}/audit`

Audit result: v1 backend blocker resolved.

Remaining validation:

- Confirm every stock-changing action creates a movement: purchase, manual adjustment, diet processing, treatment use, medical inventory use, reversal, expiry, and write-off.
- Confirm movement audit links back to reference type and reference ID.
- Confirm quantity direction and unit conversions are consistent.

### Palai Lifecycle

Now present:

- `GET /api/palai/clients`
- `POST /api/palai/clients`
- `POST /api/palai/assignments`
- `DELETE /api/palai/assignments/{livestockId}`
- `POST /api/palai/assignments/{livestockId}/transfer`
- `GET /api/palai/invoices`
- `POST /api/palai/invoices`
- `GET /api/palai/invoices/{id}`
- `POST /api/palai/invoices/{id}/payments`
- `POST /api/palai/invoices/{id}/void`
- `GET /api/palai/packages/history`
- `POST /api/palai/packages/{livestockId}`
- `GET /api/palai/summary`

Audit result: v1 backend blocker resolved.

Remaining validation:

- Confirm unassign prevents billing an inactive Palai assignment.
- Confirm transfer preserves package history and billing dates.
- Confirm voiding a Palai invoice reverses ledger, receivable, and payment state safely.

### Notifications and Audit Logs

Now present:

- `GET /api/notifications`
- `POST /api/notifications`
- `PUT /api/notifications/{id}/read`
- `PATCH /api/notifications/{id}/read`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read-all`
- `POST /api/notifications/preferences`
- `POST /api/notifications/register-device`
- `GET /api/audit-logs`

Audit result: v1 backend blocker mostly resolved.

Remaining validation:

- Confirm unread count respects tenant and user scope.
- Confirm read-all affects only the authenticated user.
- Confirm audit logs can filter by `entityType`, `entityId`, and `limit`.
- Confirm audit entries include actor, action, before/after values, timestamp, tenant, and reference ID.

## Remaining Backend Gaps

### 1. Current User and Role Discovery

Missing from Swagger:

- `GET /api/users/me`
- `GET /api/roles`

Impact:

- Frontend cannot reliably render permission-aware navigation.
- Destructive action gating remains UI-local or role-string based.
- Team management cannot load a canonical role catalog.

Recommended backend update:

- Add `GET /api/users/me` returning authenticated user, tenant, roles, permissions, and feature flags.
- Add `GET /api/roles` returning allowed roles and permission groups.
- Optional: add `PATCH /api/users/{id}/status` and `PUT /api/users/{id}/role` if the full `PUT /api/users/{id}` should not be used for these narrow actions.

### 2. Expense Reversal Is Still Not Explicit

Present:

- `PUT /api/finance/expenses/{id}`
- `DELETE /api/finance/expenses/{id}`
- `POST /api/finance/expenses/{id}/payments`

Missing from Swagger:

- `POST /api/finance/expenses/{id}/reverse`

Impact:

- Frontend can edit/delete expenses, but ledger-safe correction language is weaker than sales and procurement.
- QA cannot clearly distinguish hard delete from audited reversal for expenses.

Recommended backend update:

- Add `POST /api/finance/expenses/{id}/reverse`.
- If delete is ledger-safe, document exact side effects in Swagger.
- If delete is hard delete, restrict it to admin/force workflows and recommend reverse for production corrections.

### 3. Delete Versus Reverse Semantics Need Stronger Contract

Risk areas:

- `DELETE /api/finance/sales/{id}`
- `DELETE /api/finance/expenses/{id}`
- `DELETE /api/operations/farms/{id}`
- `DELETE /api/operations/locations/{id}`
- Animal history record deletes

Recommended backend update:

- Standardize delete responses with `deleted`, `reversed`, `blockedReason`, `affectedRecordIds`, and `auditLogId` where applicable.
- Document `force` behavior for destructive deletes.
- Prefer reverse/void endpoints for financial and inventory-affecting workflows.

### 4. Swagger Metadata Should Be Updated

Current issue:

- API info version still says `1.0`.

Recommended backend update:

- Keep semantic API version if intended, but add changelog/release notes for the v2 audit improvements.
- Add examples for high-risk mutations: sale reverse, purchase reverse, Palai void, payment reverse, medical inventory use.

### 5. Local Mock API Is Now Out of Date

The local `api-server` appears to be a lightweight Express mock and does not match the production Swagger surface. It should not be used as proof of backend production behavior.

Recommended update:

- Either document it as a demo-only mock or update it to cover the v2 critical endpoints.
- Add a warning in developer setup if frontend is pointed at the mock instead of the live backend.

## Backend Priority List

Critical:

- Add or document current-user and role APIs.
- Add explicit expense reversal or document delete as ledger-safe.
- Finalize delete/reverse response contracts.
- Validate idempotency with `clientMutationId` across sale, expense, payment, feed purchase, diet process, protocol apply, livestock create, and Palai invoice mutations.

High:

- Add Swagger examples for correction workflows.
- Confirm audit logs capture before/after values for all critical updates.
- Confirm every inventory quantity change creates an inventory movement.

Medium:

- Version API documentation or publish release notes for the v2 backend expansion.
- Align local mock server with production or label it demo-only.

## QA Regression Checklist

Run these checks against a seeded tenant:

- Create, edit, deactivate, and blocked-delete a farm with linked livestock.
- Create, edit, deactivate, and blocked-delete a location with linked farms.
- Create/edit/delete medical, weight, and milk records and validate derived animal/report values.
- Create a sale, add partial payment, reverse sale, and verify ledger/animal/entity state.
- Create an expense, add payment, delete or reverse it, and verify ledger/entity state.
- Create feed purchase, edit purchase quantity/cost, reverse purchase, and inspect inventory movements.
- Apply diet plan and treatment protocol and verify inventory movements.
- Assign, transfer, unassign Palai animal; generate, pay, and void invoice.
- Confirm notification unread count and read-all are user-scoped.
- Confirm audit log filters by entity and shows the expected actor/action metadata.


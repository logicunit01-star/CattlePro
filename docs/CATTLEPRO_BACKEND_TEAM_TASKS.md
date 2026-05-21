# CattlePro Backend Team Tasks

Audit date: 2026-05-20  
Swagger validated: `http://139.59.8.119:8381/swagger-ui` through `GET /v3/api-docs`  
API title: CattlePro API v1.0  
Primary objective: make backend the source of truth for livestock, inventory, finance, Palai, reports, permissions, and audit-sensitive workflows.

## Executive Priority

The backend already exposes a broad API surface, but the product still has duplicated workflows because several business rules are handled in the frontend. The highest backend priority is to make sale, purchase, payment, inventory movement, animal status, Palai billing, and correction workflows atomic and auditable.

Critical backend themes:

- Complete missing CRUD where the frontend has add-only history records.
- Move transaction logic out of React and into backend services.
- Add inventory movement and financial reconciliation APIs.
- Add idempotency to prevent duplicate sales, expenses, payments, and feed processing.
- Make reports, dashboard, and financials use the same metric formulas.
- Add admin, role, notification, and audit APIs for production governance.

## Swagger Validation Status

Validated modules exposed by live Swagger:

- Tenant setup
- Dashboard
- Livestock
- Finance
- Financials
- Entities
- Categories
- Operations
- Inventory medicine expirations
- Procurement
- Palai
- Reports
- Users
- Notifications
- Mobile sync

Backend API coverage is strong for basic read/create/update/delete across top-level modules, but incomplete for sub-record correction, farm/location lifecycle, inventory movement history, Palai lifecycle, payment lifecycle, and production admin permissions.

## Critical Backend Blockers

### 1. Farm and Location CRUD Is Incomplete

Current live API:

- `GET /api/operations/locations`
- `POST /api/operations/locations`
- `GET /api/operations/farms`
- `POST /api/operations/farms`

Missing backend updates:

- `PUT /api/operations/locations/{id}`
- `PATCH /api/operations/locations/{id}/status`
- `DELETE /api/operations/locations/{id}` if hard delete is allowed
- `PUT /api/operations/farms/{id}`
- `PATCH /api/operations/farms/{id}/status`
- `DELETE /api/operations/farms/{id}` if hard delete is allowed

Validation rules:

- Do not hard-delete a location with linked farms.
- Do not hard-delete a farm with livestock, expenses, sales, inventory, assets, diet plans, treatment logs, or ledgers.
- Prefer deactivate/archive over hard delete.
- Enforce tenant isolation on all farm/location operations.

Acceptance criteria:

- Backend supports edit/deactivate for farms and locations.
- Swagger documents request/response schemas.
- Linked-record deletion conflicts return clear structured errors.

### 2. Animal History CRUD Is Incomplete

Current live API:

- Medical records: create only.
- Weight records: create only.
- Milk records: create only.
- Breeding records: create, update, delete.

Missing backend updates:

- `PUT /api/livestock/{id}/medical-records/{recordId}`
- `DELETE /api/livestock/{id}/medical-records/{recordId}`
- `PUT /api/livestock/{id}/weight-records/{recordId}`
- `DELETE /api/livestock/{id}/weight-records/{recordId}`
- `PUT /api/livestock/{id}/milk-records/{recordId}`
- `DELETE /api/livestock/{id}/milk-records/{recordId}`

Business rules:

- Medical record edit/delete must adjust linked medicine stock when `inventoryId` and `quantityUsed` exist.
- Medical record edit/delete must update or reverse linked medical/vaccine expense when cost changes.
- Weight record edit must update current livestock weight if the edited/deleted record was the latest record.
- Milk record edit/delete must preserve production report accuracy.
- All correction actions should write an audit event.

Acceptance criteria:

- Animal history can be corrected without full livestock `PUT`.
- Inventory and expense side effects stay consistent.
- Audit logs capture before/after values for edits and deletes.

### 3. Sale Transaction API Needs to Be Canonical

Current live API:

- `POST /api/finance/sales`
- `POST /api/finance/sales/bulk`
- `DELETE /api/finance/sales/{id}`
- `GET /api/finance/sales/{id}/invoice`
- `POST /api/finance/sales/{id}/payments`

Backend updates needed:

- Add `PUT /api/finance/sales/{id}` for controlled correction.
- Add `POST /api/finance/sales/{id}/reverse` or `POST /api/finance/sales/{id}/void`.
- Document whether `DELETE /api/finance/sales/{id}` is hard delete, soft delete, or reversal.
- Add idempotency using `clientMutationId`.

Sale creation must atomically:

- Create the sale.
- Update animal status to `SOLD` for animal sales.
- Persist `farmId` reliably.
- Calculate estimated profit using purchase, feed, and medical cost.
- Create ledger entries.
- Create receivable if unpaid or partial.
- Record payment if paid or partially paid.
- Return updated sale, affected livestock IDs/statuses, ledger entries, and payment details.

Acceptance criteria:

- Frontend no longer needs to manually update animal status after sale.
- Sale delete/reverse restores animal status and ledger correctly.
- Duplicate client submissions do not create duplicate sales.

### 4. Procurement Purchase API Needs Full Lifecycle

Current live API:

- `POST /api/procurement/feed-purchases`

Backend updates needed:

- `PUT /api/procurement/feed-purchases/{id}`
- `POST /api/procurement/feed-purchases/{id}/reverse`
- `GET /api/procurement/feed-purchases`
- `GET /api/procurement/feed-purchases/{id}`

Feed purchase must atomically:

- Create or update feed inventory.
- Create expense or bill record.
- Update vendor payable or payment status.
- Write ledger entries.
- Write inventory movement record.
- Return feed item, expense/bill, ledger entries, inventory movement IDs, and message.

Acceptance criteria:

- Procurement frontend does not manually update expense and feed separately.
- Editing a purchase adjusts inventory delta, expense amount, and vendor ledger.
- Reversing a purchase restores inventory and financial balances.

### 5. Inventory Movement Ledger Is Missing

Current state:

- Inventory quantity changes from procurement, diet processing, treatment logs, medical records, and manual adjustments.
- No dedicated stock-card API is visible in Swagger.

Backend updates needed:

- `GET /api/operations/inventory-movements`
- `GET /api/operations/inventory-movements/{itemId}`
- Optional: `GET /api/operations/inventory-movements/{movementId}/audit`

Movement fields:

- `id`
- `tenantId`
- `farmId`
- `itemId`
- `itemName`
- `movementType`: PURCHASE, DIET_CONSUMPTION, TREATMENT_CONSUMPTION, MEDICAL_CONSUMPTION, ADJUSTMENT, REVERSAL, EXPIRY, WRITE_OFF
- `direction`: IN, OUT
- `quantity`
- `unit`
- `unitCost`
- `totalCost`
- `referenceType`
- `referenceId`
- `date`
- `createdBy`
- `notes`
- `createdAt`

Backend writes movements for:

- Feed purchase
- Manual stock adjustment
- Diet processing
- Diet reversal
- Treatment protocol application
- Medical record with inventory usage
- Expense/purchase reversal
- Expiry/write-off

Acceptance criteria:

- Inventory valuation and stock reports can be traced to movement records.
- Every stock quantity change is auditable.

### 6. Payment Lifecycle Needs Reconciliation Guarantees

Current live API:

- `POST /api/finance/expenses/{id}/payments`
- `POST /api/finance/sales/{id}/payments`
- `POST /api/finance/payments`
- `GET /api/financials/payments`
- `POST /api/financials/payments`
- `DELETE /api/financials/payments/{paymentId}`
- `POST /api/financials/payments/{paymentId}/reverse`

Backend updates needed:

- Standardize payment response shape across finance and financials endpoints.
- Support `clientMutationId` on payment requests.
- Document delete vs reverse behavior.
- Ensure payment updates:
  - reference paid amount
  - payment status
  - entity balance
  - ledger entries
  - audit events

Acceptance criteria:

- Payment history can be displayed per sale, expense, Palai invoice, and entity.
- Payment reversal restores balances and statuses.

### 7. Palai Lifecycle Is Incomplete

Current live API:

- `GET /api/palai/clients`
- `POST /api/palai/clients`
- `POST /api/palai/assignments`
- `GET /api/palai/summary`
- `POST /api/palai/invoices`
- `POST /api/palai/invoices/{id}/payments`
- `PATCH /api/livestock/{id}/palai-assignment`

Backend updates needed:

- `DELETE /api/palai/assignments/{livestockId}` or support null client in `PATCH /api/livestock/{id}/palai-assignment`.
- `POST /api/palai/assignments/{livestockId}/transfer`
- `GET /api/palai/invoices`
- `GET /api/palai/invoices/{id}`
- `POST /api/palai/invoices/{id}/void`
- `GET /api/palai/packages/history`
- Optional: `POST /api/palai/packages/{livestockId}` for package changes.

Business rules:

- Transfer should close/prorate previous client billing.
- Unassign should stop active package billing.
- Invoice generation should avoid duplicate invoices for same client and period.
- Payment should update Palai invoice, customer ledger, and financial reports.

Acceptance criteria:

- Palai assignment, transfer, invoicing, payment, and closure are end-to-end auditable.

### 8. Users, Roles, Permissions, and Audit Logs

Current live API:

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

Backend updates needed:

- `GET /api/users/me`
- `GET /api/roles`
- `PUT /api/users/{id}/role`
- `PATCH /api/users/{id}/status`
- `GET /api/audit-logs`
- Optional: `GET /api/permissions`

Requirements:

- Return current user permissions from backend or Keycloak mapping.
- Restrict destructive APIs by role.
- Write audit log for deletes, reversals, status changes, payments, and admin changes.

Acceptance criteria:

- Frontend can hide or disable actions based on permissions.
- Admin actions are auditable.

### 9. Notifications Need Production Utility

Current live API:

- `GET /api/notifications`
- `POST /api/notifications`
- `PATCH /api/notifications/{id}/read`
- `PUT /api/notifications/{id}/read`
- `POST /api/notifications/register-device`
- `POST /api/notifications/preferences`

Backend updates needed:

- `GET /api/notifications/unread-count`
- `POST /api/notifications/read-all`
- Define notification schema in Swagger with type, priority, actionUrl, entityType, entityId, readFlag, createdAt.
- Define notification preferences schema.

Acceptance criteria:

- Frontend header can display unread count.
- Users can manage notification preferences.

### 10. Report Metric Consistency

Current live API has overlapping endpoints:

- Dashboard metrics
- Financials metrics
- Reports financial metrics
- Reports aliases under `/reports/*`

Backend updates needed:

- Canonicalize `/api/reports/*`.
- Keep `/reports/*` only as backward-compatible alias.
- Publish metric definitions for:
  - revenue
  - expenses
  - profit
  - animal profitability
  - inventory valuation
  - feed consumption
  - vendor payables
- Align filters: `farmId`, `locationId`, `startDate`, `endDate`, `species`, `category`, `status`.

Acceptance criteria:

- Dashboard, reports, and financials show matching totals for same filter period.

## Feature Enhancement Tasks

### Backend Enhancement 1: Idempotency

Add `clientMutationId` support to:

- Livestock create
- Sale create/bulk create
- Expense create
- Payment create
- Feed purchase
- Diet processing
- Treatment application
- Palai invoice generation

### Backend Enhancement 2: Soft Delete and Archive Model

Create consistent lifecycle states:

- ACTIVE
- INACTIVE
- ARCHIVED
- VOIDED
- REVERSED

Apply to:

- Farms
- Locations
- Livestock
- Sales
- Expenses
- Feed purchases
- Palai invoices
- Inventory items

### Backend Enhancement 3: Audit Event Model

Audit events should include:

- actor/user
- tenant
- farm
- action
- entity type
- entity ID
- old value
- new value
- reason
- timestamp

### Backend Enhancement 4: OpenAPI Quality

Improve Swagger with:

- Request examples.
- Response examples.
- Error response schemas.
- Required fields.
- Enum descriptions.
- Authentication requirements.
- Tenant header requirement on all tenant-scoped routes.

## Backend Critical Task Board

| Priority | Task | Owner Area | Status |
| --- | --- | --- | --- |
| P0 | Add animal medical/weight/milk edit-delete APIs | Livestock | Not started |
| P0 | Make sale create/bulk/reverse atomic | Finance | Not started |
| P0 | Add inventory movement ledger APIs | Operations | Not started |
| P0 | Make feed purchase update/reverse atomic | Procurement | Not started |
| P0 | Add payment idempotency and reversal rules | Finance | Not started |
| P1 | Add farm/location update and deactivate APIs | Operations | Not started |
| P1 | Add Palai invoice list/detail/void and assignment transfer | Palai | Not started |
| P1 | Add users/me, roles, permissions, and audit logs | Admin | Not started |
| P1 | Add unread notification count and read-all | Notifications | Not started |
| P2 | Standardize report metrics and route aliases | Reports | Not started |
| P2 | Improve Swagger examples and error schemas | Platform | Not started |

## Backend Validation Checklist

- Verify every endpoint enforces `X-Tenant`.
- Verify every mutating endpoint is role-protected.
- Verify duplicate `clientMutationId` returns the original result or safe no-op.
- Verify sale reversal restores animal status and ledger.
- Verify feed purchase reversal restores inventory and payable.
- Verify payment reversal restores reference status and entity balance.
- Verify medical record deletion restores medicine inventory and expense if linked.
- Verify dashboard, financials, and reports totals match for same filters.
- Verify Palai invoice cannot duplicate same customer-period invoice.
- Verify Swagger JSON includes all new endpoints and schemas.

## Backend Delivery Milestones

### Milestone 1: Data Correction and Safety

- Farm/location update/deactivate.
- Animal medical/weight/milk correction APIs.
- Payment reverse/delete behavior documented and tested.

### Milestone 2: Transaction Authority

- Canonical sale transaction.
- Canonical feed purchase transaction.
- Inventory movement ledger.
- Idempotency support.

### Milestone 3: Palai and Admin Production Readiness

- Palai lifecycle APIs.
- User roles and permissions.
- Notification unread/read-all.
- Audit logs.

### Milestone 4: Reporting and Contract Quality

- Metric alignment.
- Swagger schema cleanup.
- Error response standards.
- Backend regression suite.


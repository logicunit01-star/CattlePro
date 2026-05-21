# CattlePro Frontend and Backend Implementation Plan

Audit date: 2026-05-20  
Swagger validated: `http://139.59.8.119:8381/swagger-ui` via `GET /v3/api-docs`  
API title: CattlePro API v1.0  
Backend base URL in Swagger: `http://139.59.8.119:8381`  
Frontend default API base URL: `https://api.hulmsolutions.com/livestock`

## 1. Swagger Validation Summary

The live Swagger contract exposes these modules:

- Tenant setup
- Dashboard
- Livestock
- Finance
- Financials
- Entities
- Categories
- Operations
- Procurement
- Palai
- Reports
- Users
- Notifications
- Inventory medicine expirations
- Mobile sync

The frontend already has wrappers for most high-level routes in `services/backendService.ts`, but several wrappers are not used by the UI, and several product workflows still perform business logic locally instead of relying on atomic backend endpoints.

The most important finding: the implementation plan should not only add missing APIs. It should consolidate duplicate workflows and move critical transaction rules into backend services.

## 2. Live API Surface Validated

### Tenant

- `GET /api/tenant/setup`
- `POST /api/tenant/setup`

### Dashboard

- `GET /api/dashboard/summary`
- `GET /api/dashboard/kpis`
- `GET /api/dashboard/milk-trend`
- `GET /api/dashboard/feed-costs`

### Livestock

- `GET /api/livestock`
- `POST /api/livestock`
- `GET /api/livestock/{id}`
- `PUT /api/livestock/{id}`
- `DELETE /api/livestock/{id}`
- `POST /api/livestock/{id}/medical-records`
- `POST /api/livestock/{id}/breeding-records`
- `PUT /api/livestock/{id}/breeding-records`
- `DELETE /api/livestock/{id}/breeding-records/{recordId}`
- `POST /api/livestock/{id}/weight-records`
- `POST /api/livestock/{id}/milk-records`
- `PATCH /api/livestock/{id}/status`
- `PATCH /api/livestock/{id}/palai-assignment`
- `PUT /api/livestock/bulk/move`
- `POST /api/livestock/bulk/vaccinate`
- `POST /api/livestock/migrate-legacy-tags`

### Finance

- `GET /api/finance/expenses`
- `POST /api/finance/expenses`
- `PUT /api/finance/expenses/{id}`
- `DELETE /api/finance/expenses/{id}`
- `POST /api/finance/expenses/{id}/payments`
- `GET /api/finance/sales`
- `POST /api/finance/sales`
- `POST /api/finance/sales/bulk`
- `DELETE /api/finance/sales/{id}`
- `GET /api/finance/sales/{id}/invoice`
- `POST /api/finance/sales/{id}/payments`
- `GET /api/finance/ledger`
- `POST /api/finance/payments`
- `GET /api/finance/summary`
- `GET /api/finance/profitability/animals`

### Financials

- `GET /api/financials/kpis`
- `GET /api/financials/expenses`
- `GET /api/financials/sales`
- `GET /api/financials/ledger`
- `GET /api/financials/payments`
- `POST /api/financials/payments`
- `DELETE /api/financials/payments/{paymentId}`
- `POST /api/financials/payments/{paymentId}/reverse`
- `GET /api/financials/vendor-summary`
- `GET /api/financials/expense-analytics`

### Entities

- `GET /api/entities`
- `POST /api/entities`
- `PUT /api/entities/{id}`
- `DELETE /api/entities/{id}`
- `GET /api/entities/{id}/ledger`
- `PATCH /api/entities/{id}/balance-adjustment`

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`

### Operations

- `GET /api/operations/locations`
- `POST /api/operations/locations`
- `GET /api/operations/farms`
- `POST /api/operations/farms`
- `GET /api/operations/feed`
- `POST /api/operations/feed`
- `PUT /api/operations/feed/{id}`
- `DELETE /api/operations/feed/{id}`
- `POST /api/operations/feed/{id}/adjustments`
- `POST /api/operations/feed/adjustments`
- `GET /api/operations/low-stock`
- `GET /api/operations/feed/low-stock`
- `GET /api/operations/inventory/valuation`
- `GET /api/operations/medicine-expirations`
- `GET /api/operations/infrastructure`
- `POST /api/operations/infrastructure`
- `PUT /api/operations/infrastructure/{id}`
- `DELETE /api/operations/infrastructure/{id}`
- `GET /api/operations/diet-plans`
- `POST /api/operations/diet-plans`
- `PUT /api/operations/diet-plans/{id}`
- `DELETE /api/operations/diet-plans/{id}`
- `POST /api/operations/diet-plan/process`
- `POST /api/operations/diet-plans/{id}/process`
- `GET /api/operations/consumption-logs`
- `POST /api/operations/consumption-logs/batch`
- `POST /api/operations/consumption-logs/delete-batch`
- `GET /api/operations/feed-ledgers`
- `POST /api/operations/feed-ledgers`
- `PUT /api/operations/feed-ledgers/{id}`
- `PUT /api/operations/feed-ledgers/{id}/reverse`
- `POST /api/operations/feed-ledger/{ledgerId}/reverse`
- `GET /api/operations/treatment-protocols`
- `POST /api/operations/treatment-protocols`
- `PUT /api/operations/treatment-protocols/{id}`
- `DELETE /api/operations/treatment-protocols/{id}`
- `POST /api/operations/treatment-protocols/{id}/apply`
- `POST /api/operations/protocol/apply`
- `GET /api/operations/treatment-logs`
- `POST /api/operations/treatment-logs/batch`

### Inventory

- `GET /api/inventory/medicine-expirations`

### Procurement

- `POST /api/procurement/feed-purchases`

### Palai

- `GET /api/palai/clients`
- `POST /api/palai/clients`
- `POST /api/palai/assignments`
- `GET /api/palai/summary`
- `POST /api/palai/invoices`
- `POST /api/palai/invoices/{id}/payments`

### Reports

Both `/api/reports/*` and `/reports/*` aliases exist.

- `GET /api/reports/mobile-dashboard`
- `GET /api/reports/financial`
- `GET /api/reports/financial-overview`
- `GET /api/reports/herd`
- `GET /api/reports/operations`
- `GET /api/reports/logs`
- `GET /api/reports/inventory-movement`
- `GET /api/reports/animal-profitability`
- `GET /api/reports/vendor-payables`

### Users

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

### Notifications

- `GET /api/notifications`
- `POST /api/notifications`
- `PATCH /api/notifications/{id}/read`
- `PUT /api/notifications/{id}/read`
- `POST /api/notifications/register-device`
- `POST /api/notifications/preferences`

### Sync

- `POST /sync/mobile-mutations`
- `POST /api/sync/mobile-mutations`

## 3. Frontend Wrapper Gap List

### Wrappers Missing or Incomplete

Add these to `services/backendService.ts`:

- `addMilkRecordViaEndpoint`: use `POST /api/livestock/{id}/milk-records` instead of fetching full livestock and doing `PUT /api/livestock/{id}`.
- `migrateLegacyTags`: wrap `POST /api/livestock/migrate-legacy-tags`.
- `deleteFinancialsPayment`: wrap `DELETE /api/financials/payments/{paymentId}`.
- `reverseFinancialsPayment`: wrap `POST /api/financials/payments/{paymentId}/reverse`.
- `getInventoryMedicineExpirations`: wrap `GET /api/inventory/medicine-expirations`, or intentionally remove if `/api/operations/medicine-expirations` remains canonical.
- `applyTreatmentProtocolById`: wrap `POST /api/operations/treatment-protocols/{id}/apply`; current app uses `/api/operations/protocol/apply`.
- `reverseFeedLedgerPost`: wrap `POST /api/operations/feed-ledger/{ledgerId}/reverse` only if backend wants this route canonical; otherwise deprecate it and keep the existing `PUT`.
- `getReportFinancial`: wrap `GET /api/reports/financial` if this differs from `financial-overview`.
- `getReportHerd`, `getReportOperations`, `getReportLogs`, `getReportMobileDashboard`: wrappers exist partially through report components, but should be normalized explicitly.

### Wrappers Present but Underused in UI

These exist but need UI integration:

- `expensePayment`
- `salePayment`
- `balanceAdjustment`
- `feedPurchase`
- `adjustFeedById`
- `adjustFeed`
- `getLowStock`
- `getLowStockFeed`
- `getInventoryValuation`
- `processDietPlanById`
- `deleteConsumptionLogsBatch`
- `getUsers`, `createUser`, `updateUser`, `deleteUser`
- `getNotifications`, `createNotification`, `markNotificationRead`, `registerDevice`, `updateNotificationPreferences`
- `patchLivestockStatus`
- `patchPalaiAssignment`

## 4. Backend API Updates Needed

These are the backend gaps needed to make the product complete, auditable, and simpler for frontend.

### A. Farm and Location Full CRUD

Current Swagger supports create/read only:

- `GET/POST /api/operations/locations`
- `GET/POST /api/operations/farms`

Backend tasks:

- Add `PUT /api/operations/locations/{id}`.
- Add `DELETE /api/operations/locations/{id}` or `PATCH /api/operations/locations/{id}/status`.
- Add `PUT /api/operations/farms/{id}`.
- Add `DELETE /api/operations/farms/{id}` or `PATCH /api/operations/farms/{id}/status`.
- Add validation preventing deletion of farms with linked livestock, expenses, sales, inventory, or assets.

Frontend impact:

- Settings can support edit/deactivate city and farm.
- Avoid creating duplicate farms when a name/cost center changes.

### B. Sub-Record CRUD for Animal Histories

Current Swagger supports:

- Medical: create only.
- Weight: create only.
- Milk: create only.
- Breeding: create/update/delete.

Backend tasks:

- Add `PUT /api/livestock/{id}/medical-records/{recordId}`.
- Add `DELETE /api/livestock/{id}/medical-records/{recordId}`.
- Add `PUT /api/livestock/{id}/weight-records/{recordId}`.
- Add `DELETE /api/livestock/{id}/weight-records/{recordId}`.
- Add `PUT /api/livestock/{id}/milk-records/{recordId}`.
- Add `DELETE /api/livestock/{id}/milk-records/{recordId}`.
- Ensure medical record edit/delete reverses or adjusts linked expense and medicine inventory safely.

Frontend impact:

- Livestock detail can support real edit/delete for health, weight, and milk history.
- Reduces correction pain for farm staff.

### C. Canonical Sale Transaction API

Current state:

- Frontend can create sales from multiple modules.
- Backend has sale create, bulk sale create, delete, invoice, and sale payments.

Backend tasks:

- Ensure `POST /api/finance/sales` atomically:
  - Creates sale.
  - Updates animal statuses when animal sale.
  - Posts ledger entries.
  - Creates receivable if unpaid/partial.
  - Calculates estimated profit consistently.
- Ensure `POST /api/finance/sales/bulk` has same behavior as single sale.
- Add `PUT /api/finance/sales/{id}` for sale correction if not already implemented.
- Add `POST /api/finance/sales/{id}/void` or `POST /api/finance/sales/{id}/reverse`.
- Make `DELETE /api/finance/sales/{id}` either a safe void operation or document its rollback behavior.

Frontend impact:

- Remove local status updates after sale.
- Remove localStorage-backed sale persistence.
- Use backend response as source of truth.

### D. Canonical Expense and Purchase Transaction API

Current state:

- Expenses are created manually.
- Feed purchase route exists.
- Procurement still has local manual inventory updates.

Backend tasks:

- Make `POST /api/procurement/feed-purchases` canonical for purchases that affect inventory and vendor balance.
- Add purchase update/reverse endpoints:
  - `PUT /api/procurement/feed-purchases/{id}`
  - `POST /api/procurement/feed-purchases/{id}/reverse`
- Add response with feed item, expense, ledger entries, and inventory movement IDs.
- Add idempotency using `clientMutationId`.

Frontend impact:

- Procurement should stop manually updating feed and expenses separately.
- Supplier balances and inventory should reconcile automatically.

### E. Inventory Movement Ledger

Current state:

- FeedInventory quantity is updated from multiple modules.
- No clear movement history endpoint is visible except report-level inventory movement.

Backend tasks:

- Add `GET /api/operations/inventory-movements`.
- Add `GET /api/operations/inventory-movements/{itemId}`.
- Add movement records for purchase, diet consumption, treatment consumption, manual adjustment, reversal, expiry/write-off.
- Include fields: movementId, farmId, itemId, type, direction, quantity, unitCost, totalCost, referenceType, referenceId, date, createdBy, notes.
- Make `POST /api/operations/feed/adjustments` create movement records.

Frontend impact:

- Inventory item detail can show auditable stock card.
- Procurement, Operations, and Reports can use one stock truth.

### F. Payment Lifecycle Completion

Current Swagger supports:

- Add payments.
- Delete payment.
- Reverse payment.
- Expense and sale targeted payments.

Backend tasks:

- Confirm all payment endpoints update entity balance, reference payment status, and ledger.
- Add consistent response object for payment operations.
- Add `clientMutationId` support to avoid duplicate payments.
- Document whether delete means hard delete or reversal.

Frontend impact:

- Finance can show payment history per expense/sale.
- Users can reverse mistakes safely.

### G. Palai Lifecycle API Completion

Current Swagger supports clients, assignments, invoices, payments, and summary.

Backend tasks:

- Add `DELETE /api/palai/assignments/{livestockId}` or `PATCH /api/livestock/{id}/palai-assignment` with null client to unassign.
- Add Palai transfer endpoint: `POST /api/palai/assignments/{livestockId}/transfer`.
- Add package history endpoint.
- Add `GET /api/palai/invoices`.
- Add `GET /api/palai/invoices/{id}`.
- Add invoice void/reverse endpoint.
- Ensure prorated invoice generation rules are documented.

Frontend impact:

- Palai can support assign, transfer, close, invoice, pay, and view history.

### H. User, Role, and Permission APIs

Current Swagger supports basic users CRUD only.

Backend tasks:

- Add roles/permissions endpoint if not handled by Keycloak:
  - `GET /api/roles`
  - `PUT /api/users/{id}/role`
  - `PATCH /api/users/{id}/status`
- Return current user's permissions in login/session API or profile endpoint.
- Add audit log endpoint for admin actions.

Frontend impact:

- Settings Team Access becomes real.
- Navigation/actions can be permission-aware.

### I. Notifications API Usability

Current Swagger supports notification list/create/read/preferences/device registration.

Backend tasks:

- Define notification schema and preference schema in Swagger.
- Add unread count endpoint: `GET /api/notifications/unread-count`.
- Add mark all read: `POST /api/notifications/read-all`.
- Add notification type/category fields.

Frontend impact:

- Header notification bell and settings preferences can be implemented cleanly.

### J. Reports Consistency

Current Swagger includes report aliases and dashboard/financials overlap.

Backend tasks:

- Pick canonical route prefix: preferably `/api/reports/*`.
- Keep `/reports/*` as backward-compatible alias only.
- Define metric formulas for dashboard, financials, and reports.
- Add farmId/date/species/category filters consistently.

Frontend impact:

- Dashboard, Financials, and Reports show matching numbers.

## 5. Frontend Implementation Tasks

### Phase 1: API Service Layer Cleanup

Files:

- `services/backendService.ts`
- `types.ts`

Tasks:

- Add missing wrappers listed in section 3.
- Split `backendService.ts` into domain services:
  - `livestockApi.ts`
  - `financeApi.ts`
  - `operationsApi.ts`
  - `palaiApi.ts`
  - `reportsApi.ts`
  - `adminApi.ts`
- Keep a compatibility export if refactor risk is high.
- Replace `any` response types with TypeScript interfaces from Swagger schemas.
- Add shared request builder for tenant headers, JSON body, query params, and response normalization.
- Add standard API error type.
- Remove duplicate `AppState` interface in `types.ts`.

### Phase 2: Production Data Integrity

Files:

- `App.tsx`
- `services/tenantContext.ts`
- `constants.ts`

Tasks:

- Remove mock fallback from production mode.
- Keep mock data behind explicit `VITE_DEMO_MODE=true`.
- Remove sales localStorage fallback from production.
- Remove livestock status localStorage override from production.
- Show empty/error states when backend fails.
- Add retry action for failed module loads.

### Phase 3: Sales Consolidation

Files:

- `App.tsx`
- `components/SalesManager.tsx`
- `components/Financials.tsx`
- `components/LivestockManager.tsx`
- `components/PalaiManager.tsx`

Tasks:

- Create one sale creation flow.
- All sale UI entry points call the same handler.
- Use backend sale create/bulk create response to refresh sales, livestock, entities, and ledger.
- Use `salePayment` for sale payment updates.
- Add sale payment history view using `getFinancialsPayments`.
- Add sale void/reverse UI once backend supports it.

### Phase 4: Procurement and Inventory Consolidation

Files:

- `components/Procurement.tsx`
- `components/Operations.tsx`
- `components/Reports.tsx`

Tasks:

- Use `feedPurchase` for procurement entries instead of separate expense and feed updates.
- Use `adjustFeed`/`adjustFeedById` for manual adjustments.
- Add inventory valuation view using `getInventoryValuation`.
- Add low-stock view using `getLowStockFeed`.
- Add stock movement history UI once backend endpoint exists.
- Keep Operations as stock control and diet/treatment usage area.
- Keep Procurement as purchase and vendor payable area.

### Phase 5: Livestock History CRUD

Files:

- `components/LivestockManager.tsx`
- `services/backendService.ts`

Tasks:

- Switch milk creation to `POST /api/livestock/{id}/milk-records`.
- Add edit/delete UI for medical records after backend endpoints exist.
- Add edit/delete UI for weight records after backend endpoints exist.
- Add edit/delete UI for milk records after backend endpoints exist.
- Use `patchLivestockStatus` for status-only changes.
- Use `patchPalaiAssignment` for Palai assignment changes.
- Add migrate legacy tags admin action only for super admin.

### Phase 6: Finance Completion

Files:

- `components/Financials.tsx`
- `components/EntityManager.tsx`

Tasks:

- Use targeted `expensePayment` and `salePayment`.
- Show payment history per expense/sale.
- Add reverse/delete payment actions using new wrappers.
- Use `balanceAdjustment` for entity corrections.
- Add clear labels for payable vs receivable direction.
- Replace browser confirms with modal dialogs.

### Phase 7: Palai Completion

Files:

- `components/PalaiManager.tsx`
- `components/LivestockManager.tsx`

Tasks:

- Add create Palai client UI using `createPalaiClient`.
- Add assign/unassign Palai animal UI.
- Add transfer animal to another Palai client once backend supports it.
- Add package editor and package history.
- Add invoice list and payment history.
- Use `payPalaiInvoice` for invoice payments.
- Display Palai summary from backend as authoritative.

### Phase 8: Settings, Users, Notifications

Files:

- `components/Settings.tsx`
- `App.tsx`

Tasks:

- Replace mock users with `getUsers`.
- Add create/edit/deactivate/delete user flows.
- Add roles and permissions once backend exposes them.
- Add notification center in header.
- Add notification preferences in Settings.
- Add API integration settings only when real backend routes exist.
- Add edit/deactivate farm and city after backend supports it.

### Phase 9: Reports and Dashboard Alignment

Files:

- `components/Dashboard.tsx`
- `components/Reports.tsx`
- `components/Financials.tsx`

Tasks:

- Use canonical report endpoints.
- Align date filters and farm filters across dashboard, reports, and financials.
- Add report loading/error/empty states.
- Keep CSV export.
- Add report definitions in UI copy or help drawer for management users.

### Phase 10: UX and QA Hardening

Tasks:

- Replace `alert`/`confirm` with consistent modals/toasts.
- Add loading states for every save/delete action.
- Add form validation with inline errors.
- Add optimistic updates only where safe.
- Add audit trail display for destructive actions.
- Add code splitting by route/module.
- Add Playwright smoke tests for core workflows.
- Add unit tests for data transformation helpers.

## 6. Backend Implementation Task Board

### Backend Epic 1: Core Admin CRUD

- Add update/deactivate/delete locations.
- Add update/deactivate/delete farms.
- Add validation for linked records.
- Add tests for tenant isolation.
- Update Swagger schemas and examples.

### Backend Epic 2: Animal Sub-Record CRUD

- Add medical record update/delete.
- Add weight record update/delete.
- Add milk record update/delete.
- Add inventory/expense reversal behavior for medical corrections.
- Add tests for animal history consistency.

### Backend Epic 3: Transaction Engine

- Make sale create/bulk/void atomic.
- Make feed purchase/update/reverse atomic.
- Make expense payment and sale payment atomic.
- Add idempotency via `clientMutationId`.
- Add rollback-safe error handling.

### Backend Epic 4: Inventory Ledger

- Add inventory movement entity/table.
- Write movements from feed purchase, adjustment, diet, treatment, medical record, and reversal.
- Add inventory movement APIs.
- Add inventory movement report update.

### Backend Epic 5: Palai Lifecycle

- Add Palai assignment unassign and transfer.
- Add package history.
- Add Palai invoice list/detail/void.
- Add prorated billing rules.
- Add tests for client ledger and invoice payment.

### Backend Epic 6: Admin, Roles, Notifications

- Add current-user/profile endpoint if needed.
- Add roles/permission APIs or Keycloak mapping endpoint.
- Add notification unread count and read-all.
- Define notification preference schema.
- Add audit logs for admin and destructive actions.

### Backend Epic 7: Reporting Contract

- Standardize `/api/reports`.
- Document formula definitions.
- Align dashboard, reports, and financials filters.
- Add tests comparing metric outputs across modules.

## 7. Frontend Implementation Task Board

### Frontend Epic 1: API Client Refactor

- Split `backendService.ts` by domain.
- Add missing wrappers.
- Add typed DTOs.
- Add shared fetch client.
- Add standard error handling.

### Frontend Epic 2: Remove Production Mock Behavior

- Add demo mode flag.
- Remove production localStorage business fallbacks.
- Add backend error states.
- Add retry and refresh controls.

### Frontend Epic 3: Workflow Consolidation

- Centralize sale creation.
- Centralize purchase creation.
- Centralize payment creation.
- Centralize inventory adjustment.
- Centralize livestock status patching.

### Frontend Epic 4: Complete CRUD UI

- Farm/location edit/deactivate.
- Medical record edit/delete.
- Weight record edit/delete.
- Milk record edit/delete.
- Payment reverse/delete.
- User CRUD.
- Palai client/assignment lifecycle.

### Frontend Epic 5: UX Modernization

- Replace browser alerts/confirms.
- Add confirmation modals with impact summaries.
- Add toast notifications.
- Add inline validation.
- Add consistent empty states.

### Frontend Epic 6: QA Automation

- Add Playwright smoke tests:
  - Login
  - Farm context switch
  - Animal create/edit
  - Sale create/delete
  - Feed purchase
  - Diet process/reverse
  - Palai invoice/payment
  - Report load/export
- Add service-layer tests for DTO normalization.
- Add build and type-check CI.

## 8. Priority Roadmap

### Sprint 1: Stabilize API Usage

- Add missing wrappers.
- Switch milk record to backend endpoint.
- Use patch endpoints for status and Palai assignment.
- Add demo mode flag.
- Remove production mock fallback.

### Sprint 2: Sales, Payments, and Finance Consistency

- Centralize sales.
- Use targeted payments.
- Add payment history.
- Add payment reverse/delete wrappers.
- Remove localStorage sales persistence.

### Sprint 3: Procurement and Inventory Ledger

- Use feed purchase endpoint.
- Use adjustment endpoint.
- Add inventory valuation and low-stock UI.
- Backend adds inventory movement ledger.

### Sprint 4: CRUD Completion

- Backend adds sub-record update/delete.
- Frontend adds medical, weight, and milk edit/delete.
- Backend adds farm/location update/deactivate.
- Frontend adds farm/location admin.

### Sprint 5: Palai and Admin

- Complete Palai lifecycle.
- Replace Settings mock users with API users.
- Add notifications.
- Add role-aware UI.

### Sprint 6: Reports, UX, and QA

- Align reports.
- Replace alerts/confirms.
- Add Playwright tests.
- Add code splitting.

## 9. API Update Checklist for Backend Team

Highest priority backend updates:

- `PUT /api/operations/locations/{id}`
- `PATCH /api/operations/locations/{id}/status`
- `PUT /api/operations/farms/{id}`
- `PATCH /api/operations/farms/{id}/status`
- `PUT /api/livestock/{id}/medical-records/{recordId}`
- `DELETE /api/livestock/{id}/medical-records/{recordId}`
- `PUT /api/livestock/{id}/weight-records/{recordId}`
- `DELETE /api/livestock/{id}/weight-records/{recordId}`
- `PUT /api/livestock/{id}/milk-records/{recordId}`
- `DELETE /api/livestock/{id}/milk-records/{recordId}`
- `PUT /api/finance/sales/{id}`
- `POST /api/finance/sales/{id}/reverse`
- `PUT /api/procurement/feed-purchases/{id}`
- `POST /api/procurement/feed-purchases/{id}/reverse`
- `GET /api/operations/inventory-movements`
- `GET /api/operations/inventory-movements/{itemId}`
- `DELETE /api/palai/assignments/{livestockId}` or null assignment patch support
- `POST /api/palai/assignments/{livestockId}/transfer`
- `GET /api/palai/invoices`
- `GET /api/palai/invoices/{id}`
- `POST /api/palai/invoices/{id}/void`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read-all`
- `GET /api/users/me`
- Role/permission endpoints or Keycloak role mapping endpoint

## 10. API Update Checklist for Frontend Team

Highest priority frontend updates:

- Add missing backend wrappers.
- Use `POST /api/livestock/{id}/milk-records`.
- Use `PATCH /api/livestock/{id}/status`.
- Use `PATCH /api/livestock/{id}/palai-assignment`.
- Use `POST /api/procurement/feed-purchases`.
- Use `POST /api/operations/feed/adjustments`.
- Use `POST /api/finance/expenses/{id}/payments`.
- Use `POST /api/finance/sales/{id}/payments`.
- Add wrappers for payment delete/reverse.
- Replace Settings mock users with `/api/users`.
- Add notifications UI from `/api/notifications`.
- Add inventory valuation and low-stock UI.
- Remove production mock fallback/localStorage business overrides.
- Add module-level loading, error, empty, and retry states.

## 11. Acceptance Criteria

The implementation should be considered successful when:

- No production workflow silently falls back to mock business data.
- Sales entered from any module produce the same backend result.
- Feed purchase affects inventory, expense, vendor balance, and ledger through one backend transaction.
- Animal status changes use patch endpoints.
- Medical, weight, and milk history can be corrected.
- Finance payments can be created, viewed, reversed, and reconciled.
- Palai client, assignment, invoice, and payment flows work end to end.
- Settings user list is real, not mock.
- Notifications are visible and actionable.
- Reports, dashboard, and finance totals match for the same date/farm filters.
- Build, type check, and smoke tests pass.


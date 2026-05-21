# CattlePro Frontend Milestone 1 Leftovers and Backend Dependencies

Created: 2026-05-20  
Milestone: Frontend Milestones 1, 2, 3, and 4 plus Final Reconciliation - API/Data Integrity, Procurement/Payment Workflow Consolidation, Settings/Notifications Hardening, Sales Payment Completion  
Purpose: track what was completed, what was intentionally left for later frontend milestones, and what depends on backend updates before the next validation audit.

## Completed in Final Reconciliation

### Header Context Switcher

- Added direct city/farm context switching in the desktop header.
- Settings remains the management area for creating/syncing cities and farms.
- Header context changes now immediately update scoped module data without requiring users to open Settings.

### Payment Mutation Refresh

- Payment reverse/delete now calls the parent financial refresh hook after updating the open payment-history panel.
- Financial refresh reloads expenses, sales, entities, and ledger and increments the Financials refresh key.

### Reconciliation Validation

- `npx tsc --noEmit` passed after the final reconciliation implementation.
- `npm run build` passed after the final reconciliation implementation.
- Build still reports the existing large chunk warning; code splitting remains a later performance task.

## Completed in Milestone 4

### Sales Payment Workflow

- Added targeted sale payment recording from Sales history using:
  - `POST /api/finance/sales/{id}/payments`
- Added targeted sale payment recording from Financials sales table using:
  - `POST /api/finance/sales/{id}/payments`
- Sale payment actions refresh sales, entities, and ledger after backend mutation.
- Financials sales rows now expose payment history using:
  - `GET /api/financials/payments?refType=SALE&refId={saleId}`
- Existing payment history panel now supports both expense and sale references.

### Sale Drift Reduction

- Removed local livestock status mutation from `SalesManager` after sale creation.
- `SalesManager` now waits for sale creation and does not show success if backend save fails.
- Sale delete flow now refreshes sales, livestock, entities, and ledger from backend instead of manually looping livestock status updates in the frontend.

### Milestone 4 Validation

- `npx tsc --noEmit` passed after the Milestone 4 implementation.
- `npm run build` passed after the Milestone 4 implementation.
- Build still reports the existing large chunk warning; code splitting remains a later performance task.

## Completed in Milestone 3

### Settings Users Integration

- Replaced hardcoded Settings users with backend-loaded users from:
  - `GET /api/users`
- Added loading, empty, error, and retry states for Team Access.
- Added basic invite action through:
  - `POST /api/users`
- User rows now normalize common backend shapes such as `id`, `userId`, `name`, `fullName`, `role`, `roleName`, `status`, and `enabled`.

### Header Notifications

- Added a visible notification bell in the desktop header.
- Notification dropdown loads from:
  - `GET /api/notifications`
- Individual unread notifications can be marked read through:
  - `PATCH /api/notifications/{id}/read`
- Added unread badge based on returned notification status/read fields.
- Added notification empty, error, and refresh states.

### Payment History Surface

- Added vendor bill payment-history panel in Financials.
- Payment panel loads records from:
  - `GET /api/financials/payments?refType=EXPENSE&refId={expenseId}`
- Added reverse and delete actions using:
  - `POST /api/financials/payments/{paymentId}/reverse`
  - `DELETE /api/financials/payments/{paymentId}`

### Milestone 3 Validation

- `npx tsc --noEmit` passed after the Milestone 3 implementation.
- `npm run build` passed after the Milestone 3 implementation.
- Build still reports the existing large chunk warning; code splitting remains a later performance task.

## Completed in Milestone 2

### Procurement Purchase Consolidation

- New feed procurement entries now use:
  - `POST /api/procurement/feed-purchases`
- Removed the create-new-procurement path that separately created a frontend expense and then manually patched feed quantity.
- Purchase completion refreshes expenses, feed inventory, entities, and ledger so backend accounting remains the source of truth.

### Inventory Movement Consolidation

- Manual outgoing stock from Procurement inventory cards now uses:
  - `POST /api/operations/feed/adjustments`
- Outgoing stock refreshes procurement data after the backend adjustment.
- Procurement dashboard now attempts to load backend low-stock and valuation signals from:
  - `GET /api/operations/feed/low-stock`
  - `GET /api/operations/inventory/valuation`
- If backend valuation/low-stock APIs fail, UI falls back to local feed-derived counts and stock value.

### Targeted Vendor Payments

- Financials vendor bill payment now creates a targeted expense payment through:
  - `POST /api/finance/expenses/{id}/payments`
- Procurement supplier settlement now creates payment entries for each unpaid vendor bill before updating the local bill status.
- Settlement copy was changed from artificial/manual status language to payment-entry language.

### Milestone 2 Validation

- `npx tsc --noEmit` passed after the Milestone 2 implementation.
- `npm run build` passed after the Milestone 2 implementation.
- Build still reports the existing large chunk warning; code splitting remains a later performance task.

## Completed in Milestone 1

### API Foundation

- Added shared API utility file: `services/apiClient.ts`.
- Centralized:
  - API base URL.
  - Tenant-aware API headers.
  - JSON request handling.
  - API response parsing.
  - Demo mode flag helper.
  - Query builder utility.

### Swagger Endpoint Corrections

- Updated milk record creation to use:
  - `POST /api/livestock/{id}/milk-records`
- Added wrappers for:
  - `DELETE /api/financials/payments/{paymentId}`
  - `POST /api/financials/payments/{paymentId}/reverse`
  - `POST /api/operations/treatment-protocols/{id}/apply`
  - `GET /api/inventory/medicine-expirations`
  - `POST /api/livestock/migrate-legacy-tags`
  - `GET /api/reports/financial`
  - `GET /api/reports/herd`
  - `GET /api/reports/operations`
  - `GET /api/reports/logs`
  - `GET /api/reports/mobile-dashboard`

### Production Data Integrity

- Production mock-data fallback is now blocked unless `VITE_DEMO_MODE=true`.
- Production sales localStorage fallback is blocked unless `VITE_DEMO_MODE=true`.
- Production livestock status localStorage override is blocked unless `VITE_DEMO_MODE=true`.
- Initial mock breeders, customers/entities, and invoices are blocked unless `VITE_DEMO_MODE=true`.
- Production data-load failure now shows a visible error state with retry instead of silently showing mock data.

### Targeted Livestock Mutations

- Status-only livestock updates use:
  - `PATCH /api/livestock/{id}/status`
- Palai assignment-only changes use:
  - `PATCH /api/livestock/{id}/palai-assignment`
- Full livestock profile changes still use:
  - `PUT /api/livestock/{id}`

### Sale Drift Reduction

- Removed manual sold-status update from `LivestockManager` after sale submission.
- Sale creation now refreshes livestock after backend sale creation so backend remains the source of truth for sold animal status.
- Production sale failures no longer leave local-only sales in app state.

## Validation Completed

- `npx tsc --noEmit` passed after the implementation.
- `npm run build` passed after the implementation.
- Build still reports the existing large chunk warning; code splitting remains a later performance task.

## Frontend Tasks Left for Later Milestones

### Service Layer Refactor

Status: left for later frontend milestone.

Reason:

- Milestone 1 added shared API infrastructure and key wrappers but did not split the large service file.

Remaining tasks:

- Split `services/backendService.ts` into:
  - `livestockApi.ts`
  - `financeApi.ts`
  - `operationsApi.ts`
  - `procurementApi.ts`
  - `palaiApi.ts`
  - `reportsApi.ts`
  - `adminApi.ts`
  - `notificationsApi.ts`
- Replace broad `any` response types with DTOs.
- Move all existing wrappers to the shared `apiRequest` helper.
- Remove duplicate response normalization code.

### Settings Users UI

Status: partially completed in Milestone 3.

Reason:

- Team Access now loads real users and can create a basic viewer invite, but full role/status management still depends on backend role/status endpoints and a richer user form.

Remaining tasks:

- Replace prompt-based invite with a proper modal form.
- Add update/delete/deactivate user actions.
- Add role/status controls after backend exposes role/status endpoints.

### Notifications UI

Status: partially completed in Milestone 3.

Reason:

- Header notification dropdown now loads notifications and marks individual records as read.
- Backend unread-count/read-all endpoints are still dependencies for a polished notification center.

Remaining tasks:

- Add preferences panel using `POST /api/notifications/preferences`.
- Add unread count after backend provides endpoint.
- Add read-all action after backend provides endpoint.

### Payment UI Completion

Status: partially completed in Milestones 2, 3, and 4.

Reason:

- Targeted expense payment creation is wired for vendor bill payment and supplier settlement.
- Vendor bill payment history is now visible with reverse/delete actions.
- Sale payment creation and sale payment history are now visible from Sales/Financials surfaces.
- Entity and Palai invoice payment history still need dedicated UI surfaces.

Remaining tasks:

- Extend expense payment history beyond vendor-bill view into the main expense list/detail surface.
- Show payment history per entity and Palai invoice.
- Add confirmation modals explaining ledger impact.
- Validate backend payment reverse/delete side effects once backend confirms whether delete is hard-delete or ledger-safe void.

### Procurement Purchase Completion

Status: partially completed in Milestone 2; remaining items are backend/API and reconciliation UX dependent.

Reason:

- The create-new-purchase flow is now consolidated, but editing or reversing prior purchases safely requires backend purchase lifecycle endpoints.

Remaining tasks:

- Replace edit-procurement flow once backend supports purchase update/reversal.
- Add a dedicated procurement purchase list from backend read endpoints when available.
- Add stock movement history per item.
- Expand valuation UI into category/vendor drilldowns after backend response fields are finalized.
- Add loading/error states for valuation and low-stock cards instead of silent fallback only.

### Full Alert/Confirm Replacement

Status: left for UX hardening milestone.

Remaining tasks:

- Replace browser `alert`.
- Replace browser `confirm`.
- Add shared toast system.
- Add shared destructive-action modal.
- Add inline form validation.

### Code Splitting

Status: left for performance milestone.

Remaining tasks:

- Lazy-load major modules.
- Split chart-heavy reports and dashboard code.
- Split Gemini Advisor bundle.

## Backend Dependencies Blocking Frontend Completion

### Animal History Edit/Delete

Blocked frontend features:

- Edit/delete medical records.
- Edit/delete weight records.
- Edit/delete milk records.

Required backend APIs:

- `PUT /api/livestock/{id}/medical-records/{recordId}`
- `DELETE /api/livestock/{id}/medical-records/{recordId}`
- `PUT /api/livestock/{id}/weight-records/{recordId}`
- `DELETE /api/livestock/{id}/weight-records/{recordId}`
- `PUT /api/livestock/{id}/milk-records/{recordId}`
- `DELETE /api/livestock/{id}/milk-records/{recordId}`

### Farm and Location Admin

Blocked frontend features:

- Edit city/location.
- Deactivate city/location.
- Edit farm.
- Deactivate farm.

Required backend APIs:

- `PUT /api/operations/locations/{id}`
- `PATCH /api/operations/locations/{id}/status`
- `PUT /api/operations/farms/{id}`
- `PATCH /api/operations/farms/{id}/status`

### Sale Correction and Reversal

Blocked frontend features:

- Edit sale after creation.
- Void/reverse sale with proper animal and ledger rollback.
- Production-grade sale deletion/reversal UX that does not rely on destructive delete semantics.

Required backend APIs:

- `PUT /api/finance/sales/{id}`
- `POST /api/finance/sales/{id}/reverse` or `POST /api/finance/sales/{id}/void`

### Feed Purchase Update/Reversal

Blocked frontend features:

- Edit procurement purchase safely.
- Reverse procurement purchase safely.

Required backend APIs:

- `PUT /api/procurement/feed-purchases/{id}`
- `POST /api/procurement/feed-purchases/{id}/reverse`
- Optional read endpoints:
  - `GET /api/procurement/feed-purchases`
  - `GET /api/procurement/feed-purchases/{id}`

### Inventory Movement History

Blocked frontend features:

- Stock card/history per inventory item.
- Auditable inventory movement table.
- Clear stock reconciliation UI.

Required backend APIs:

- `GET /api/operations/inventory-movements`
- `GET /api/operations/inventory-movements/{itemId}`

### Palai Lifecycle

Blocked frontend features:

- Unassign Palai animal.
- Transfer Palai animal between clients.
- Show Palai invoice list/detail.
- Void Palai invoice.
- Show package history.

Required backend APIs:

- `DELETE /api/palai/assignments/{livestockId}` or null assignment support in existing patch endpoint.
- `POST /api/palai/assignments/{livestockId}/transfer`
- `GET /api/palai/invoices`
- `GET /api/palai/invoices/{id}`
- `POST /api/palai/invoices/{id}/void`
- Package history endpoint.

### Roles, Permissions, and Audit Logs

Blocked frontend features:

- Permission-aware navigation.
- Role-based destructive action control.
- User status management.
- Admin audit log screen.

Required backend APIs:

- `GET /api/users/me`
- `GET /api/roles`
- `PUT /api/users/{id}/role`
- `PATCH /api/users/{id}/status`
- `GET /api/audit-logs`

### Notification Count and Bulk Actions

Blocked frontend features:

- Header unread badge.
- Mark all notifications read.

Required backend APIs:

- `GET /api/notifications/unread-count`
- `POST /api/notifications/read-all`

## Next Audit Checklist

Run this after backend updates land:

- Validate Swagger again at `GET /v3/api-docs`.
- Confirm all backend dependency endpoints are visible in Swagger.
- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Test production mode with API disconnected and verify no mock business data appears.
- Test demo mode with `VITE_DEMO_MODE=true` and verify mock data still works intentionally.
- Create milk record and verify it uses dedicated endpoint.
- Change animal status and verify patch endpoint is used.
- Change Palai assignment only and verify patch endpoint is used.
- Create sale and verify livestock refreshes from backend status.
- Confirm failed sale does not leave local-only production sale.
- Re-audit leftover tasks in this file against backend Swagger and frontend code.

# CattlePro Frontend Integration Gaps v2.0

Audit date: 2026-06-01  
Source: live Swagger v2 audit plus local frontend scan  
Document version: 2.0

## Executive Summary

The backend has now exposed many endpoints that were previously blocking frontend completion. The frontend has already completed the first four implementation milestones, but several v1 "backend dependency" items should now move into frontend implementation work.

The biggest frontend opportunity is to consume the new v2 backend surface instead of relying on partial workflows, browser prompts, or local refresh-only behavior.

## Now Unblocked by Backend

### Farm and Location Admin

Backend now exposes:

- `PUT /api/operations/locations/{id}`
- `DELETE /api/operations/locations/{id}`
- `PATCH /api/operations/locations/{id}/status`
- `PUT /api/operations/farms/{id}`
- `DELETE /api/operations/farms/{id}`
- `PATCH /api/operations/farms/{id}/status`

Frontend tasks:

- Add service wrappers for update/delete/status operations.
- Add edit and deactivate controls in Settings.
- Add linked-record conflict handling.
- Use deactivate/archive as the default UI action when records have dependencies.

### Animal History Edit/Delete

Backend now exposes:

- `PUT /api/livestock/{id}/medical-records/{recordId}`
- `DELETE /api/livestock/{id}/medical-records/{recordId}`
- `PUT /api/livestock/{id}/weight-records/{recordId}`
- `DELETE /api/livestock/{id}/weight-records/{recordId}`
- `PUT /api/livestock/{id}/milk-records/{recordId}`
- `DELETE /api/livestock/{id}/milk-records/{recordId}`

Frontend tasks:

- Add `backendService` wrappers.
- Add edit/delete actions in livestock detail history tables.
- Refresh livestock, reports, inventory, and ledger where medical inventory or costs are affected.
- Add confirmation copy that explains inventory/report side effects.

### Sale Correction and Reversal

Backend now exposes:

- `PUT /api/finance/sales/{id}`
- `POST /api/finance/sales/{id}/reverse`

Frontend tasks:

- Add sale update wrapper.
- Add sale reverse wrapper.
- Replace destructive sale delete as the primary production correction action.
- Keep hard delete hidden behind admin/force behavior if backend policy allows it.
- Refresh livestock, sales, entities, ledger, and dashboard after reversal.

Backend still missing:

- `POST /api/finance/sales/{id}/void` if the product wants a distinct void action separate from reverse.

### Procurement Purchase Completion

Backend now exposes:

- `GET /api/procurement/feed-purchases`
- `GET /api/procurement/feed-purchases/{id}`
- `PUT /api/procurement/feed-purchases/{id}`
- `POST /api/procurement/feed-purchases/{id}/reverse`

Frontend tasks:

- Add read/update/reverse wrappers.
- Replace old edit-procurement local flow with backend purchase update.
- Add purchase reversal UI.
- Show inventory/expense/vendor effects after update or reversal.

### Inventory Movement History

Backend now exposes:

- `GET /api/operations/inventory-movements`
- `GET /api/operations/inventory-movements/{itemId}`
- `GET /api/operations/inventory-movements/by-item/{itemId}`
- `GET /api/operations/inventory-movements/{movementId}/audit`

Frontend tasks:

- Add inventory movement service wrappers.
- Add stock-card/history drawer from Procurement inventory items.
- Add filters for date, farm, item, movement type, and reference.
- Add movement audit view for high-risk adjustments.

### Palai Lifecycle

Backend now exposes:

- `DELETE /api/palai/assignments/{livestockId}`
- `POST /api/palai/assignments/{livestockId}/transfer`
- `GET /api/palai/invoices`
- `GET /api/palai/invoices/{id}`
- `POST /api/palai/invoices/{id}/void`
- `GET /api/palai/packages/history`

Frontend tasks:

- Add unassign and transfer workflows.
- Add Palai invoice list/detail view.
- Add invoice void action with ledger warning.
- Add package history surface.
- Add payment history for Palai invoice payments.

### Notifications

Backend now exposes:

- `GET /api/notifications/unread-count`
- `POST /api/notifications/read-all`

Frontend tasks:

- Replace local unread badge count with backend unread-count.
- Add mark-all-read action.
- Add notification preferences UI.
- Validate user-scoped behavior.

### Audit Logs

Backend now exposes:

- `GET /api/audit-logs`

Frontend tasks:

- Add Admin Audit Log screen.
- Add filters by entity type, entity ID, and limit.
- Link audit rows from stock movements and financial correction workflows where possible.

## Still Blocked or Partially Blocked

### Role and Permission-Aware UX

Backend missing from Swagger:

- `GET /api/users/me`
- `GET /api/roles`

Frontend impact:

- Navigation and destructive actions cannot be reliably permission-aware.
- Team Access cannot render a canonical role catalog.
- UI must avoid assuming role strings are stable.

Recommended interim frontend behavior:

- Keep destructive controls guarded by confirmation and backend errors.
- Do not hard-code a complex permission matrix until backend exposes current-user permissions.

### Expense Reverse UX

Backend missing from Swagger:

- `POST /api/finance/expenses/{id}/reverse`

Frontend impact:

- Expense delete/edit exists, but production-grade ledger correction should prefer a reverse action.
- Payment reverse exists for payment records, but parent expense reverse is still unclear.

Recommended interim frontend behavior:

- Keep expense delete warnings strong.
- Do not label expense delete as "reverse" unless backend confirms it is ledger-safe.

## Service Layer Gaps

The local `services/backendService.ts` still needs wrappers for the newly unblocked endpoints:

- `updateLocation`, `deleteLocation`, `updateLocationStatus`
- `updateFarm`, `deleteFarm`, `updateFarmStatus`
- `updateMedicalRecord`, `deleteMedicalRecord`
- `updateWeightRecord`, `deleteWeightRecord`
- `updateMilkRecord`, `deleteMilkRecord`
- `updateSale`, `reverseSale`
- `getFeedPurchases`, `getFeedPurchase`, `updateFeedPurchase`, `reverseFeedPurchase`
- `getInventoryMovements`, `getInventoryMovementsByItem`, `getInventoryMovementAudit`
- `getPalaiInvoices`, `getPalaiInvoice`, `voidPalaiInvoice`, `unassignPalaiLivestock`, `transferPalaiLivestock`, `getPalaiPackageHistory`
- `getNotificationUnreadCount`, `markAllNotificationsRead`
- `getAuditLogs`

The service file is also still large and mixed. Splitting by domain remains valuable:

- `livestockApi.ts`
- `financeApi.ts`
- `operationsApi.ts`
- `procurementApi.ts`
- `palaiApi.ts`
- `adminApi.ts`
- `notificationsApi.ts`
- `reportsApi.ts`

## Frontend v2 Implementation Plan

### Milestone v2.1: API Wrappers and Types

- Add wrappers for all newly available endpoints.
- Replace broad `any` on new wrappers with DTO types.
- Standardize use of `apiRequest`.
- Add lightweight response normalization only where backend shapes vary.

### Milestone v2.2: Correction Workflows

- Add animal history edit/delete UI.
- Add sale reverse UI.
- Add feed purchase update/reverse UI.
- Add clear confirmation dialogs for inventory and ledger side effects.

### Milestone v2.3: Palai and Inventory Traceability

- Add Palai invoice list/detail/void.
- Add Palai transfer/unassign/package history.
- Add inventory movement stock-card view.
- Add movement audit drilldown.

### Milestone v2.4: Admin Governance and Notification Polish

- Add backend unread-count and read-all notification actions.
- Add notification preferences UI.
- Add audit log admin screen.
- Add role/current-user support after backend exposes `GET /api/users/me` and `GET /api/roles`.

## Validation Plan

Run after frontend v2 work:

- `npx tsc --noEmit`
- `npm run build`
- Create/update/delete animal history records and verify detail refresh.
- Create/reverse sale and verify sales, livestock, entities, ledger, dashboard refresh.
- Create/update/reverse feed purchase and verify feed inventory and movement history.
- Void Palai invoice and verify Palai summary, invoice detail, ledger, and entity balances.
- Mark all notifications read and verify unread badge from backend.
- Open audit log screen and verify filters.


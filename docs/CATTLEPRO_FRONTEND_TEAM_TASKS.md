# CattlePro Frontend Team Tasks

Audit date: 2026-05-20  
Swagger validated: `http://139.59.8.119:8381/swagger-ui` through `GET /v3/api-docs`  
Frontend app: React, Vite, TypeScript  
Primary objective: remove duplicated user journeys, use the validated APIs consistently, and complete production-grade UI states for core farm workflows.

## Executive Priority

The frontend has broad feature coverage, but several modules currently duplicate the same business events. Sales, expenses, payments, inventory changes, suppliers, and Palai operations can be triggered from different screens with different side effects. The frontend team should consolidate workflows around backend APIs and remove production mock/localStorage behavior that can hide backend truth.

Critical frontend themes:

- Replace duplicated workflows with canonical handlers.
- Use Swagger-targeted endpoints instead of local business logic.
- Complete UI for missing CRUD and correction workflows.
- Remove mock and localStorage business fallbacks from production.
- Replace browser alerts/confirms with professional modals and toasts.
- Add loading, error, empty, retry, and permission-aware states.

## Swagger Validation Status

The live Swagger API exposes modules for:

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
- Tenant
- Sync

The frontend already wraps many of these APIs in `services/backendService.ts`, but some wrappers are missing and several existing wrappers are not used in UI.

## Critical Frontend Blockers

### 1. Production Mock and LocalStorage Fallbacks

Current issue:

- The app falls back to mock data when backend loading fails.
- Sales can be persisted to localStorage when backend sync fails.
- Livestock status overrides can be persisted locally.
- Settings user list is hardcoded mock data.

Critical tasks:

- Add `VITE_DEMO_MODE=true` for demo-only mock data.
- Disable mock fallback in production.
- Remove production localStorage sales fallback.
- Remove production localStorage livestock status override.
- Show explicit backend error state with retry.
- Replace hardcoded Settings users with `GET /api/users`.

Acceptance criteria:

- Production users never see demo livestock, expenses, sales, feed, infrastructure, or diet data unless demo mode is enabled.
- Failed API loads are visible to users and QA.

### 2. Backend Service Layer Needs Cleanup

Current issue:

- `backendService.ts` is large and mixes all domains.
- Several wrappers use `any`.
- Some live Swagger endpoints are missing wrappers.

Critical tasks:

- Add missing wrappers:
  - `migrateLegacyTags`
  - `deleteFinancialsPayment`
  - `reverseFinancialsPayment`
  - `getInventoryMedicineExpirations`
  - `applyTreatmentProtocolById`
  - `getReportFinancial`
  - `getReportHerd`
  - `getReportOperations`
  - `getReportLogs`
  - `getReportMobileDashboard`
- Switch milk creation to `POST /api/livestock/{id}/milk-records`.
- Split service files by domain:
  - `livestockApi.ts`
  - `financeApi.ts`
  - `operationsApi.ts`
  - `procurementApi.ts`
  - `palaiApi.ts`
  - `reportsApi.ts`
  - `adminApi.ts`
  - `notificationsApi.ts`
- Add shared API client for tenant headers, JSON body, query params, and error handling.
- Remove duplicate `AppState` definition in `types.ts`.

Acceptance criteria:

- Every frontend API call uses shared error handling.
- Wrapper names map clearly to Swagger operation intent.
- TypeScript DTOs replace broad `any` where practical.

### 3. Sales Workflow Is Duplicated

Current issue:

Sales can be created or affected from:

- `SalesManager`
- `Financials`
- `LivestockManager`
- `PalaiManager`

Critical tasks:

- Create one sale orchestration hook/service, for example `useSaleWorkflow`.
- All sale entry points call the same workflow.
- Use `POST /api/finance/sales` and `POST /api/finance/sales/bulk`.
- Stop manually setting animal status after sale once backend handles it.
- Use `POST /api/finance/sales/{id}/payments` for payments.
- Use `GET /api/finance/sales/{id}/invoice` for invoice preview/download.
- Refresh sales, livestock, ledger, and entities after sale mutation.
- Add sale payment history using `GET /api/financials/payments`.
- Add sale reverse/void UI once backend provides endpoint.

Acceptance criteria:

- A sale created from any screen produces the same UI and backend outcome.
- No local-only sale records remain after refresh.

### 4. Procurement and Inventory Are Duplicated

Current issue:

Inventory can be changed through Operations, Procurement, diet processing, treatment logging, medical records, and manual expense deletion logic.

Critical tasks:

- Use `POST /api/procurement/feed-purchases` for procurement stock purchases.
- Use `POST /api/operations/feed/adjustments` for manual stock adjustments.
- Use `GET /api/operations/feed/low-stock` for low-stock UI.
- Use `GET /api/operations/inventory/valuation` for inventory valuation UI.
- Add stock movement history once backend adds inventory movement endpoint.
- Remove manual paired calls that update feed and expense separately for purchases.
- Keep Procurement focused on purchasing and vendor payable visibility.
- Keep Operations focused on stock control, diets, treatments, assets, and usage.

Acceptance criteria:

- Procurement entry creates stock and finance records from one backend call.
- Manual stock adjustment writes through adjustment API.
- Inventory cards explain current stock, value, reorder level, and recent movement.

### 5. Finance Payment UI Is Incomplete

Current issue:

- Targeted payment APIs exist but are not consistently used.
- Payment delete/reverse wrappers are missing.
- Supplier clearing can bypass accounting ledger.

Critical tasks:

- Use `POST /api/finance/expenses/{id}/payments`.
- Use `POST /api/finance/sales/{id}/payments`.
- Add `DELETE /api/financials/payments/{paymentId}` wrapper.
- Add `POST /api/financials/payments/{paymentId}/reverse` wrapper.
- Show payment history per sale, expense, entity, and Palai invoice.
- Use `PATCH /api/entities/{id}/balance-adjustment` for balance corrections.
- Add payable/receivable direction labels.
- Remove UI copy that says accounting ledger is unaffected for payment clearing.

Acceptance criteria:

- Users can see, add, and reverse payments.
- Payment changes update finance tables without manual refresh confusion.

### 6. Livestock History Correction Is Incomplete

Current issue:

- Medical, weight, and milk records are add/read only in UI.
- Milk record creation currently works through full livestock update in service layer.

Critical tasks:

- Use `POST /api/livestock/{id}/milk-records`.
- Add edit/delete UI for medical records after backend endpoint exists.
- Add edit/delete UI for weight records after backend endpoint exists.
- Add edit/delete UI for milk records after backend endpoint exists.
- Use `PATCH /api/livestock/{id}/status` for status-only changes.
- Use `PATCH /api/livestock/{id}/palai-assignment` for Palai assignment changes.
- Add clear correction confirmation modals where inventory or expense side effects apply.

Acceptance criteria:

- Animal histories can be corrected without editing the whole animal.
- Status and Palai assignment changes use patch endpoints.

### 7. Settings, Users, Roles, and Notifications Are Not Production-Ready

Current issue:

- Settings has mock users.
- Security and API integration sections are placeholders.
- Notifications wrappers exist but no real notification UI is visible.

Critical tasks:

- Replace mock users with `GET /api/users`.
- Add create/edit/delete/deactivate user UI.
- Add role controls after backend exposes roles.
- Add permission-aware navigation and action visibility after backend exposes current user permissions.
- Add notification bell unread count after backend adds unread-count endpoint.
- Add notification list from `GET /api/notifications`.
- Add mark-read and read-all actions.
- Add notification preferences in Settings.
- Hide or label unavailable Security/API sections as coming soon until backend exists.

Acceptance criteria:

- Settings Team Access displays real users.
- Notification center is visible and actionable.
- Placeholder enterprise cards do not mislead users.

### 8. Palai Lifecycle UI Needs Completion

Current issue:

- Palai summary, clients, invoice generation, and payment APIs are partially used.
- Palai assignment and lifecycle actions are not complete.

Critical tasks:

- Add create Palai client UI using `POST /api/palai/clients`.
- Use `PATCH /api/livestock/{id}/palai-assignment` for assignment updates.
- Add unassign UI when backend supports null assignment or delete assignment.
- Add transfer client UI once backend supports transfer.
- Add Palai invoice list once backend exposes invoice list.
- Use `POST /api/palai/invoices/{id}/payments` for invoice payments.
- Add package editor, package status, and package history once backend supports it.

Acceptance criteria:

- Palai can support client, animal assignment, invoice generation, payment, and closure flows without manual workarounds.

### 9. Reports and Dashboard Need Metric Alignment

Current issue:

- Dashboard, Financials, Reports, and Procurement analytics can calculate similar numbers from different sources.

Critical tasks:

- Prefer server report endpoints for management reports.
- Use canonical `/api/reports/*` routes.
- Align filters across Dashboard, Reports, and Financials:
  - farm
  - location
  - date range
  - species
  - category
  - status
- Add report loading, empty, error, and retry states.
- Keep CSV export.
- Add small metric definition/help panel for management users.

Acceptance criteria:

- Same date/farm filter returns matching totals across dashboard, finance, and reports.

## Frontend Feature Enhancement Tasks

### Enhancement 1: Professional Feedback System

Replace browser `alert` and `confirm` with:

- Toasts for success/error.
- Confirmation modals for destructive actions.
- Impact summaries for reversals and deletes.
- Inline form validation.
- Loading buttons.

High-impact areas:

- Sale delete/reverse.
- Expense delete/reverse.
- Feed ledger reverse/purge.
- Animal delete/deceased.
- Payment reverse.
- Diet processing.
- Palai invoice/payment.

### Enhancement 2: Header Context Switcher

Status:

- Completed in final reconciliation for desktop header.

Original issue:

- Farm/city context was changed from Settings.

Tasks:

- Add direct city/farm switcher in header. Completed.
- Show active context clearly. Completed.
- Keep Settings for admin management of locations/farms.
- Persist selected context per tenant.

### Enhancement 3: Permission-Aware UI

After backend exposes permissions:

- Hide or disable restricted modules.
- Disable destructive actions for non-admin roles.
- Show reason tooltip for unavailable actions.
- Add role badges in user profile area.

### Enhancement 4: UI State Coverage

Every module should include:

- Loading skeleton.
- Empty state.
- Error state.
- Retry action.
- Saved/updated/deleted feedback.
- Unsaved changes protection for large forms.

### Enhancement 5: Performance and Code Splitting

Current build warning:

- Main JS chunk is above recommended size.

Tasks:

- Lazy-load major modules:
  - Dashboard
  - LivestockManager
  - Operations
  - Procurement
  - Financials
  - Reports
  - PalaiManager
  - Settings
  - GeminiAdvisor
- Split chart libraries and AI module.
- Add module-level suspense loaders.

## Frontend Critical Task Board

| Priority | Task | Files/Area | Status |
| --- | --- | --- | --- |
| P0 | Disable production mock/localStorage business fallback | `App.tsx`, `tenantContext.ts` | Completed in Milestone 1 |
| P0 | Add missing API wrappers and shared client | `services/*`, `types.ts` | Partially completed in Milestone 1; service split/DTO cleanup remains |
| P0 | Centralize sale workflow | `SalesManager`, `Financials`, `LivestockManager`, `App.tsx` | Partially completed in Milestones 1 and 4; sale edit/void remains backend-dependent |
| P0 | Use procurement feed-purchase endpoint | `Procurement.tsx` | Completed in Milestone 2 for new purchases |
| P0 | Use targeted expense/sale payment endpoints | `Financials.tsx`, `SalesManager.tsx`, `Procurement.tsx` | Partially completed in Milestones 2-4; entity/Palai surfaces remain |
| P1 | Switch livestock status and Palai assignment to patch APIs | `LivestockManager.tsx`, `App.tsx` | Completed in Milestone 1 |
| P1 | Replace Settings mock users with API users | `Settings.tsx` | Partially completed in Milestone 3; full role/status CRUD remains |
| P1 | Add notifications center | `App.tsx`, `Settings.tsx` | Partially completed in Milestone 3; preferences/read-all remain |
| P1 | Add low-stock and inventory valuation UI | `Operations.tsx`, `Procurement.tsx` | Partially completed in Milestone 2 via Procurement dashboard |
| P1 | Complete Palai client and assignment UI | `PalaiManager.tsx`, `LivestockManager.tsx` | Remaining/backend-dependent |
| P2 | Replace alerts/confirms with modals/toasts | Shared UI components | Not started |
| P2 | Add Playwright smoke tests | test suite | Not started |
| P2 | Code split large modules | app shell/routes | Not started |

## Frontend API Update Checklist

Use or add wrappers for:

- `POST /api/livestock/{id}/milk-records`
- `PATCH /api/livestock/{id}/status`
- `PATCH /api/livestock/{id}/palai-assignment`
- `POST /api/livestock/migrate-legacy-tags`
- `POST /api/procurement/feed-purchases`
- `POST /api/operations/feed/adjustments`
- `POST /api/operations/feed/{id}/adjustments`
- `GET /api/operations/feed/low-stock`
- `GET /api/operations/inventory/valuation`
- `POST /api/finance/expenses/{id}/payments`
- `POST /api/finance/sales/{id}/payments`
- `GET /api/financials/payments`
- `DELETE /api/financials/payments/{paymentId}`
- `POST /api/financials/payments/{paymentId}/reverse`
- `PATCH /api/entities/{id}/balance-adjustment`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`
- `GET /api/notifications`
- `PATCH /api/notifications/{id}/read`
- `POST /api/notifications/preferences`
- `GET /api/reports/financial`
- `GET /api/reports/herd`
- `GET /api/reports/operations`
- `GET /api/reports/logs`
- `GET /api/reports/mobile-dashboard`

## Frontend Validation Checklist

- Run `npm run build`.
- Run `npx tsc --noEmit`.
- Verify no production mock fallback with API disconnected.
- Verify tenant header is sent on all tenant-scoped API calls.
- Verify sale creation from Sales, Finance, and Livestock produces same backend result.
- Verify procurement purchase creates stock and finance records from one call.
- Verify payment history loads and payment reversal refreshes balances.
- Verify livestock status patch updates only status.
- Verify Palai assignment patch updates client and package details.
- Verify Settings users are loaded from backend.
- Verify notifications load, mark read, and update preferences.
- Verify dashboard/report/financial totals align for same filter.

## Frontend QA Smoke Test Plan

Create Playwright tests for:

- Login with tenant URL.
- Farm/city context switch.
- Create farm and location.
- Create cattle and goat records.
- Add medical, weight, milk, and breeding records.
- Create single animal sale.
- Create bulk animal sale.
- Record sale payment.
- Record expense payment.
- Create feed purchase.
- Manual stock adjustment.
- Create diet plan.
- Process diet plan.
- Reverse diet ledger.
- Apply treatment protocol.
- Create Palai client.
- Assign Palai animal.
- Generate Palai invoice.
- Record Palai payment.
- Open reports and export CSV.
- Add user in Settings.
- Mark notification as read.

## Frontend Delivery Milestones

### Milestone 1: API and Data Integrity

- Shared API client.
- Missing wrappers.
- No production mock fallback.
- Milk record endpoint switch.
- Patch status/Palai assignment.

### Milestone 2: Workflow Consolidation

- Unified sale workflow.
- Unified procurement purchase workflow.
- Targeted payment workflows.
- Inventory valuation and low-stock UI.

### Milestone 3: Admin, Palai, and Notifications

- Real users in Settings.
- Notification center.
- Palai client/assignment/invoice/payment completion.
- Permission-aware UI readiness.

### Milestone 4: UX and QA Hardening

- Toasts/modals.
- Empty/error/retry states.
- Playwright smoke tests.
- Code splitting.
- Dashboard/report metric alignment.

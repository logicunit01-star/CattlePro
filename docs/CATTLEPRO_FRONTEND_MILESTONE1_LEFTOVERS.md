# CattlePro Frontend Leftover Tasks v2.0

Updated: 2026-06-01  
Document rule: this file lists only remaining work and the reason each item is still open.

## Backend-Dependent Leftovers

### Role and Current-User Permissions

Remaining work:

- Permission-aware navigation.
- Role-based destructive action visibility.
- Canonical role selector in Team Access.
- Current-user display and tenant permission checks.

Reason:

- Swagger still does not expose `GET /api/users/me` or `GET /api/roles`. The frontend should not hard-code production permissions without a backend permission contract.

### Expense Reversal Workflow

Remaining work:

- Replace expense delete as the primary correction workflow.
- Add explicit expense reverse action in Financials and Procurement-linked expense views.
- Show reversal impact before confirmation.

Reason:

- Swagger exposes expense update/delete and expense payments, but not `POST /api/finance/expenses/{id}/reverse`. For accounting-sensitive production use, delete and reverse should not be treated as the same action unless the backend contract says so.

### Delete Versus Reverse Contract

Remaining work:

- Standardize frontend wording for delete, reverse, void, archive, and deactivate.
- Show affected records after destructive/correction mutations.
- Handle backend conflict responses consistently.

Reason:

- Swagger exposes several delete and reverse endpoints, but the response contract does not yet consistently declare whether a delete is hard delete, soft delete, reversal, or blocked due to dependencies.

### Sale Void Terminology

Remaining work:

- Add a distinct "void sale" UI only if product requires void to mean something different from reverse.

Reason:

- Swagger exposes `POST /api/finance/sales/{id}/reverse`, but not `POST /api/finance/sales/{id}/void`.

## Frontend UX Leftovers

No open frontend UX leftover remains from the v2.0 UX section after this pass.

Reason:

- Field-complete farm/location forms, animal history correction forms, Palai invoice detail/payment history, inventory movement audit drilldown, notification preferences, and native browser dialog replacement for the audited Sales/Financials/Settings paths have been implemented.

## Frontend Technical Leftovers

### Service Layer Split

Remaining work:

- Split `services/backendService.ts` by domain.
- Replace broad `any` DTOs with typed request/response contracts.
- Move all requests to the shared `apiRequest` helper.

Reason:

- The single service file is still too large. Splitting it is structural cleanup and should be done after the v2 behavior changes are stable.

### Performance Code Splitting

Remaining work:

- Lazy-load major modules.
- Split chart-heavy dashboard/report bundles.
- Split AI advisor dependencies.

Reason:

- Production build still reports a large bundle chunk. This is a performance task, not a feature blocker.

## QA Leftovers

### Live Backend Mutation QA

Remaining work:

- Test farm/location edit, deactivate, and dependency-blocked delete on a seeded tenant.
- Test medical, weight, and milk record correction side effects.
- Test sale reverse against animal status, ledger, entity balance, and payment state.
- Test feed-purchase update/reverse against inventory movement history.
- Confirm whether live backend feed-purchase update/reverse accepts feed-purchase ID, expense ID, or a shared transaction ID in seeded production data.
- Test Palai invoice void against ledger, receivable, and summary totals.
- Test Palai invoice payment history and reversal against live payment reference types.

Reason:

- Static TypeScript/build validation can prove integration compiles, but accounting and inventory correctness require seeded backend data and production-like credentials.

### Error Contract QA

Remaining work:

- Validate conflict responses for linked farms, locations, livestock, expenses, feed purchases, and invoices.
- Map backend validation errors into inline UI messages.

Reason:

- The frontend currently catches failures, but polished field-level error handling needs stable backend error payloads.

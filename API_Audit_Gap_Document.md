# CattlePro Web Application - API Integration Gap Document

## 1. Overview
This document outlines the gaps between the currently implemented frontend functionality in the CattlePro web application and the available endpoints exposed by the Swagger API (`http://139.59.8.119:8381/swagger-ui`).

## 2. Palai Partnering Section Audit
**Status:** **NOT DISABLED, BUT NOT PROPERLY CONSUMED**
- The "Palai Partnering" section is currently enabled and visible in the side navigation menu (`App.tsx` renders `<NavItem view="PALAI" />`).
- However, the component `PalaiManager.tsx` does **not** consume any of the dedicated `/api/palai/*` endpoints. Instead, it attempts to derive Palai data locally by filtering the generic `livestock` and `entities` global states. 
- A section within `PalaiManager.tsx` regarding the "Full Palai Animal Registry" is explicitly hardcoded to display "COMING SOON".
- **Gap:** The frontend needs to be wired up to actually invoke the `api/palai/*` endpoints rather than relying entirely on local filtering.

## 3. Unconsumed APIs (Gap Analysis)
The following endpoints exist in the Swagger definition but are currently missing from the `services/backendService.ts` and not consumed by the web application:

### A. Palai Module
- `POST /api/palai/invoices` - Create Palai invoices.
- `POST /api/palai/invoices/{id}/payments` - Process payments against Palai invoices.
- `GET /api/palai/clients` & `POST /api/palai/clients` - Manage Palai clients.
- `POST /api/palai/assignments` - Assign livestock to Palai clients.
- `GET /api/palai/summary` - Fetch Palai summary data.

### B. Users & Auth Module
- `GET /api/users` & `POST /api/users` - User management lists and creation.
- `PUT /api/users/{id}` & `DELETE /api/users/{id}` - Update/delete specific users.

### C. Notifications Module
- `GET /api/notifications` & `POST /api/notifications` - Fetch and create notifications.
- `PUT/PATCH /api/notifications/{id}/read` - Mark notifications as read.
- `POST /api/notifications/register-device` - Register device for push notifications.
- `POST /api/notifications/preferences` - Manage user notification preferences.

### D. Specific Livestock Operations
- `PATCH /api/livestock/{id}/status` - Quick update of livestock status (Frontend currently does a full `PUT /api/livestock/{id}` instead).
- `PATCH /api/livestock/{id}/palai-assignment` - Handle specific Palai assignments.

### E. Financials & Entities Specific Endpoints
- `POST /api/finance/expenses/{id}/payments` - Partial/direct payments on specific expenses.
- `POST /api/finance/sales/{id}/payments` - Partial/direct payments on specific sales.
- `PATCH /api/entities/{id}/balance-adjustment` - Direct entity balance adjustments.
- `GET /api/entities/{id}/ledger` - Entity-specific ledger view.
- `GET /api/finance/summary` & `GET /api/finance/profitability/animals`

### F. Procurement & Inventory
- `POST /api/procurement/feed-purchases` - Dedicated feed purchase flow.
- `POST /api/operations/feed/{id}/adjustments` & `POST /api/operations/feed/adjustments` - Specific inventory adjustments.
- `GET /api/operations/low-stock` & `GET /api/operations/feed/low-stock` - Low stock alerts.
- `GET /api/operations/inventory/valuation` - Inventory financial valuation.

### G. Advanced Operations & Logs
- `POST /api/operations/diet-plans/{id}/process` - Processing of a specific diet plan.
- `POST /api/operations/consumption-logs/delete-batch` - Bulk delete consumption logs.

### H. Mobile Sync & System
- `POST /sync/mobile-mutations` & `POST /api/sync/mobile-mutations` - Mobile offline sync endpoints (Not required for Web, but noted).

### I. Additional Reports
- `GET /api/reports/operations`
- `GET /api/reports/mobile-dashboard`
- `GET /api/reports/logs`
- `GET /api/reports/herd`

## 4. Summary & Recommendations
1. **Palai Partnering:** Transition the `PalaiManager` component to fetch and manipulate data through the specific `/api/palai/*` routes.
2. **Users & Notifications:** Implement a settings or administration panel to utilize the User and Notification APIs.
3. **Performance Optimization:** Start utilizing `PATCH` endpoints (like `/api/livestock/{id}/status`) instead of full `PUT` operations for better performance when toggling basic flags.
4. **Targeted Payments:** Wire up the specific `/payments` endpoints under expenses and sales to allow proper invoice partial payments instead of generic ledger entries.

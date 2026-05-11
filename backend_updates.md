# Backend Updates Required for Palai (Third-Party) Module

This document outlines the APIs, fields, and logic the backend developer needs to implement to fully support the Palai integration in the CattlePro web application.

## 1. Livestock DTO Updates
The `Livestock` entity/DTO needs the following fields to track Palai ownership:
- `ownership`: Enum/String (`'OWNED'`, `'PALAI'`).
- `palaiCustomerId`: String (Reference to the Client `Entity` ID).
- `palaiProfile`: JSON Object / Embedded Document containing:
  - `startDate`: String (Date)
  - `ratePerMonth`: Number (Monthly fee in PKR)
  - `feedPlan`: String (`'BASIC'`, `'PREMIUM'`, `'CUSTOM'`)
  - `specialInstructions`: String (Optional notes)

## 2. Required Endpoints

### A. Palai Summary (`GET /api/palai/summary`)
Returns aggregated metrics for the Palai dashboard.
**Query Params:** `?farmId={farmId}` (Optional)
**Response:**
```json
{
  "totalAnimals": 45,
  "activeCustomers": 12,
  "totalProjectedRevenue": 675000, 
  "totalOutstanding": 125000,      
  "avgWeightGain": 0.82            
}
```
*Logic:* Calculate `totalProjectedRevenue` by summing `ratePerMonth` of all active Palai animals. `avgWeightGain` is an average across weight records for Palai animals.

### B. Palai Clients (`GET /api/palai/clients` & `POST /api/palai/clients`)
Handles third-party customers. 
*Logic:* Can simply be a wrapper over the `Entity` table where `type = 'PALAI_CLIENT'`.

### C. Livestock Assignment (`PATCH /api/livestock/{id}/palai-assignment`)
Quickly assign or update a Palai package for an animal without a full PUT.
**Request Body:**
```json
{
  "clientId": "ent-12345",
  "palaiProfile": {
    "startDate": "2026-05-01",
    "ratePerMonth": 15000,
    "feedPlan": "PREMIUM",
    "specialInstructions": "Extra minerals required"
  }
}
```
*Logic:* Update the `palaiCustomerId` and `palaiProfile` of the livestock record. Ensure `ownership` is set to `'PALAI'`. 

### D. Palai Invoicing Engine (`POST /api/palai/invoices`)
Automated billing endpoint for generating monthly Palai invoices.
**Request Body:**
```json
{
  "farmId": "farm-1",
  "customerId": "ent-12345",
  "billingPeriodStart": "2026-04-01",
  "billingPeriodEnd": "2026-04-30"
}
```
*Logic:* 
1. Fetch all active animals linked to the `customerId`.
2. Determine active days within the billing period for each animal based on their `palaiProfile.startDate`.
3. Prorate the `palaiProfile.ratePerMonth` and calculate total fees.
4. Generate a `Sale` or `Invoice` record.
5. Update the client's `LedgerRecord` increasing their outstanding balance.

### E. targeted Invoice Payments (`POST /api/palai/invoices/{id}/payments`)
Process payments specifically against Palai invoices.
**Request Body:**
```json
{
  "amount": 50000,
  "date": "2026-05-05",
  "paymentMethod": "BANK",
  "notes": "Partial payment"
}
```
*Logic:* Update the invoice's `amountPaid` and `status`. Create a `LedgerRecord` crediting the customer to reduce their `currentBalance`.

### F. Entity Balance Adjustment (`PATCH /api/entities/{id}/balance-adjustment`)
Manual override for fixing ledgers.
**Request Body:**
```json
{
  "amount": 10000,
  "direction": "CREDIT",
  "date": "2026-05-05",
  "reason": "Adjustment for overcharge"
}
```
*Logic:* Adjust the `currentBalance` directly and append a `LedgerRecord` explaining the manual adjustment.

## 3. UI/UX Audit Phase 1 & 2 Implementation Notes

### A. Tenant Setup Status
To support the new "Welcome Empty State" dashboard in Phase 2, the UI currently relies on `state.farms.length === 0` to assume the user is new.
However, a more robust check should be provided by the backend to avoid race conditions.

**Endpoint Used**: `GET /api/tenant/setup`
Currently, this exists in swagger but returns `{}`. 
**Required Fields:**
```json
{
  "isSetupComplete": false,
  "hasFarms": false,
  "hasUsers": true,
  "currencySet": false
}
```
*Logic:* The UI will use this to highlight the specific missing widgets (e.g., if `hasFarms` is true but `currencySet` is false, it highlights the Finance Config widget on the dashboard).

### B. User Management (`/api/users`)
Phase 2 introduces a cleaner Team Access drawer. 
We need the following field mapped from `AppUser`:
- `status`: `'ACTIVE' | 'INACTIVE'`
- `lastLogin`: ISO Date String (Currently the UI mocks this as `2026-02-28 10:00 AM`). The backend should track this on the JWT generation endpoint.

### C. General Config Profile (`/api/tenant/setup` -> `POST /api/tenant/setup`)
When the user fills out the "General Profile" widget, they configure currency and instance name.
The existing `/api/tenant/setup` POST should accept:
```json
{
  "instanceName": "GoatUnit Livestock",
  "defaultCurrency": "PKR"
}
```
These settings should cascade into the global `Farm` creation if applicable or reside on the tenant settings table.

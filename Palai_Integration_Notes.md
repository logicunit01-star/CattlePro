# Palai Module - Integration & Development Notes

This document provides a comprehensive guide on how the Palai (Third-Party Partnering) module works, how animals are tagged to customers, and detailed notes for both frontend and backend developers regarding the recent architecture updates.

---

## 1. How to Add or Tag a Palai Animal with a Customer and Package

To associate an animal with a Palai customer and assign a specific package, the process revolves around the `Livestock` object's properties.

### Data Structure Requirements
When creating or updating a `Livestock` entity, the following fields must be set:
1. `ownership`: Set to `'PALAI'` (instead of `'OWNED'`).
2. `palaiCustomerId`: The ID of the `Entity` (Client) who owns the animal.
3. `palaiProfile`: An object defining the Palai package.
   ```json
   {
     "startDate": "2026-05-01",
     "ratePerMonth": 15000,
     "feedPlan": "PREMIUM",
     "specialInstructions": "Extra minerals required"
   }
   ```

### UI Implementation Path
Currently, the easiest way to tag an animal is to update the **"Add/Edit Livestock" form** (likely in `LivestockManager.tsx`):
1. Add a toggle or dropdown for **Ownership Type** (`Owned` vs `Palai`).
2. If `Palai` is selected, show a dropdown to select a **Palai Customer** (fetching from `state.entities.filter(e => e.type === 'PALAI_CLIENT')`).
3. Show fields to define the **Palai Package** (`ratePerMonth`, `feedPlan`).
4. Upon saving, the frontend will either call `updateLivestock` (sending the full object) OR use the newly added, highly efficient endpoint:
   ```typescript
   backendService.patchPalaiAssignment(animalId, {
       clientId: selectedCustomerId,
       palaiProfile: { ratePerMonth: 15000, feedPlan: 'PREMIUM', startDate: '...' }
   });
   ```

---

## 2. Notes for Backend Developer

To fully support the new frontend capabilities, the backend requires specific logic and endpoints. The following needs to be implemented or verified in the backend API:

### A. Palai Summary Calculation
The frontend now relies on `GET /api/palai/summary`. The backend must calculate and return:
```json
{
  "totalAnimals": 45,
  "activeCustomers": 12,
  "totalProjectedRevenue": 675000, // Sum of (ratePerMonth) for all active Palai animals
  "totalOutstanding": 125000,      // Sum of unpaid Palai invoices / Customer ledger balances
  "avgWeightGain": 0.82            // Calculated from weight records of Palai animals over last 30 days
}
```

### B. Assignment Endpoints
- **`POST /api/palai/assignments`** or **`PATCH /api/livestock/{id}/palai-assignment`**: Needs to securely update the `palaiCustomerId` and `palaiProfile` for an animal.
- **Logic:** If an animal is transferred from one Palai client to another, ensure the billing date is prorated or an automatic invoice is generated for the old client.

### C. Palai Invoicing Engine (CRITICAL)
- **`POST /api/palai/invoices`**: When the frontend requests invoice generation, the backend should:
  1. Find all active animals linked to the `clientId`.
  2. Calculate the days elapsed since the `startDate` (or since the last invoice).
  3. Prorate the `ratePerMonth` from the `palaiProfile`.
  4. Generate a `Sale`/`Invoice` record and update the client's `LedgerRecord` to reflect the new outstanding balance.

### D. Specific Payments & Balances
- **`POST /api/finance/sales/{id}/payments`**: Accept partial payments against specific Palai invoices. This must update the `amountPaid` on the invoice and append a `LedgerRecord` crediting the Palai client.
- **`PATCH /api/entities/{id}/balance-adjustment`**: Ensure this explicitly updates the `currentBalance` of a Palai client if a manual adjustment is needed.

---

## 3. Summary of Previous Frontend Development

Here is exactly what was developed in the recent session to bridge the gap between the frontend UI and the Swagger API.

### `services/backendService.ts` Updates
Added over **20 new wrapper functions** to consume previously missing backend APIs:
* **Palai Operations:** `getPalaiClients`, `createPalaiClient`, `getPalaiSummary`, `assignPalaiLivestock`, `createPalaiInvoice`, and `payPalaiInvoice`.
* **User & Auth:** `getUsers`, `createUser`, `updateUser`, `deleteUser`.
* **Notifications:** `getNotifications`, `markNotificationRead`, `registerDevice`, `updateNotificationPreferences`.
* **Targeted Financials:** `expensePayment`, `salePayment`, `balanceAdjustment`, `getEntityLedger`, and `getFinanceSummary`.
* **Inventory Specifics:** `feedPurchase`, `adjustFeedById`, `getLowStock`, `getLowStockFeed`, `getInventoryValuation`.
* **Livestock Patches:** `patchLivestockStatus`, `patchPalaiAssignment` (lightweight updates instead of massive PUTs).

### `components/PalaiManager.tsx` Rewrite
Completely refactored the component from a static, mock-data view to an API-driven dashboard:
1. **API Integration:** Implemented `useEffect` to automatically fetch `backendService.getPalaiClients()` and `backendService.getPalaiSummary()` on load, mapping to `palaiClients` and `palaiSummary` states.
2. **Removed Global State Dependency:** Shifted calculations (like projected revenue and outstanding balances) away from manual frontend mapping (via `state.customers`) to utilizing the definitive values provided by the backend `summary` response.
3. **Full Palai Registry Built:** Replaced the static `"COMING SOON"` placeholder under the `ANIMALS` tab with a fully functional data table. It now dynamically lists all 3rd-party animals, showing their Tag ID, assigned Client Name, Species/Breed, and Current Weight.

# CattlePro Business Assurance & Maturation Plan

## Phase 1: Finance & Entity Core (The "Accountant" Upgrade)
**Objective:** Move from "Petty Cash" list to a real double-entry-lite ledger system with Vendor management.

- [x] **Data Model Update (`types.ts`)**:
    - [x] Create `Entity` type (Unified Vendor/Customer/PalaiUser registry).
    - [x] Create `Bill` type (Accounts Payable).
    - [x] Create `Transaction` / `LedgerLine` type (Unified Financial History).
- [x] **Entity Manager Module**:
    - [x] Create `components/EntityManager.tsx` to manage Vendors & Customers.
    - [x] Features: Add/Edit Entity, View Ledger History (Statement of Account).
- [x] **Refactor Financials**:
    - [x] Stop "Manual Sales" entry (must use Sales Module).
    - [x] Convert "Expenses" to "Bill Entry" (Must select Vendor).
    - [x] Implement "Pay Bill" workflow (Credit Cash, Debit Vendor).

## Phase 2: Data Integrity & Sales Sync
**Objective:** Ensure no "Zombie Animals" (Sold but still Active) and fix duplicate data entry.

- [x] **Fix Sales Workflow**:
    - [x] In `LivestockManager`, ensuring "Sell" button marks animal as `SOLD` and creates a **Ledger Entry** (Debit Cash, Credit Sales Revenue, Link Customer).
    - [x] Remove independent "Record Sale" button from Finance/Dashboard that bypasses inventory checks.
- [x] **Death & Deceased Workflow**:
    - [x] Add "Mark Deceased" action.
    - [x] Capture: Date, Cause of Death, Post-Mortem Notes.
    - [x] Update Status to `DECEASED` (do not delete record).

## Phase 3: Operational Efficiency (Bulk & Mobile)
**Objective:** Make the app usable in the shed by workers.

- [ ] **Bulk Operations**:
    - [x] **Bulk Medical**: Select 50 animals -> "Vaccinate" -> Deduct 50 doses -> Create 1 Expense Record. (Implemented via Batch Mode)
    - [x] **Bulk Move**: Select group -> Change Location. (Implemented via Batch Mode)
- [ ] **Mobile "Shed Mode"**:
    - [ ] Create `components/MobileLivestockCard.tsx`. (Implemented inline via Responsive Cards)
    - [ ] Refactor `LivestockManager` list view to render Cards on `xs/sm` screens. (Done)
    - [x] Add FAB (Floating Action Buttons) for quick tasks (Weight, Milk, Treat). (Added Add Animal FAB)

## Phase 4: Basic Necessities (Gaps)
- [ ] **Alerts System**:
    - [ ] Dashboard Widget: "Vaccines Due This Week".
    - [ ] Dashboard Widget: "Low Feed Stock".
- [ ] **Reporting**:
    - [ ] Generate "Flock/Herd Statement" (Total Counts by Status).
    - [ ] Generate "Financial Position" (Cash vs Outstanding Debt).

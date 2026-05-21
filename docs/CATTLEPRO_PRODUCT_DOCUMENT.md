# CattlePro Product Document

## Product Summary

CattlePro is a multi-farm livestock operations platform for managing cattle, goats, feed, procurement, finance, Palai partnering, reporting, and day-to-day farm activity from one web application. The product is designed for farm owners, managers, accountants, and operations teams that need a single operating record across animals, inventory, costs, sales, and performance.

CattlePro brings livestock records, farm context, expenses, sales, feed inventory, medical activity, breeding, milk production, and reporting into one system so farm teams can make decisions from live operational and financial data instead of disconnected notebooks or spreadsheets.

## Target Users

- Farm owners who need consolidated visibility across locations and farms.
- Farm managers who record animal health, movement, feed, production, and sales activity.
- Accountants and finance teams who track expenses, revenue, payables, receivables, and ledgers.
- Procurement teams who purchase feed, medicine, tools, and supplies.
- Palai or third-party animal caretaking operators who manage client-owned livestock packages.
- Senior management that needs dashboards, reports, and farm-level performance summaries.

## Core Value Proposition

CattlePro helps livestock businesses connect animal-level activity with operational cost and revenue impact.

Key value areas:

- Centralized livestock records for cattle and goats.
- Farm-wise and city-wise operational visibility.
- Feed, medicine, supply, asset, diet, and treatment tracking.
- Sales, expenses, payments, entity balances, and ledgers.
- Palai client and animal partnering management.
- Production and health history for each animal.
- Financial and operational reports for management review.
- AI advisory support through Gemini for farm decision assistance.

## Application Structure

The application is organized around a left-side navigation system with these major sections:

- Dashboard
- Livestock Management
- Operations and Feed
- Procurement and Stores
- Finance and Accounts
- Sales and Revenue
- Entity Registry
- Reports
- Palai Partnering
- Gemini Advisor
- System Settings

The application also supports a global context model:

- Global view across all farms.
- City or region-level filtering.
- Individual farm-level filtering.
- Tenant-aware API calls using company context from URL parameters.

## Feature Inventory

### 1. Authentication and Tenant Access

CattlePro supports tenant-aware login. When the app is opened with company, instance, and app parameters, it authenticates against a Keycloak login service. The tenant context is stored locally and sent to backend APIs using tenant headers.

Current capability:

- Company-specific login from URL parameters.
- Local session persistence.
- Logout flow.
- Fallback admin login for non-tenant local access.

### 2. Dashboard

The dashboard gives a high-level operating summary for the selected farm, selected city, or all available data.

Current capability:

- Livestock KPIs.
- Active, sick, deceased, and newly added animal counts.
- Expense, revenue, and net profit summaries.
- Milk production trend.
- Feed cost trend.
- Health and production widgets.
- Navigation from dashboard cards into relevant modules.
- Server-backed dashboard endpoints with client-side fallback behavior.

### 3. Multi-Farm and Location Management

CattlePro supports multiple locations and farms under one tenant.

Current capability:

- Create locations or regions.
- Create farms under locations.
- Select active city or farm context.
- Filter dashboard, operations, finance, livestock, reports, procurement, sales, and entities by active context.
- Sync locations and farms from backend.

Core data fields:

- Location name and type.
- Farm name, location, type, currency, and cost center code.

### 4. Livestock Management

The livestock module manages cattle and goat records separately while using a shared livestock profile model.

Current capability:

- Cattle herd management.
- Goat flock management.
- Register new livestock.
- Edit animal profile.
- Delete or archive animal.
- Mark animal deceased.
- Track animal status: active, sick, sold, deceased.
- Search, sort, paginate, and filter animals.
- View animals in table, grid, and timeline layouts.
- Track ownership: owned or Palai.
- Assign Palai customer and package details.
- Manage animal images and gallery uploads.
- Record animal sale directly from profile.
- Bulk vaccinate animals.
- Bulk move animals between locations or pens.

Animal data includes:

- Tag ID, species, category, breed, gender, weight, date of birth.
- Purchase date, purchase price, ownership, status, location, notes.
- Medical history, breeding history, weight history, milk production history.
- Dam and sire references.
- Accumulated feed and medical cost.

### 5. Health and Medical Records

The system supports health activity at the individual and group level.

Current capability:

- Add vaccination, treatment, checkup, injury, heat, or other records.
- Record medicine name, doctor, time, cost, notes, next due date, and image.
- Link treatment to medicine inventory.
- Deduct medicine quantity when inventory is linked.
- Generate medical or vaccine expense records.
- Bulk vaccination workflow.
- Treatment protocol management in Operations.

### 6. Breeding and Birth Records

CattlePro includes breeding lifecycle tracking.

Current capability:

- Add insemination or mating records.
- Track sire, sire breed, breeder/vendor, straw batch, technician, cost, status, expected birth date, and notes.
- Confirm pregnancy.
- Mark failed pregnancy.
- Register birth outcome.
- Create calf or kid records from birth.
- Update or delete breeding records.
- Generate breeding expense records.

### 7. Weight and Milk Production

Animal production and growth history are recorded inside each livestock profile.

Current capability:

- Add weight records with date and notes.
- Add milk records by morning or evening session.
- Track quantity and optional fat content.
- Display history and trends inside livestock details.

### 8. Operations and Feed

Operations is the main farm stock, asset, diet, medicine, and treatment workspace.

Current tabs:

- Activity
- Feed Stock
- Medicine Cabinet
- Farm Supplies
- Fixed Assets
- Diets

Feed and inventory capability:

- Create, edit, and delete feed items.
- Track feed, medicine, tools, supplies, equipment, and other categories.
- Track quantity, unit, weight per unit, unit cost, reorder level, batch, expiry, location, supplier, and description.
- Separate medicine and supplies views based on inventory category.
- Medicine expiry lookup.
- Low-stock and inventory valuation API wrappers are available.

Fixed asset capability:

- Register farm infrastructure and equipment.
- Edit and delete assets.
- Track asset tag, category, status, location, purchase date, value, image, depreciation inputs, and notes.
- Add service and maintenance logs.
- Generate maintenance expenses.

Diet capability:

- Create, edit, and delete diet plans.
- Target individuals, categories, groups, or all animals.
- Add feed ingredients from inventory.
- Support per-animal, total-distributed, and per-100kg-bodyweight distribution modes.
- Process active diet plans.
- Backdate diet processing for historical periods.
- Create consumption logs and feed ledgers.
- Reverse processed feed ledgers.
- Clear feed ledger history.
- Track animal feed cost and inventory deductions.

Treatment protocol capability:

- Create, edit, and delete treatment protocols.
- Target animal categories or selected animals.
- Use medicine inventory as protocol items.
- Apply protocol to selected animals.
- Log treatment batches.
- Generate treatment logs and medical expense records.

### 9. Procurement and Stores

Procurement focuses on feed and material purchasing, store stock, supplier view, and basic procurement analytics.

Current capability:

- Procurement overview dashboard.
- Create new supply entry.
- Edit procurement expense records.
- Register new material.
- Edit material parameters.
- Archive material.
- Track feed types such as grass, TMR, Wanda, and other.
- Track vendor, rate, quantity, weight, amount, payment status, and notes.
- Add purchased quantity to inventory.
- Deduct consumed stock manually.
- Supplier payable view.
- Procurement analytics view.

### 10. Sales and Revenue

CattlePro supports animal and farm-product sales.

Current capability:

- Sales dashboard.
- Create new sale.
- Sell one or multiple animals.
- Record buyer name, contact, amount, date, quantity, payment status, payment method, and notes.
- Mark sold animals as sold.
- Maintain sales history.
- Delete sales and revert sold animals to active.
- Generate sale invoice through backend service.

Supported sale item types:

- Animal
- Milk
- Manure
- Other

### 11. Finance and Accounts

Finance provides expense, sales, ledger, and vendor summary views.

Current tabs:

- Expenses
- Sales
- Ledger

Current capability:

- Add expenses.
- Edit expense payment status.
- Delete expenses.
- Add sales through the finance module.
- Delete sales.
- View server-backed financial KPIs.
- View paginated expenses and sales.
- View financial ledger.
- View vendor payable summaries.
- View expense category analytics.
- Record payments through entity/payment APIs.

Finance data includes:

- Expense category, amount, date, description, supplier, payment status, paid amount, and related animal.
- Sale item type, amount, payment details, buyer, quantity, sold animals, and profit estimate.
- Ledger records by entity and reference type.

### 12. Entity Registry

The entity registry stores parties that interact financially or operationally with the farm.

Current entity types:

- Vendor
- Customer
- Palai client

Current capability:

- Add entity.
- Edit entity.
- Delete entity.
- View entity ledger.
- Record payments.
- Track opening balance and current balance.
- Farm-wise entity filtering.

### 13. Palai Partnering

Palai Partnering supports third-party animal caretaking and package-based billing.

Current capability:

- Palai overview dashboard.
- View Palai customers.
- View customer animals.
- View customer ledger.
- Generate Palai invoices.
- Record Palai payments.
- View Palai animal registry.
- Track Palai package assumptions such as feed plan, rate per month, and special instructions.

Palai use cases:

- Customer-owned animals housed at the farm.
- Monthly or package-based feeding and care plans.
- Animal assignment to client.
- Billing for animal care services.

### 14. Reports

Reports provide management-level analysis across financials, herd, operations, inventory, feed, and logs.

Current report areas:

- Financial Performance
- Herd Demographics
- Inventory
- Feed Consumption
- Operations
- Detailed Logs

Current capability:

- Financial summary, revenue, expenses, and profit charts.
- Herd category and status views.
- Inventory movement reporting.
- Feed usage reporting.
- Animal profitability reporting.
- Export selected report data to CSV.
- Server-backed report endpoints with local fallback calculations.

### 15. Gemini Advisor

CattlePro includes an AI advisor powered by Gemini.

Current capability:

- Reads the current app state.
- Provides advisory responses for farm management questions.
- Can be used for operational insights, health patterns, finance review, and management support.

### 16. System Settings

Settings acts as the configuration hub.

Current capability:

- Select active city or farm context.
- Add city.
- Add farm.
- Sync locations and farms.
- View general profile settings.
- View team access mock list.
- View security and API integration placeholders.
- View system status cards.

## Data Model Overview

The current frontend domain model includes:

- Locations
- Farms
- Livestock
- Medical records
- Breeding and birth records
- Weight records
- Milk records
- Feed and inventory items
- Infrastructure assets
- Maintenance records
- Diet plans
- Feed consumption logs
- Processed feed ledgers
- Treatment protocols
- Treatment logs
- Expenses
- Sales
- Entities
- Bills
- Ledger records
- Invoices
- Palai profiles
- Customers and breeders

## Dataset and Demo Data

The application includes mock data for:

- Locations: Lahore and Sahiwal.
- Farms: Farm A - Lahore, Farm B - Sahiwal, Farm C - Sahiwal.
- Livestock: cattle and goats across dairy, meat, breeding, calf, and Palai use cases.
- Breeders and semen suppliers.
- Feed inventory.
- Infrastructure assets.
- Expenses and sales.
- Customers and invoices.
- Diet plans.

The production app also loads live data from backend APIs. If backend calls fail, some modules fall back to mock or locally persisted data.

## Recommended Website Feature Copy

CattlePro is a complete livestock operations and finance system for modern cattle and goat farms. Manage animals, health records, breeding, milk production, feed stock, diet plans, procurement, sales, expenses, ledgers, reports, and Palai client operations from one farm-wise dashboard.

Built for multi-location farms, CattlePro connects day-to-day farm activity with financial outcomes. Every animal profile can carry its purchase cost, medical history, breeding records, weight changes, milk logs, sales status, and accumulated feed or medical cost. Operations teams can manage feed, medicine, supplies, assets, treatment protocols, and diet processing, while finance teams track expenses, sales, vendors, customers, payments, and ledgers.

For farms offering Palai or third-party animal care, CattlePro supports client-linked animals, monthly care packages, invoicing, payment tracking, and customer ledgers.

Management receives dashboards and reports across livestock, inventory, feed consumption, profit, expenses, revenue, and farm performance, supported by AI advisory tools for faster operational decision-making.

## Product Positioning

CattlePro should be positioned as:

- A farm operating system for cattle and goat businesses.
- A livestock record system connected to finance.
- A multi-farm dashboard for owners and management.
- A practical tool for Pakistani livestock operations using PKR, Palai, feed procurement, and farm-wise cost tracking.

## Current Production Readiness Note

The application has a broad product surface and a successful production build. However, some modules contain duplicated workflows, mock placeholders, localStorage fallback behavior, and incomplete CRUD coverage. These should be reviewed before marketing every feature as fully production-complete.


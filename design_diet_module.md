# Diet & Nutrition Management Module - Design Specification

## 1. Overview
This module enables automated feed management, from diet plan creation to inventory deduction and cost tracking. It is fully integrated with the Multi-Farm system.

## 2. Terminology
- **Diet Plan**: A defined set of feed items and quantities assigned to a specific target (Animal, Group, or Category).
- **Ration**: The specific mix of ingredients (e.g., Silage 20kg, Wanda 5kg).
- **Consumption Log**: A daily record of feed actually consumed, derived from active diet plans.

## 3. Data Model Updates (`types.ts`)

### 3.1 New Types

```typescript
export type DietTargetType = 'INDIVIDUAL' | 'CATEGORY' | 'GROUP' | 'ALL';

export type DietStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';

export interface DietPlanItem {
    id: string; // Unique ID for the item entry
    inventoryId: string; // Link to FeedInventory
    inventoryName: string; // Denormalized for display
    quantity: number; // Daily amount per animal
    unit: string; // e.g., 'kg', 'g'
    costPerUnit?: number; // Snapshot of cost at plan creation (optional)
}

export interface DietPlan {
    id: string;
    farmId: string;
    name: string;
    targetType: DietTargetType;
    targetId?: string; // ID of animal, or 'Milking Cows', 'Calves', etc.
    targetName?: string; // Display name for target
    status: DietStatus;
    startDate: string;
    endDate?: string;
    items: DietPlanItem[];
    notes?: string;
    // Computed fields
    totalAnimals?: number; // How many animals currently on this plan
    costPerAnimalPerDay?: number;
    totalCostPerDay?: number;
}

export interface ConsumptionLog {
    id: string;
    farmId: string;
    dietPlanId: string;
    date: string;
    itemId: string; // FeedInventory ID
    quantityUsed: number; // Total consumed = (qty per animal * animal count)
    cost: number; // Total cost for this entry
    unit: string;
}
```

### 3.2 Updates to Existing Types

- **FeedInventory**: Ensure `unitCost` is present and maintained.

## 4. Functional Logic

### 4.1 Diet Plan Application
- User selects **Farm**.
- User creates Plan -> Adds Items -> Selects Target.
- **Validation**: Check if sufficient inventory exists for at least 7 days.

### 4.2 Auto-Consumption (Backend Logic)
- **Trigger**: Daily job or "Run Daily Close" action.
- **Process**:
  1. Find all `ACTIVE` Diet Plans.
  2. For each plan:
     - Identify eligible animals (e.g., all "Dairy" cattle in "Farm A").
     - Count animals (N).
     - For each `PlanItem`:
       - `TotalQty = Item.quantity * N`.
       - Deduct `TotalQty` from `FeedInventory`.
       - Calculate `Cost = TotalQty * Inventory.unitCost`.
       - Create `ConsumptionLog` entry.
       - Create `Expense` entry (Category: `FEED`).

### 4.3 Forecasting
- **Formula**: `Remaining Days = Current Stock / Daily Consumption Rate`.
- **Alerts**: If `Remaining Days < 7`, show warning.

## 5. UI Components

### 5.1 Diet Plan Manager (Wizard)
- **Step 1**: Basic Info (Name, Farm, Target).
- **Step 2**: Formula Builder (Add Ingredients, Real-time Cost Calculation).
- **Step 3**: Review & Activate.

### 5.2 Dashboard Widgets
- **Feed Cost vs Budget**: Line chart.
- **Stock Alerts**: Red/Yellow indicators for low stock.

### 5.3 Reports
- **Feed Usage Report**: Table showing Item usage over time.
- **Cost Analysis**: Feed cost per animal per day.

## 6. Migration
- Existing `MOCK_DIET_PLANS` will be mapped to the new structure.

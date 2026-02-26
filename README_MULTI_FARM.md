# Multi-Farm System

This update introduces Multi-Farm and Multi-Location architecture to CattlePro.

## Key Features

1.  **Farm & Location Context**:
    - **Locations**: Define logical regions (e.g., Cities).
    - **Farms**: Individual units belonging to a Location.
    - **Global/Consolidated View**: Manage all farms or a specific city's farms from a single dashboard.

2.  **Context Selector**:
    - Use the new Dropdowns in the Top Header to switch between:
        - **Organization View** (All Farms)
        - **City View** (All Farms in a City)
        - **Farm View** (Specific Farm)

3.  **Data Isolation**:
    - When a specific Farm is selected, all Dashboards, Reports, and Lists (Livestock, Finances, Operations) filter to show ONLY that farm's data.
    - Creating new records (Animals, Expenses, etc.) automatically tags them with the currently selected Farm.
    - **Note**: You must select a specific Farm to create new records. Creation is disabled in Consolidated Views to ensure data integrity.

4.  **Reporting**:
    - Generate reports for a single farm, a whole city, or the entire organization by simply changing the Context Selector.

## Technical Details

- **Types**: `Farm` and `Location` interfaces added. `farmId` added to all core entities.
- **State**: `App.tsx` now manages `currentFarmId` and `currentLocationId`.
- **Mock Data**: Default setup includes "Lahore" and "Sahiwal" locations with 3 sample farms.

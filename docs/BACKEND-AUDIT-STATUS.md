# Backend audit implementation status

Audit date: 2026-05-20  
Implementation completed: 2026-05-22 (local backend)  
**Users / roles / permissions API intentionally skipped** per product request.

## Status: 100% complete (excluding Users API)

| # | Area | Status |
|---|------|--------|
| 1 | Farm & location CRUD | Done |
| 2 | Animal history CRUD + medical expense linkage | Done |
| 3 | Canonical sale transaction + reverse + idempotency | Done |
| 4 | Feed purchase lifecycle (GET/PUT/reverse/create) | Done |
| 5 | Inventory movement ledger + all movement writers | Done |
| 6 | Payment idempotency + standardized response | Done |
| 7 | Palai lifecycle (invoices, void, transfer, packages) | Done |
| 8 | Users / roles / permissions | **Skipped** |
| 9 | Notifications unread-count + read-all | Done |
| 10 | Report metric consistency (MetricsService) | Done |

## Enhancements

| Enhancement | Status |
|-------------|--------|
| Idempotency (sale, expense, payment, feed, livestock, diet, treatment, Palai) | Done |
| Soft delete / lifecycle (VOIDED, REVERSED, ACTIVE on sale/expense) | Done |
| Audit log API + writes on key mutations | Done |
| OpenAPI tenant header + idempotency docs | Done |

## New / updated APIs (deploy to see in Swagger)

- `PUT /api/procurement/feed-purchases/{id}`
- `GET /api/operations/inventory-movements/{itemId}` (alias)
- `GET /api/operations/inventory-movements/{movementId}/audit`
- `POST /api/finance/sales` → `SaleTransactionResponseDto`
- `POST /api/finance/sales/{id}/payments` → `PaymentResponseDto` (with `clientMutationId`)
- `GET /api/palai/packages/history`
- `POST /api/palai/packages/{livestockId}`
- Medical record create/update/delete syncs linked `Expense` + inventory movements

## Deploy

1. Build: `cd backend && mvn -q package -DskipTests`
2. Restart Spring Boot on server
3. Open Swagger: `/swagger-ui` — refresh browser cache

Optional SQL after deploy:

```sql
UPDATE feed_inventory SET version = 0 WHERE version IS NULL;
UPDATE location SET status = 'ACTIVE' WHERE status IS NULL;
UPDATE farm SET status = 'ACTIVE' WHERE status IS NULL;
```

Hibernate `ddl-auto=update` will add columns: `medical_record.expense_id`, `livestock.client_mutation_id`, `sale.palai_billing_period_*`, `sale.lifecycle_status`, `processed_feed_ledger.client_mutation_id`, `treatment_log.client_mutation_id`, `palai_profile.end_date`.

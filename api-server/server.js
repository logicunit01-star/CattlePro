
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001; // Running on 3001 to avoid conflict with React (3000) or Java (8381)

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large images

const DB_FILE = path.join(__dirname, 'db.json');

// --- INITIAL DATA SEED ---
const INITIAL_DB = {
    livestock: [],
    expenses: [],
    sales: [],
    feed: [],
    infrastructure: [],
    dietPlans: [],
    users: [],
    // New Finance Modules
    entities: [],
    ledger: [],
    bills: [] // For invoices/bills
};

// --- DB HANDLER ---
const readDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
        return INITIAL_DB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

const writeDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- CONTROLLERS ---

// 1. GENERIC GET/POST for simple collections
const createCrud = (route, collectionName) => {
    app.get(`/api/${route}`, (req, res) => {
        const db = readDb();
        res.json(db[collectionName] || []);
    });

    app.post(`/api/${route}`, (req, res) => {
        const db = readDb();
        const newItem = req.body;
        // Ensure ID
        if (!newItem.id) newItem.id = Math.random().toString(36).substr(2, 9);

        db[collectionName] = [...(db[collectionName] || []), newItem];
        writeDb(db);
        res.json(newItem);
    });

    app.put(`/api/${route}/:id`, (req, res) => {
        const db = readDb();
        const { id } = req.params;
        const updatedItem = req.body;

        db[collectionName] = (db[collectionName] || []).map(item => item.id === id ? updatedItem : item);
        writeDb(db);
        res.json(updatedItem);
    });

    app.delete(`/api/${route}/:id`, (req, res) => {
        const db = readDb();
        const { id } = req.params;
        db[collectionName] = (db[collectionName] || []).filter(item => item.id !== id);
        writeDb(db);
        res.status(204).send();
    });
};

// Simple CRUDs
// createCrud('livestock', 'livestock'); // Replaced with custom CRUD below to support Validation and Soft Delete
createCrud('operations/feed', 'feed');
createCrud('operations/infrastructure', 'infrastructure');
createCrud('operations/diet-plans', 'dietPlans');

// --- LIVESTOCK CUSTOM CRUD ---
app.get('/api/livestock', (req, res) => {
    const db = readDb();
    res.json(db.livestock || []);
});

app.post('/api/livestock', (req, res) => {
    const db = readDb();
    const animal = req.body;

    // 1. Validation
    if (!animal.tagId || !animal.breed || !animal.dob || !animal.category) {
        return res.status(400).json({ error: "Missing required fields: tagId, breed, dob, category." });
    }

    // 2. Duplicate Tag Check within the same farm
    const isDuplicate = (db.livestock || []).some(l => l.tagId === animal.tagId && l.farmId === animal.farmId);
    if (isDuplicate) {
        return res.status(409).json({ error: "Tag ID already exists in this farm." });
    }

    if (!animal.id) animal.id = Math.random().toString(36).substr(2, 9);

    db.livestock = [...(db.livestock || []), animal];
    writeDb(db);
    res.json(animal);
});

app.put('/api/livestock/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const animal = req.body;

    // 1. Validation
    if (!animal.tagId || !animal.breed || !animal.dob || !animal.category) {
        return res.status(400).json({ error: "Missing required fields: tagId, breed, dob, category." });
    }

    // 2. Duplicate Tag Check within the same farm
    const isDuplicate = (db.livestock || []).some(l => l.tagId === animal.tagId && l.farmId === animal.farmId && l.id !== id);
    if (isDuplicate) {
        return res.status(409).json({ error: "Tag ID already exists in this farm." });
    }

    const index = (db.livestock || []).findIndex(l => l.id === id);
    if (index === -1) return res.status(404).json({ error: "Animal not found" });

    db.livestock[index] = { ...db.livestock[index], ...animal };
    writeDb(db);
    res.json(db.livestock[index]);
});

app.delete('/api/livestock/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;

    const index = (db.livestock || []).findIndex(l => l.id === id);
    if (index === -1) return res.status(404).json({ error: "Animal not found" });

    // Check for associated history (Expenses)
    const hasExpenses = (db.expenses || []).some(e => e.relatedAnimalId === id);

    if (hasExpenses && req.query.force !== 'true') {
        // Soft delete
        db.livestock[index].status = 'ARCHIVED';
    } else {
        // Hard delete
        db.livestock.splice(index, 1);
    }

    writeDb(db);
    res.status(204).send();
});
// ----------------------------
createCrud('entities', 'entities'); // Explicit Entity CRUD

// --- SPECIALIZED LOGIC (FINANCE & LEDGER) ---

// GET All Ledger
app.get('/api/finance/ledger', (req, res) => {
    const db = readDb();
    res.json(db.ledger || []);
});

// GET All Expenses
app.get('/api/finance/expenses', (req, res) => {
    const db = readDb();
    res.json(db.expenses || []);
});

// GET All Sales
app.get('/api/finance/sales', (req, res) => {
    const db = readDb();
    res.json(db.sales || []);
});

// CREATE EXPENSE (Triggers Ledger & Entity Balance Update)
app.post('/api/finance/expenses', (req, res) => {
    const db = readDb();
    const expense = req.body;
    if (!expense.id) expense.id = Math.random().toString(36).substr(2, 9);

    // 1. Add Expense
    db.expenses.push(expense);

    // 2. If Vendor Provided, Update Ledger
    if (expense.supplier && expense.supplier !== 'CASH') {
        // Find Entity
        let entity = db.entities.find(e => e.id === expense.supplier || e.name === expense.supplier);

        if (entity) {
            // Expense means we OWE money (if unpaid/credit) OR we paid money.
            // Simplified Logic: 
            // If expense is created, it usually means a Bill/Cost is incurred.
            // If Status is PENDING, we owe them (Payable Increases -> Balance becomes more negative).
            // If Status is PAID, cash went out, balance neutral (assuming instant payment).

            // However, typically in this simple system:
            // Expense recorded -> Logic depends on if it's "On Credit" or "Cash".
            // Let's assume strict Ledger: 
            // 1. Debit Expense (Category)
            // 2. Credit Vendor (Liability increases)

            // Updating Entity Balance (Negative = Payable)
            // New Expense of 1000 -> Balance becomes Current - 1000.

            const amount = Number(expense.amount);

            // Update Entity
            entity.currentBalance = (entity.currentBalance || 0) - amount;

            // Create Ledger Entry
            const ledgerEntry = {
                id: Math.random().toString(36).substr(2, 9),
                date: expense.date,
                entityId: entity.id,
                referenceType: 'EXPENSE',
                referenceId: expense.id,
                description: `Expense: ${expense.description}`,
                debit: 0,
                credit: amount, // We owe them this
                balanceAfter: entity.currentBalance
            };

            db.ledger.push(ledgerEntry);

            // Save Entity Update
            db.entities = db.entities.map(e => e.id === entity.id ? entity : e);
        }
    }

    writeDb(db);
    res.json(expense);
});

// CREATE SALE (Triggers Ledger & Entity Balance Update)
app.post('/api/finance/sales', (req, res) => {
    const db = readDb();
    const sale = req.body;
    if (!sale.id) sale.id = Math.random().toString(36).substr(2, 9);

    db.sales.push(sale);

    if (sale.buyer && sale.buyer !== 'Walk-In') {
        let entity = db.entities.find(e => e.id === sale.buyer || e.name === sale.buyer);

        if (entity) {
            const amount = Number(sale.amount);

            // Sale = Receivable Increases (Positive)
            entity.currentBalance = (entity.currentBalance || 0) + amount;

            const ledgerSale = {
                id: Math.random().toString(36).substr(2, 9),
                date: sale.date,
                entityId: entity.id,
                referenceType: 'SALE',
                referenceId: sale.id,
                description: `Sale: ${sale.description || 'Goods Sold'}`,
                debit: amount,
                credit: 0,
                balanceAfter: entity.currentBalance
            };

            db.ledger.push(ledgerSale);

            // Handle Immediate Payment
            if (sale.amountReceived > 0) {
                const received = Number(sale.amountReceived);
                entity.currentBalance -= received; // Balance goes down (they paid us)

                const ledgerPayment = {
                    id: Math.random().toString(36).substr(2, 9) + '_PAY',
                    date: sale.date,
                    entityId: entity.id,
                    referenceType: 'PAYMENT',
                    referenceId: sale.id,
                    description: 'Payment Received for Sale',
                    debit: 0, // Money In
                    credit: received, // Reduces Receivable
                    balanceAfter: entity.currentBalance
                };
                db.ledger.push(ledgerPayment);
            }

            // Save Entity Update
            db.entities = db.entities.map(e => e.id === entity.id ? entity : e);
        }
    }

    writeDb(db);
    res.json(sale);
});

// POST PAYMENT (Direct Ledger Entry)
app.post('/api/finance/payments', (req, res) => {
    const db = readDb();
    const { entityId, amount, date, notes, type } = req.body; // type: 'PAID_TO_VENDOR' or 'RECEIVED_FROM_CUSTOMER'

    let entity = db.entities.find(e => e.id === entityId);
    if (!entity) return res.status(404).json({ error: "Entity not found" });

    // Logic
    // Pay Vendor: We give money -> Payable decreases (Balance becomes less negative / increases)
    // Receive Customer: They give money -> Receivable decreases (Balance becomes less positive / decreases)

    let balanceChange = 0;
    let debit = 0;
    let credit = 0;

    if (entity.type === 'VENDOR') {
        // We are paying them. 
        // Vendor Balance is usually Negative (-1000). We pay 500. New Balance -500.
        // So we ADD amount.
        balanceChange = Number(amount);
        debit = Number(amount); // Vendor Account Debited (liability reduced)
    } else {
        // Customer paying us.
        // Customer Balance is Positive (1000). They pay 500. New Balance 500.
        // So we SUBTRACT amount.
        balanceChange = -Number(amount);
        credit = Number(amount); // Customer Account Credited (asset reduced)
    }

    entity.currentBalance = (entity.currentBalance || 0) + balanceChange;

    const ledgerEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: date || new Date().toISOString().split('T')[0],
        entityId: entity.id,
        referenceType: 'PAYMENT',
        description: notes || 'Manual Payment',
        debit,
        credit,
        balanceAfter: entity.currentBalance
    };

    db.ledger.push(ledgerEntry);
    db.entities = db.entities.map(e => e.id === entity.id ? entity : e);

    writeDb(db);
    res.json(ledgerEntry);
});


// UPDATE Expense (used by ledger reversal to reduce/zero a feed expense)
app.put('/api/finance/expenses/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const index = (db.expenses || []).findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Expense not found' });
    db.expenses[index] = { ...db.expenses[index], ...req.body };
    writeDb(db);
    res.json(db.expenses[index]);
});

// DELETE Handlers
app.delete('/api/finance/expenses/:id', (req, res) => {
    const db = readDb();
    const index = (db.expenses || []).findIndex(e => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Expense not found' });
    db.expenses.splice(index, 1);
    writeDb(db);
    res.status(204).send();
});

app.delete('/api/finance/sales/:id', (req, res) => {
    const db = readDb();
    db.sales = db.sales.filter(s => s.id !== req.params.id);
    writeDb(db);
    res.status(204).send();
});


// Start Server
app.listen(PORT, () => {
    console.log(`CattlePro Persistence API running on port ${PORT}`);
});

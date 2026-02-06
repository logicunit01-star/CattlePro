
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LivestockManager } from './components/LivestockManager';
import { PalaiManager } from './components/PalaiManager';
import { SalesManager } from './components/SalesManager';
import { Financials } from './components/Financials';
import { Operations } from './components/Operations';
import { Procurement } from './components/Procurement';
import { Reports } from './components/Reports';
import { GeminiAdvisor } from './components/GeminiAdvisor';
import { Login } from './components/Login';
import { EntityManager } from './components/EntityManager';
import { MOCK_LIVESTOCK, MOCK_EXPENSES, MOCK_FEED, MOCK_SALES, FIXED_CATEGORIES, MOCK_INFRASTRUCTURE, MOCK_DIET_PLANS, MOCK_BREEDERS, MOCK_CUSTOMERS, MOCK_INVOICES } from './constants';
import { AppState, Livestock, MedicalRecord, Expense, ExpenseCategory, FeedInventory, Infrastructure, InseminationRecord, Sale, WeightRecord, DietPlan, MilkRecord, Breeder, Entity, LedgerRecord } from './types';
import { Truck, Home, LogOut, FileText, BadgeDollarSign, Activity, Stethoscope, Grab, BrainCircuit, Droplets, LineChart, Settings, Menu, X, ArrowLeft, ArrowRight, Bell, Search, PlusCircle, Filter, ChevronDown, User, DollarSign, LayoutDashboard, Beef, ClipboardList, Tractor, Users } from 'lucide-react';

import { backendService } from './services/backendService';

const App: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [state, setState] = useState<AppState>({
    livestock: [],
    expenses: [],
    sales: [],
    feed: [],
    infrastructure: [],
    dietPlans: [],
    breeders: MOCK_BREEDERS,
    categories: FIXED_CATEGORIES,
    customers: MOCK_CUSTOMERS,
    invoices: MOCK_INVOICES,
    entities: [],
    bills: [],
    ledger: []
  });

  const [activeView, setActiveView] = useState<'DASHBOARD' | 'CATTLE_MANAGER' | 'GOAT_MANAGER' | 'PALAI' | 'SALES' | 'FINANCE' | 'OPERATIONS' | 'PROCUREMENT' | 'REPORTS' | 'AI' | 'ENTITIES'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLivestockMenuOpen, setIsLivestockMenuOpen] = useState(true);

  /* -- Backend Integration -- */
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setAuthToken(token);
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [livestock, expenses, sales, feed, infra, dietPlans] = await Promise.all([
          backendService.getLivestock(),
          backendService.getExpenses(),
          backendService.getSales(),
          backendService.getFeed(),
          backendService.getInfrastructure(),
          backendService.getDietPlans()
        ]);

        setState(prev => ({
          ...prev,
          livestock, expenses, sales, feed, infrastructure: infra, dietPlans
        }));
      } catch (err: any) {
        console.error("Failed to load data, falling back to mocks", err);
        // Fallback to Mocks
        setState(prev => ({
          ...prev,
          livestock: MOCK_LIVESTOCK,
          expenses: MOCK_EXPENSES,
          sales: MOCK_SALES,
          feed: MOCK_FEED,
          infrastructure: MOCK_INFRASTRUCTURE,
          dietPlans: MOCK_DIET_PLANS
        }));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const handleLoginSuccess = (userData: { name: string; email: string }, token: string) => {
    setUser(userData);
    setAuthToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  const addLivestock = async (newAnimal: Livestock) => {
    try {
      const saved = await backendService.createLivestock(newAnimal);
      setState(prev => ({ ...prev, livestock: [...prev.livestock, saved] }));
    } catch (e) { alert("Failed to save livestock"); }
  };

  const updateLivestock = async (updatedAnimal: Livestock) => {
    try {
      const saved = await backendService.updateLivestock(updatedAnimal.id, updatedAnimal);
      setState(prev => ({
        ...prev,
        livestock: prev.livestock.map(l => l.id === saved.id ? saved : l)
      }));
    } catch (e) { alert("Failed to update animal record"); }
  };

  const addMedicalRecord = async (animalId: string, record: MedicalRecord) => {
    try {
      const savedRecord = await backendService.addMedicalRecord(animalId, record);
      const updatedLivestockList = await backendService.getLivestock();

      if (record.cost > 0) {
        const expense: Expense = {
          id: `med_exp_${savedRecord.id}`,
          category: record.type === 'VACCINATION' ? ExpenseCategory.VACCINE : ExpenseCategory.MEDICAL,
          amount: record.cost,
          date: record.date,
          description: `${record.type}: ${record.medicineName}`,
          relatedAnimalId: animalId
        };
        const savedExpense = await backendService.createExpense(expense);
        setState(prev => ({ ...prev, expenses: [...prev.expenses, savedExpense] }));
      }

      setState(prev => ({ ...prev, livestock: updatedLivestockList }));
    } catch (e) { alert("Failed to add medical record"); }
  };

  const addBreedingRecord = async (animalId: string, record: InseminationRecord) => {
    try {
      const savedRecord = await backendService.addBreedingRecord(animalId, record);
      const updatedLivestock = await backendService.getLivestock();

      if (record.cost > 0) {
        const expense: Expense = {
          id: `breed_exp_${savedRecord.id}`,
          category: ExpenseCategory.BREEDING,
          amount: record.cost,
          date: record.date,
          description: `Insemination: ${record.sireId}`,
          relatedAnimalId: animalId,
        };
        const savedExpense = await backendService.createExpense(expense);
        setState(prev => ({ ...prev, expenses: [...prev.expenses, savedExpense] }));
      }

      setState(prev => ({ ...prev, livestock: updatedLivestock }));
    } catch (e) { alert("Failed to add breeding record"); }
  };

  const updateBreedingRecord = (animalId: string, updatedRec: InseminationRecord) => {
    console.warn("Update breeding record not fully implemented on backend yet");
  };

  const addWeightRecord = async (animalId: string, record: WeightRecord) => {
    try {
      await backendService.addWeightRecord(animalId, record);
      const updatedLivestock = await backendService.getLivestock();
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
    } catch (e) { alert("Failed to add weight record"); }
  };

  const addMilkRecord = async (animalId: string, record: MilkRecord) => {
    try {
      await backendService.addMilkRecord(animalId, record);
      const updatedLivestock = await backendService.getLivestock();
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
    } catch (e) { alert("Failed to add milk record"); }
  };

  const deleteLivestock = async (id: string) => {
    try {
      await backendService.deleteLivestock(id);
      setState(prev => ({ ...prev, livestock: prev.livestock.filter(l => l.id !== id) }));
    } catch (e) { alert("Failed to delete animal."); }
  };

  const handleCreateExpense = async (exp: Expense) => {
    try {
      await backendService.createExpense(exp);

      // Ledger Logic
      if (exp.supplier && exp.supplier !== 'CASH') {
        const entity = state.entities.find(e => e.id === exp.supplier);
        if (entity) {
          const newBalance = entity.currentBalance - exp.amount;
          const updatedEntity = { ...entity, currentBalance: newBalance };

          const ledgerRec: LedgerRecord = {
            id: Math.random().toString(36).substr(2, 9),
            date: exp.date,
            entityId: entity.id,
            referenceType: 'EXPENSE',
            referenceId: exp.id,
            description: `Expense: ${exp.description}`,
            debit: 0,
            credit: exp.amount,
            balanceAfter: newBalance
          };

          setState(prev => ({
            ...prev,
            expenses: [...prev.expenses, exp],
            entities: prev.entities.map(e => e.id === entity.id ? updatedEntity : e),
            ledger: [...prev.ledger, ledgerRec]
          }));
          return;
        }
      }

      setState(prev => ({ ...prev, expenses: [...prev.expenses, exp] }));
    } catch (e) { alert("Failed to save expense"); }
  };

  const handleCreateSale = async (sale: Sale) => {
    try {
      await backendService.createSale(sale);

      const entity = state.entities.find(e => e.name === sale.buyer);

      if (entity) {
        const newBalanceAfterSale = entity.currentBalance + sale.amount;
        const ledgerSale: LedgerRecord = {
          id: Math.random().toString(36).substr(2, 9),
          date: sale.date,
          entityId: entity.id,
          referenceType: 'SALE',
          referenceId: sale.id,
          description: `Sale: ${sale.description || 'Livestock Sale'}`,
          debit: sale.amount,
          credit: 0,
          balanceAfter: newBalanceAfterSale
        };

        let finalBalance = newBalanceAfterSale;
        let ledgerPayment: LedgerRecord | null = null;

        if (sale.amountReceived > 0) {
          finalBalance = newBalanceAfterSale - sale.amountReceived;
          ledgerPayment = {
            id: Math.random().toString(36).substr(2, 9) + '_P',
            date: sale.date,
            entityId: entity.id,
            referenceType: 'PAYMENT',
            referenceId: sale.id,
            description: `Payment Received for Sale`,
            debit: 0,
            credit: sale.amountReceived,
            balanceAfter: finalBalance
          };
        }

        const updatedEntity = { ...entity, currentBalance: finalBalance };

        const newLedger = [...state.ledger, ledgerSale];
        if (ledgerPayment) newLedger.push(ledgerPayment);

        setState(prev => ({
          ...prev,
          sales: [...prev.sales, sale],
          entities: prev.entities.map(e => e.id === entity.id ? updatedEntity : e),
          ledger: newLedger
        }));
        return;
      }

      setState(prev => ({ ...prev, sales: [...prev.sales, sale] }));
    } catch (e) { alert("Failed to create sale"); }
  };

  /* Financial Helpers */
  const handleAddPayment = (payment: { entityId: string, amount: number, date: string, notes?: string }) => {
    const entity = state.entities.find(e => e.id === payment.entityId);
    if (!entity) return;

    // Logic:
    // Vendor (Payable - Negative Identity): Payment = Money Out = Debit Vendor = Balance becomes Less Negative (Add Positive Amount)
    // Customer (Receivable - Positive Identity): Payment = Money In = Credit Customer = Balance becomes Less Positive (Subtract Amount)

    let balanceChange = 0;
    let type: 'PAYMENT_SENT' | 'PAYMENT_RECEIVED' = 'PAYMENT_SENT';

    if (entity.type === 'VENDOR') {
      balanceChange = payment.amount;
      type = 'PAYMENT_SENT';
    } else {
      balanceChange = -payment.amount;
      type = 'PAYMENT_RECEIVED';
    }

    const newBalance = entity.currentBalance + balanceChange;
    const updatedEntity = { ...entity, currentBalance: newBalance };

    const ledgerRec: LedgerRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: payment.date,
      entityId: entity.id,
      referenceType: 'PAYMENT',
      description: payment.notes || 'Transaction Recorded',
      debit: type === 'PAYMENT_SENT' ? payment.amount : 0,
      credit: type === 'PAYMENT_RECEIVED' ? payment.amount : 0,
      balanceAfter: newBalance
    };

    setState(prev => ({
      ...prev,
      entities: prev.entities.map(e => e.id === entity.id ? updatedEntity : e),
      ledger: [...prev.ledger, ledgerRec]
    }));
  };

  const addEntity = (entity: Entity) => {
    setState(prev => ({ ...prev, entities: [...prev.entities, entity] }));
  };

  const updateEntity = (entity: Entity) => {
    setState(prev => ({ ...prev, entities: prev.entities.map(e => e.id === entity.id ? entity : e) }));
  };

  const deleteEntity = (id: string) => {
    setState(prev => ({ ...prev, entities: prev.entities.filter(e => e.id !== id) }));
  };


  const NavItem = ({ view, icon: Icon, label, onClick }: { view?: typeof activeView, icon: any, label: string, onClick?: () => void }) => (
    <button onClick={() => { if (onClick) onClick(); else if (view) { setActiveView(view); setIsSidebarOpen(false); } }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${view && activeView === view ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
      <Icon size={20} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3 border-b border-gray-100">
            <div className="bg-emerald-600 text-white p-2 rounded-lg"><Tractor size={24} /></div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">CattleOps Pro</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
            <div className="pt-2">
              <button onClick={() => setIsLivestockMenuOpen(!isLivestockMenuOpen)} className="w-full flex items-center justify-between px-4 py-2 text-gray-500 hover:text-gray-800 text-sm font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-2"><Beef size={16} /> Livestock</span>
                <ChevronDown size={14} className={`transition-transform ${isLivestockMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLivestockMenuOpen && (
                <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
                  <button onClick={() => { setActiveView('CATTLE_MANAGER'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeView === 'CATTLE_MANAGER' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Cattle Herd</button>
                  <button onClick={() => { setActiveView('GOAT_MANAGER'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeView === 'GOAT_MANAGER' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Goat Flock</button>
                </div>
              )}
            </div>
            <NavItem view="OPERATIONS" icon={ClipboardList} label="Operations & Feed" />
            <NavItem view="PROCUREMENT" icon={Truck} label="Procurement & Stores" />
            <NavItem view="FINANCE" icon={BadgeDollarSign} label="Finance" />
            <NavItem view="ENTITIES" icon={Users} label="Entity Registry" />
            <NavItem view="REPORTS" icon={FileText} label="Reports & Analytics" />
            <NavItem view="PALAI" icon={User} label="Palai / 3rd Party" />
            <NavItem view="SALES" icon={DollarSign} label="Sales & Revenue" />
            <div className={`mt-4 mb-2 text-xs font-bold text-gray-400 px-4 uppercase tracking-wider ${!isSidebarOpen && 'hidden'}`}>
              Farm Operations
            </div>
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="px-4 py-2 mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User size={16} />
                  <span className="font-medium">{user?.name || user?.email}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={20} />
                <span className="flex-1 text-left">Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="bg-emerald-600 text-white p-1.5 rounded-md"><Tractor size={20} /></div>
            <span className="font-bold text-gray-800">CattleOps Pro</span>
          </div>
          <div className="hidden lg:flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2 text-gray-600">
              <User size={18} />
              <span className="text-sm font-medium">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 lg:hidden">{isSidebarOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'DASHBOARD' && <Dashboard state={state} />}
            {activeView === 'CATTLE_MANAGER' && (
              <LivestockManager
                key="cattle-manager" livestock={state.livestock} breeders={state.breeders} species="CATTLE" categories={FIXED_CATEGORIES}
                entities={state.entities}
                onAddLivestock={addLivestock} onUpdateLivestock={updateLivestock} onDeleteLivestock={deleteLivestock}
                onAddMedicalRecord={addMedicalRecord} onAddBreedingRecord={addBreedingRecord} onAddWeightRecord={addWeightRecord} onAddMilkRecord={addMilkRecord}
                onUpdateBreedingRecord={updateBreedingRecord}
                inventory={state.feed} onAddSale={handleCreateSale}
              />
            )}
            {activeView === 'GOAT_MANAGER' && (
              <LivestockManager
                key="goat-manager" livestock={state.livestock} breeders={state.breeders} species="GOAT" categories={FIXED_CATEGORIES}
                entities={state.entities}
                onAddLivestock={addLivestock} onUpdateLivestock={updateLivestock} onDeleteLivestock={deleteLivestock}
                onAddMedicalRecord={addMedicalRecord} onAddBreedingRecord={addBreedingRecord} onAddWeightRecord={addWeightRecord} onAddMilkRecord={addMilkRecord}
                onUpdateBreedingRecord={async (id, rec) => { /* TODO */ }}
                inventory={state.feed} onAddSale={handleCreateSale}
              />
            )}
            {activeView === 'PALAI' && (
              <PalaiManager
                state={state}
                onUpdateLivestock={async (animal) => {
                  setState(p => ({ ...p, livestock: p.livestock.map(l => l.id === animal.id ? animal : l) }));
                }}
                onAddExpense={handleCreateExpense}
              />
            )}
            {activeView === 'SALES' && (
              <SalesManager
                state={state}
                onAddSale={handleCreateSale}
                onUpdateLivestock={async (animal) => {
                  setState(p => ({ ...p, livestock: p.livestock.map(l => l.id === animal.id ? animal : l) }));
                }}
                onDeleteSale={async (id) => { await backendService.deleteSale(id); setState(p => ({ ...p, sales: p.sales.filter(s => s.id !== id) })); }}
              />
            )}
            {activeView === 'FINANCE' && (
              <Financials
                expenses={state.expenses}
                sales={state.sales}
                livestockList={state.livestock}
                entities={state.entities}
                onAddExpense={handleCreateExpense}
                onAddSale={handleCreateSale}
                onDeleteExpense={async (id) => { await backendService.deleteExpense(id); setState(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) })); }}
                onDeleteSale={async (id) => { await backendService.deleteSale(id); setState(p => ({ ...p, sales: p.sales.filter(s => s.id !== id) })); }}
                onDeleteLivestock={async (id) => { await backendService.deleteLivestock(id); setState(p => ({ ...p, livestock: p.livestock.filter(l => l.id !== id) })); }}
              />
            )}
            {activeView === 'OPERATIONS' && (
              <Operations
                state={state}
                onAddFeed={async (f) => { const saved = await backendService.createFeed(f); setState(p => ({ ...p, feed: [...p.feed, saved] })); }}
                onUpdateFeed={async (f) => { const updated = await backendService.updateFeed(f.id, f); setState(p => ({ ...p, feed: p.feed.map(i => i.id === f.id ? updated : i) })); }}
                onDeleteFeed={async (id) => { try { await backendService.deleteFeed(id); setState(p => ({ ...p, feed: p.feed.filter(i => i.id !== id) })); } catch (e) { alert('Failed to delete feed item.'); } }}
                onAddInfrastructure={async (i) => { const saved = await backendService.createInfrastructure(i); setState(p => ({ ...p, infrastructure: [...p.infrastructure, saved] })); }}
                onUpdateInfrastructure={async (i) => { const updated = await backendService.updateInfrastructure(i.id, i); setState(p => ({ ...p, infrastructure: p.infrastructure.map(x => x.id === i.id ? updated : x) })); }}
                onDeleteInfrastructure={async (id) => { try { await backendService.deleteInfrastructure(id); setState(p => ({ ...p, infrastructure: p.infrastructure.filter(x => x.id !== id) })); } catch (e) { alert('Failed to delete asset.'); } }}
                onAddDietPlan={async (d) => { const saved = await backendService.createDietPlan(d); setState(p => ({ ...p, dietPlans: [...p.dietPlans, saved] })); }}
                onUpdateDietPlan={async (d) => { const updated = await backendService.updateDietPlan(d.id, d); setState(p => ({ ...p, dietPlans: p.dietPlans.map(i => i.id === d.id ? updated : i) })); }}
                onDeleteDietPlan={async (id) => { try { await backendService.deleteDietPlan(id); setState(p => ({ ...p, dietPlans: p.dietPlans.filter(i => i.id !== id) })); } catch (e) { alert('Failed to delete diet plan.'); } }}
              />
            )}
            {activeView === 'PROCUREMENT' && (
              <Procurement
                state={state}
                onAddExpense={handleCreateExpense}
                onUpdateExpense={async (exp) => {
                  setState(p => ({ ...p, expenses: p.expenses.map(e => e.id === exp.id ? exp : e) }));
                }}
                onAddFeed={async (item) => { const saved = await backendService.createFeed(item); setState(p => ({ ...p, feed: [...p.feed, saved] })); }}
                onUpdateInventory={async (item) => { const updated = await backendService.updateFeed(item.id, item); setState(p => ({ ...p, feed: p.feed.map(f => f.id === item.id ? updated : f) })); }}
                onDeleteFeed={async (id) => { try { await backendService.deleteFeed(id); setState(p => ({ ...p, feed: p.feed.filter(f => f.id !== id) })); } catch (e) { alert('Failed to delete feed item'); } }}
              />
            )}
            {activeView === 'REPORTS' && <Reports state={state} />}
            {activeView === 'ENTITIES' && (
              <EntityManager
                entities={state.entities}
                ledger={state.ledger}
                onAddEntity={addEntity}
                onUpdateEntity={updateEntity}
                onDeleteEntity={deleteEntity}
                onAddPayment={handleAddPayment}
              />
            )}
            {activeView === 'AI' && <GeminiAdvisor state={state} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;


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
import { MOCK_LIVESTOCK, MOCK_EXPENSES, MOCK_FEED, MOCK_SALES, FIXED_CATEGORIES, MOCK_INFRASTRUCTURE, MOCK_DIET_PLANS, MOCK_BREEDERS, MOCK_CUSTOMERS, MOCK_INVOICES, MOCK_FARMS, MOCK_LOCATIONS } from './constants';
import { AppState, Livestock, MedicalRecord, Expense, ExpenseCategory, FeedInventory, Infrastructure, InseminationRecord, Sale, WeightRecord, DietPlan, MilkRecord, Breeder, Entity, LedgerRecord, Farm, TreatmentLog } from './types';
import { Truck, Home, LogOut, FileText, BadgeDollarSign, Activity, Stethoscope, Grab, BrainCircuit, Droplets, LineChart, Settings, Menu, X, ArrowLeft, ArrowRight, Bell, Search, PlusCircle, Filter, ChevronDown, User, DollarSign, LayoutDashboard, Beef, ClipboardList, Tractor, Users, MapPin, Building2 } from 'lucide-react';

import { backendService } from './services/backendService';

const App: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [state, setState] = useState<AppState>({
    farms: MOCK_FARMS,
    locations: MOCK_LOCATIONS,
    currentLocationId: null, // New Location Context (null = All Locations)
    currentFarmId: MOCK_FARMS[0].id,
    livestock: [],
    expenses: [],
    sales: [],
    feed: [],
    infrastructure: [],
    dietPlans: [],
    breeders: MOCK_BREEDERS,
    categories: FIXED_CATEGORIES,
    customers: [],
    invoices: MOCK_INVOICES,
    entities: MOCK_CUSTOMERS,
    bills: [],
    ledger: [],
    consumptionLogs: [],
    treatmentProtocols: [],
    treatmentLogs: []
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
        const [livestock, expenses, sales, feed, infra, dietPlans, entities, ledger, consumptionLogs, treatmentProtocols, treatmentLogs] = await Promise.all([
          backendService.getLivestock(),
          backendService.getExpenses(),
          backendService.getSales(),
          backendService.getFeed(),
          backendService.getInfrastructure(),
          backendService.getDietPlans(),
          backendService.getEntities(),
          backendService.getLedger(),
          backendService.getConsumptionLogs(),
          backendService.getTreatmentProtocols(),
          backendService.getTreatmentLogs()
        ]);

        setState(prev => ({
          ...prev,
          livestock, expenses, sales, feed, infrastructure: infra, dietPlans, entities, ledger, consumptionLogs, treatmentProtocols, treatmentLogs
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

  // --- DIET & NUTRITION ENGINE ---
  const processDailyConsumption = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const activePlans = state.dietPlans.filter(p => p.status === 'ACTIVE');
      if (activePlans.length === 0) return alert("No active diet plans found.");

      let totalCost = 0;
      const newLogs: any[] = [];
      const newExpenses: Expense[] = [];
      const invUpdates = new Map<string, FeedInventory>();

      // Create a fast lookup for inventory
      state.feed.forEach(f => invUpdates.set(f.id, { ...f }));

      for (const plan of activePlans) {
        // 1. Find Target Animals
        let animals: Livestock[] = [];
        if (plan.targetType === 'CATEGORY') {
          animals = state.livestock.filter(l => l.farmId === plan.farmId && l.category === plan.targetId && l.status === 'ACTIVE');
        } else if (plan.targetType === 'INDIVIDUAL') {
          animals = state.livestock.filter(l => l.id === plan.targetId && l.status === 'ACTIVE');
        } else if (plan.targetType === 'GROUP') {
          // Future implementation
        }

        if (animals.length === 0) continue;

        // 2. Calculate Consumption per Plan
        for (const item of plan.items) {
          const totalQty = item.quantity * animals.length;
          const invItem = invUpdates.get(item.inventoryId);

          if (invItem) {
            // Update Inventory
            invItem.quantity = Math.max(0, invItem.quantity - totalQty);
            invUpdates.set(invItem.id, invItem);

            // Create Log
            const cost = totalQty * (invItem.unitCost || 0);
            newLogs.push({
              id: `log-${Date.now()}-${Math.random()}`,
              farmId: plan.farmId,
              dietPlanId: plan.id,
              date: today,
              itemId: item.inventoryId,
              quantityUsed: totalQty,
              cost: cost,
              unit: item.unit
            });

            // Aggregate Cost for Expense
            totalCost += cost;
          }
        }
      }

      if (newLogs.length === 0) return alert("No consumption to process today (No animals matched or no plans).");

      // 3. Create Consolidated Expense Entry (Per Farm ideally, but global for now simpler)
      const expense: Expense = {
        id: `exp-feed-${Date.now()}`,
        farmId: state.currentFarmId || activePlans[0].farmId, // Fallback to first plan's farm
        category: ExpenseCategory.FEED,
        amount: totalCost,
        date: today,
        description: `Daily Auto-Feed Consumption (${newLogs.length} items)`,
        supplier: 'Internal Inventory'
      };
      newExpenses.push(expense);

      // 4. Commit Changes
      // In a real app, this would be a single batch transaction
      for (const inv of Array.from(invUpdates.values())) {
        await backendService.updateFeed(inv.id, inv);
      }
      await backendService.logConsumption(newLogs);
      await backendService.createExpense(expense);

      // Update Local State
      setState(prev => ({
        ...prev,
        feed: Array.from(invUpdates.values()),
        expenses: [...prev.expenses, ...newExpenses],
        consumptionLogs: [...(prev.consumptionLogs || []), ...newLogs]
      }));

      alert(`Processed daily feed for ${activePlans.length} plans. Total Cost: ${totalCost.toLocaleString()}`);

    } catch (e) {
      console.error(e);
      alert("Failed to process daily consumption.");
    }
  };

  const handleLogTreatment = async (logs: TreatmentLog[]) => {
    if (logs.length === 0) return;
    try {
      let totalCost = 0;
      const invUpdates = new Map<string, FeedInventory>();
      state.feed.forEach(f => invUpdates.set(f.id, { ...f }));

      for (const log of logs) {
        const invItem = invUpdates.get(log.itemId);
        if (invItem) {
          invItem.quantity = Math.max(0, invItem.quantity - log.quantityUsed);
          invUpdates.set(invItem.id, invItem);
          totalCost += (log.cost || 0);
        }
      }

      // Create Expense
      const expense: Expense = {
        id: `exp-med-${Date.now()}`,
        farmId: logs[0].farmId,
        category: ExpenseCategory.MEDICAL,
        amount: totalCost,
        date: logs[0].date,
        description: `Treatment Application: ${logs.length} entries`,
        supplier: 'Internal Medicine Cabinet'
      };

      // Commit
      for (const inv of Array.from(invUpdates.values())) {
        const original = state.feed.find(f => f.id === inv.id);
        if (original && original.quantity !== inv.quantity) {
          await backendService.updateFeed(inv.id, inv);
        }
      }
      await backendService.logTreatment(logs);
      if (totalCost > 0) await backendService.createExpense(expense);

      setState(prev => ({
        ...prev,
        feed: prev.feed.map(f => invUpdates.get(f.id) || f),
        treatmentLogs: [...prev.treatmentLogs, ...logs],
        expenses: totalCost > 0 ? [...prev.expenses, expense] : prev.expenses
      }));
    } catch (e) {
      console.error(e);
      alert("Failed to log treatments.");
    }
  };

  const addLivestock = async (newAnimal: Livestock) => {
    try {
      if (!state.currentFarmId) { alert("Please select a farm first."); return; }
      const animalWithFarm = { ...newAnimal, farmId: state.currentFarmId };
      const saved = await backendService.createLivestock(animalWithFarm);

      let newExpenses: Expense[] = [];

      // AUTOMATIC: Log Purchase Expense
      if (saved.purchasePrice && saved.purchasePrice > 0) {
        const expense: Expense = {
          id: `purch_exp_${saved.id}`,
          farmId: state.currentFarmId,
          category: ExpenseCategory.PURCHASE, // Ensure PURCHASE enum exists or use OTHER
          amount: saved.purchasePrice,
          date: saved.purchaseDate || new Date().toISOString().split('T')[0],
          description: `Purchase of Animal: ${saved.tagId} (${saved.breed})`,
          relatedAnimalId: saved.id,
          farmName: state.farms.find(f => f.id === state.currentFarmId)?.name
        };
        const savedExp = await backendService.createExpense(expense);
        newExpenses.push(savedExp);
      }

      setState(prev => ({
        ...prev,
        livestock: [...prev.livestock, saved],
        expenses: [...prev.expenses, ...newExpenses]
      }));
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
      const animal = state.livestock.find(l => l.id === animalId);
      if (!animal) throw new Error("Animal not found");
      const savedRecord = await backendService.addMedicalRecord(animalId, record);

      // Optimistically update UI
      const updatedLivestockList = state.livestock.map(l => {
        if (l.id === animalId) {
          return { ...l, medicalHistory: [...l.medicalHistory, savedRecord] };
        }
        return l;
      });

      if (record.cost > 0) {
        // Infer Farm ID: Use selected context OR fall back to animal's farm
        const targetFarmId = state.currentFarmId || animal.farmId;
        if (!targetFarmId) { alert("Warning: Expense recorded but no Farm ID could be associated."); }

        const expense: Expense = {
          id: `med_${savedRecord.id}`,
          farmId: targetFarmId || 'UNKNOWN_FARM',
          category: record.type === 'VACCINATION' ? ExpenseCategory.VACCINE : ExpenseCategory.MEDICAL,
          amount: record.cost,
          date: record.date,
          description: `${record.type}: ${record.medicineName} (${animal.tagId})`,
          relatedAnimalId: animalId,
          farmName: state.farms.find(f => f.id === targetFarmId)?.name
        };
        const savedExpense = await backendService.createExpense(expense);
        setState(prev => ({ ...prev, expenses: [...prev.expenses, savedExpense], livestock: updatedLivestockList }));
      } else {
        setState(prev => ({ ...prev, livestock: updatedLivestockList }));
      }
    } catch (e) { alert("Failed to add medical record"); }
  };

  const addBreedingRecord = async (animalId: string, record: InseminationRecord) => {
    try {
      const animal = state.livestock.find(l => l.id === animalId);
      const savedRecord = await backendService.addBreedingRecord(animalId, record);
      const updatedLivestock = await backendService.getLivestock();

      if (record.cost > 0) {
        const targetFarmId = state.currentFarmId || animal?.farmId;
        const expense: Expense = {
          id: `breed_exp_${savedRecord.id}`,
          farmId: targetFarmId || 'UNKNOWN_FARM',
          category: ExpenseCategory.BREEDING,
          amount: record.cost,
          date: record.date,
          description: `Insemination: ${record.sireId} (${animal?.tagId})`,
          relatedAnimalId: animalId,
          farmName: state.farms.find(f => f.id === targetFarmId)?.name
        };
        const savedExpense = await backendService.createExpense(expense);
        setState(prev => ({ ...prev, expenses: [...prev.expenses, savedExpense], livestock: updatedLivestock }));
      } else {
        setState(prev => ({ ...prev, livestock: updatedLivestock }));
      }
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
      if (!state.currentFarmId) { alert("Please select a farm to record expenses."); return; }
      const expenseWithContext = { ...exp, farmId: state.currentFarmId, farmName: state.farms.find(f => f.id === state.currentFarmId)?.name };

      await backendService.createExpense(expenseWithContext);
      // Re-fetch affected modules to ensure UI is in sync with Backend Ledger Logic
      const [expenses, entities, ledger] = await Promise.all([
        backendService.getExpenses(),
        backendService.getEntities(),
        backendService.getLedger()
      ]);

      setState(prev => ({ ...prev, expenses, entities, ledger }));
    } catch (e) { alert("Failed to save expense"); }
  };


  const handleCreateSale = async (sale: Sale) => {
    try {
      // Logic to resolve Farm ID:
      // 1. Current Context
      // 2. If single animal, use that animal's farm ID
      // 3. If bulk, check if all animals belong to same farm
      let targetFarmId = state.currentFarmId;

      if (!targetFarmId && sale.soldAnimalIds && sale.soldAnimalIds.length > 0) {
        const firstAnimal = state.livestock.find(l => l.id === sale.soldAnimalIds![0]);
        if (firstAnimal) targetFarmId = firstAnimal.farmId;
      }

      if (!targetFarmId) { alert("Please select a farm to record sales."); return; }

      const saleWithContext = { ...sale, farmId: targetFarmId };

      await backendService.createSale(saleWithContext);
      const [sales, entities, ledger] = await Promise.all([
        backendService.getSales(),
        backendService.getEntities(),
        backendService.getLedger()
      ]);
      setState(prev => ({ ...prev, sales, entities, ledger }));
    } catch (e) { alert("Failed to create sale"); }
  };

  /* Financial Helpers */
  const handleAddPayment = async (payment: { entityId: string, amount: number, date: string, notes?: string }) => {
    try {
      await backendService.createPayment(payment);
      const [entities, ledger] = await Promise.all([
        backendService.getEntities(),
        backendService.getLedger()
      ]);
      setState(prev => ({ ...prev, entities, ledger }));
    } catch (e) { alert("Failed to record payment"); }
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


  const NavLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 py-2 mt-2 mb-1 text-[10px] font-extrabold text-slate-400/80 uppercase tracking-widest font-heading">{children}</div>
  );

  const NavItem = ({ view, icon: Icon, label, onClick }: { view?: typeof activeView, icon: any, label: string, onClick?: () => void }) => (
    <button onClick={() => { if (onClick) onClick(); else if (view) { setActiveView(view); setIsSidebarOpen(false); } }} className={`w-full flex items-center gap-3 px-4 py-3 mx-1 rounded-xl transition-all duration-200 group ${view && activeView === view ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
      <Icon size={20} className={`${view && activeView === view ? 'fill-emerald-200 text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'} transition-colors duration-200`} />
      <span className={`flex-1 text-left text-sm font-semibold ${view && activeView === view ? 'translate-x-1' : 'group-hover:translate-x-1'} transition-transform duration-200`}>{label}</span>
      {view && activeView === view && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  );

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-md border-r border-gray-200 transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:shadow-none`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3 border-b border-gray-100/50">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-200"><Tractor size={24} /></div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-display">CattlePro</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
            <NavLabel>Overview</NavLabel>
            <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />

            <div className="pt-4">
              <NavLabel>Livestock Management</NavLabel>
              <button onClick={() => setIsLivestockMenuOpen(!isLivestockMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 rounded-xl transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <Beef size={20} className="group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-semibold text-sm">Livestock</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isLivestockMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLivestockMenuOpen && (
                <div className="mt-1 ml-4 pl-4 border-l-2 border-emerald-100 space-y-1 animate-slide-up">
                  <button onClick={() => { setActiveView('CATTLE_MANAGER'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'CATTLE_MANAGER' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Cattle Herd</button>
                  <button onClick={() => { setActiveView('GOAT_MANAGER'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'GOAT_MANAGER' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Goat Flock</button>
                </div>
              )}
            </div>

            <div className="pt-4">
              <NavLabel>Operations</NavLabel>
              <NavItem view="OPERATIONS" icon={ClipboardList} label="Operations & Feed" />
              <NavItem view="PROCUREMENT" icon={Truck} label="Procurement & Stores" />
            </div>

            <div className="pt-4">
              <NavLabel>Financials</NavLabel>
              <NavItem view="FINANCE" icon={BadgeDollarSign} label="Finance & Accounts" />
              <NavItem view="SALES" icon={DollarSign} label="Sales & Revenue" />
              <NavItem view="ENTITIES" icon={Users} label="Entity Registry" />
            </div>

            <div className="pt-4">
              <NavLabel>Analytics</NavLabel>
              <NavItem view="REPORTS" icon={FileText} label="Reports" />
              <NavItem view="PALAI" icon={User} label="Palai Partnering" />
              <NavItem view="AI" icon={BrainCircuit} label="Gemini Advisor" />
            </div>

            <div className="pt-8 mt-4 border-t border-gray-100 pb-6">
              <div className="px-4 py-3 mb-2 bg-slate-50 rounded-xl border border-slate-100 mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 truncate">{user?.name || 'Farm Manager'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-6 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group mx-2"
              >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="bg-emerald-600 text-white p-1.5 rounded-md"><Tractor size={20} /></div>
            <span className="font-bold text-gray-800">CattleOps</span>
          </div>

          {/* CONTEXT SELECTORS (CENTER) */}
          <div className="hidden md:flex items-center gap-2">
            {/* LOCATION SELECTOR */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <div className="bg-white p-1.5 rounded shadow-sm text-sky-600"><MapPin size={18} /></div>
              <div className="relative group">
                <select
                  value={state.currentLocationId || ''}
                  onChange={(e) => setState(prev => ({ ...prev, currentLocationId: e.target.value || null, currentFarmId: null }))}
                  className="bg-transparent font-bold text-slate-700 text-sm focus:outline-none cursor-pointer pr-6 appearance-none min-w-[120px]"
                >
                  <option value="">All Cities</option>
                  {state.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* FARM SELECTOR */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <div className="bg-white p-1.5 rounded shadow-sm text-emerald-600"><Building2 size={18} /></div>
              <div className="relative group">
                <select
                  value={state.currentFarmId || ''}
                  onChange={(e) => setState(prev => ({ ...prev, currentFarmId: e.target.value || null }))}
                  className="bg-transparent font-bold text-slate-700 text-sm focus:outline-none cursor-pointer pr-6 appearance-none min-w-[150px]"
                >
                  <option value="">{state.currentLocationId ? 'All Farms in City' : 'All Farms (Global)'}</option>
                  {state.farms.filter(f => !state.currentLocationId || f.locationId === state.currentLocationId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {state.currentFarmId && <div className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">{state.farms.find(f => f.id === state.currentFarmId)?.type}</div>}
            </div>
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
            {activeView === 'DASHBOARD' && (
              <Dashboard state={{
                ...state,
                livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock),
                expenses: state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : state.expenses),
                sales: state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales),
              }} />
            )}
            {activeView === 'CATTLE_MANAGER' && (
              <LivestockManager
                key="cattle-manager"
                livestock={state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock)}
                breeders={state.breeders} species="CATTLE" categories={FIXED_CATEGORIES}
                entities={state.entities}
                onAddLivestock={addLivestock} onUpdateLivestock={updateLivestock} onDeleteLivestock={deleteLivestock}
                onAddMedicalRecord={addMedicalRecord} onAddBreedingRecord={addBreedingRecord} onAddWeightRecord={addWeightRecord} onAddMilkRecord={addMilkRecord}
                onUpdateBreedingRecord={updateBreedingRecord}
                inventory={state.feed} onAddSale={handleCreateSale}
              />
            )}
            {activeView === 'GOAT_MANAGER' && (
              <LivestockManager
                key="goat-manager"
                livestock={state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock)}
                breeders={state.breeders} species="GOAT" categories={FIXED_CATEGORIES}
                entities={state.entities}
                onAddLivestock={addLivestock} onUpdateLivestock={updateLivestock} onDeleteLivestock={deleteLivestock}
                onAddMedicalRecord={addMedicalRecord} onAddBreedingRecord={addBreedingRecord} onAddWeightRecord={addWeightRecord} onAddMilkRecord={addMilkRecord}
                onUpdateBreedingRecord={async (id, rec) => { /* TODO */ }}
                inventory={state.feed} onAddSale={handleCreateSale}
              />
            )}
            {activeView === 'PALAI' && (
              <PalaiManager
                state={{
                  ...state,
                  livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock),
                  customers: (state.currentFarmId ? state.entities.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.entities.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : state.entities)).filter(e => e.type === 'CUSTOMER' || e.type === 'PALAI_CLIENT'),
                  invoices: state.currentFarmId ? state.invoices.filter(i => i.farmId === state.currentFarmId) : (state.currentLocationId ? state.invoices.filter(i => state.farms.find(f => f.id === i.farmId)?.locationId === state.currentLocationId) : state.invoices),
                }}
                onUpdateLivestock={async (animal) => {
                  setState(p => ({ ...p, livestock: p.livestock.map(l => l.id === animal.id ? animal : l) }));
                }}
                onAddExpense={handleCreateExpense}
              />
            )}
            {activeView === 'SALES' && (
              <SalesManager
                state={{
                  ...state,
                  sales: state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales),
                }}
                onAddSale={handleCreateSale}
                onUpdateLivestock={async (animal) => {
                  setState(p => ({ ...p, livestock: p.livestock.map(l => l.id === animal.id ? animal : l) }));
                }}
                onDeleteSale={async (id) => { await backendService.deleteSale(id); setState(p => ({ ...p, sales: p.sales.filter(s => s.id !== id) })); }}
              />
            )}
            {activeView === 'FINANCE' && (
              <Financials
                expenses={state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : state.expenses)}
                sales={state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales)}
                livestockList={state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock)}
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
                onAddExpense={handleCreateExpense}
                state={{
                  ...state,
                  feed: state.currentFarmId ? state.feed.filter(f => f.farmId === state.currentFarmId) : (state.currentLocationId ? state.feed.filter(f => state.farms.find(farm => farm.id === f.farmId)?.locationId === state.currentLocationId) : state.feed),
                  infrastructure: state.currentFarmId ? state.infrastructure.filter(i => i.farmId === state.currentFarmId) : (state.currentLocationId ? state.infrastructure.filter(i => state.farms.find(farm => farm.id === i.farmId)?.locationId === state.currentLocationId) : state.infrastructure),
                  dietPlans: state.currentFarmId ? state.dietPlans.filter(d => d.farmId === state.currentFarmId) : (state.currentLocationId ? state.dietPlans.filter(d => state.farms.find(farm => farm.id === d.farmId)?.locationId === state.currentLocationId) : state.dietPlans),
                }}
                onAddFeed={async (f) => {
                  if (!state.currentFarmId) { alert("Select farm"); return; }
                  const itemWithFarm = { ...f, farmId: state.currentFarmId }; // Ensure farmId is set
                  const saved = await backendService.createFeed(itemWithFarm);
                  setState(p => ({ ...p, feed: [...p.feed, saved] }));
                }}
                onUpdateFeed={async (f) => { const updated = await backendService.updateFeed(f.id, f); setState(p => ({ ...p, feed: p.feed.map(i => i.id === f.id ? updated : i) })); }}
                onDeleteFeed={async (id) => { try { await backendService.deleteFeed(id); setState(p => ({ ...p, feed: p.feed.filter(i => i.id !== id) })); } catch (e) { alert('Failed to delete feed item.'); } }}
                onAddInfrastructure={async (i) => {
                  if (!state.currentFarmId) { alert("Select farm"); return; }
                  const itemWithFarm = { ...i, farmId: state.currentFarmId }; // Ensure farmId is set
                  const saved = await backendService.createInfrastructure(itemWithFarm);
                  setState(p => ({ ...p, infrastructure: [...p.infrastructure, saved] }));
                }}
                onUpdateInfrastructure={async (i) => { const updated = await backendService.updateInfrastructure(i.id, i); setState(p => ({ ...p, infrastructure: p.infrastructure.map(x => x.id === i.id ? updated : x) })); }}
                onDeleteInfrastructure={async (id) => { try { await backendService.deleteInfrastructure(id); setState(p => ({ ...p, infrastructure: p.infrastructure.filter(x => x.id !== id) })); } catch (e) { alert('Failed to delete asset.'); } }}
                onAddDietPlan={async (d) => {
                  if (!state.currentFarmId) { alert("Select farm"); return; }
                  const planWithFarm = { ...d, farmId: state.currentFarmId }; // Ensure farmId is set
                  const saved = await backendService.createDietPlan(planWithFarm);
                  setState(p => ({ ...p, dietPlans: [...p.dietPlans, saved] }));
                }}
                onUpdateDietPlan={async (d) => { const updated = await backendService.updateDietPlan(d.id, d); setState(p => ({ ...p, dietPlans: p.dietPlans.map(i => i.id === d.id ? updated : i) })); }}
                onDeleteDietPlan={async (id) => { try { await backendService.deleteDietPlan(id); setState(p => ({ ...p, dietPlans: p.dietPlans.filter(i => i.id !== id) })); } catch (e) { alert('Failed to delete diet plan.'); } }}
                onRunDailyProcessing={processDailyConsumption}
                onAddTreatmentProtocol={async (p) => {
                  if (!state.currentFarmId) { alert("Select farm"); return; }
                  const protoWithFarm = { ...p, farmId: state.currentFarmId };
                  const saved = await backendService.createTreatmentProtocol(protoWithFarm);
                  setState(s => ({ ...s, treatmentProtocols: [...s.treatmentProtocols, saved] }));
                }}
                onUpdateTreatmentProtocol={async (p) => { const updated = await backendService.updateTreatmentProtocol(p.id, p); setState(s => ({ ...s, treatmentProtocols: s.treatmentProtocols.map(x => x.id === p.id ? updated : x) })); }}
                onDeleteTreatmentProtocol={async (id) => { await backendService.deleteTreatmentProtocol(id); setState(s => ({ ...s, treatmentProtocols: s.treatmentProtocols.filter(x => x.id !== id) })); }}
                onLogTreatment={async (logs) => { await backendService.logTreatment(logs); setState(s => ({ ...s, treatmentLogs: [...s.treatmentLogs, ...logs] })); }}
              />
            )}
            {activeView === 'PROCUREMENT' && (
              <Procurement
                state={{
                  ...state,
                  feed: state.currentFarmId ? state.feed.filter(f => f.farmId === state.currentFarmId) : (state.currentLocationId ? state.feed.filter(f => state.farms.find(farm => farm.id === f.farmId)?.locationId === state.currentLocationId) : state.feed),
                }}
                onAddExpense={handleCreateExpense}
                onUpdateExpense={async (exp) => {
                  setState(p => ({ ...p, expenses: p.expenses.map(e => e.id === exp.id ? exp : e) }));
                }}
                onAddFeed={async (item) => {
                  if (!state.currentFarmId) { alert("Select farm"); return; }
                  const saved = await backendService.createFeed({ ...item, farmId: state.currentFarmId });
                  setState(p => ({ ...p, feed: [...p.feed, saved] }));
                }}
                onUpdateInventory={async (item) => { const updated = await backendService.updateFeed(item.id, item); setState(p => ({ ...p, feed: p.feed.map(f => f.id === item.id ? updated : f) })); }}
                onDeleteFeed={async (id) => { try { await backendService.deleteFeed(id); setState(p => ({ ...p, feed: p.feed.filter(f => f.id !== id) })); } catch (e) { alert('Failed to delete feed item'); } }}
              />
            )}
            {activeView === 'REPORTS' && <Reports state={{
              ...state,
              livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock),
              expenses: state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : state.expenses),
              sales: state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales),
            }} />}
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

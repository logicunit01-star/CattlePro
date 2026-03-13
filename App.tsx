import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { SettingsModule } from './components/Settings';
import { MOCK_LIVESTOCK, MOCK_EXPENSES, MOCK_FEED, MOCK_SALES, FIXED_CATEGORIES, MOCK_INFRASTRUCTURE, MOCK_DIET_PLANS, MOCK_BREEDERS, MOCK_CUSTOMERS, MOCK_INVOICES } from './constants';
import { AppState, Livestock, LivestockStatus, MedicalRecord, Expense, ExpenseCategory, FeedInventory, Infrastructure, InseminationRecord, Sale, WeightRecord, DietPlan, MilkRecord, Breeder, Entity, LedgerRecord, Farm, TreatmentLog, Location, ProcessedFeedLedger } from './types';
import { Truck, Home, LogOut, FileText, BadgeDollarSign, Activity, Stethoscope, Grab, BrainCircuit, Droplets, LineChart, Settings, Menu, X, ArrowLeft, ArrowRight, Bell, Search, PlusCircle, Filter, ChevronDown, User, DollarSign, LayoutDashboard, Beef, ClipboardList, Tractor, Users, MapPin, Building2 } from 'lucide-react';

import { backendService } from './services/backendService';
import { setTenant as setTenantContext, getTenantFromUrl, getPersistedSales, setPersistedSales, getPersistedLivestockStatus, setPersistedLivestockStatus } from './services/tenantContext';

function toLivestockArray(r: Livestock[] | { content?: Livestock[] }): Livestock[] {
  return Array.isArray(r) ? r : (r?.content ?? []);
}

function normalizeDietPlanTargetIds(p: DietPlan): DietPlan {
  const ids = Array.isArray(p.targetIds) ? p.targetIds : (Array.isArray((p as any).assignedAnimalIds) ? (p as any).assignedAnimalIds : []);
  return { ...p, targetIds: ids };
}
import { setTenant as setTenantRedux } from './store/tenantSlice';
import type { RootState } from './store';

function AddCityModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, type: 'CITY' | 'REGION') => void }) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<'CITY' | 'REGION'>('CITY');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">Add City</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="City name" className="w-full border rounded px-3 py-2 mb-3" />
        <select value={type} onChange={e => setType(e.target.value as 'CITY' | 'REGION')} className="w-full border rounded px-3 py-2 mb-4">
          <option value="CITY">City</option>
          <option value="REGION">Region</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancel</button>
          <button type="button" onClick={() => name.trim() && onSubmit(name.trim(), type)} className="flex-1 py-2 bg-sky-600 text-white rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
}

function AddFarmModal({
  locations,
  onClose,
  onSubmit
}: {
  locations: Location[];
  onClose: () => void;
  onSubmit: (data: { name: string; locationId: string; type: 'DAIRY' | 'MEAT' | 'MIXED'; currency: string; costCenterCode: string }) => void;
}) {
  const [name, setName] = React.useState('');
  const [locationId, setLocationId] = React.useState(locations[0]?.id ?? '');
  const [type, setType] = React.useState<'DAIRY' | 'MEAT' | 'MIXED'>('MIXED');
  const [currency, setCurrency] = React.useState('PKR');
  const [costCenterCode, setCostCenterCode] = React.useState('');
  React.useEffect(() => {
    if (locations.length && !locationId) setLocationId(locations[0].id);
  }, [locations, locationId]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">Add Farm</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Farm name" className="w-full border rounded px-3 py-2 mb-3" />
        <select value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full border rounded px-3 py-2 mb-3">
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {locations.length === 0 && <p className="text-amber-600 text-sm mb-2">Create a city first.</p>}
        <select value={type} onChange={e => setType(e.target.value as 'DAIRY' | 'MEAT' | 'MIXED')} className="w-full border rounded px-3 py-2 mb-3">
          <option value="DAIRY">Dairy</option>
          <option value="MEAT">Meat</option>
          <option value="MIXED">Mixed</option>
        </select>
        <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Currency" className="w-full border rounded px-3 py-2 mb-3" />
        <input value={costCenterCode} onChange={e => setCostCenterCode(e.target.value)} placeholder="Cost center code" className="w-full border rounded px-3 py-2 mb-4" />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancel</button>
          <button type="button" onClick={() => name.trim() && locationId && onSubmit({ name: name.trim(), locationId, type, currency: currency || 'PKR', costCenterCode: costCenterCode || `CC-${Date.now()}` })} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const dispatch = useDispatch();
  const reduxTenant = useSelector((s: RootState) => s.tenant);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [state, setState] = useState<AppState>({
    farms: [],
    locations: [],
    currentLocationId: null,
    currentFarmId: null,
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
    treatmentLogs: [],
    processedFeedLedgers: []
  });

  const [activeView, setActiveView] = useState<'DASHBOARD' | 'CATTLE_MANAGER' | 'GOAT_MANAGER' | 'PALAI' | 'SALES' | 'FINANCE' | 'OPERATIONS' | 'PROCUREMENT' | 'REPORTS' | 'AI' | 'ENTITIES'>('DASHBOARD');
  const [operationsTab, setOperationsTab] = useState<'FEED' | 'MEDICINE' | 'SUPPLIES' | 'INFRA' | 'DIET'>('FEED');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLivestockMenuOpen, setIsLivestockMenuOpen] = useState(true);
  const [isOperationsMenuOpen, setIsOperationsMenuOpen] = useState(true);
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);

  /* -- Backend Integration -- */
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side pagination for livestock grid (CATTLE_MANAGER / GOAT_MANAGER); category/status for deep-link from Dashboard
  const [livestockPageRequest, setLivestockPageRequest] = useState({ number: 0, size: 20, sortBy: 'tagId', sortDirection: 'asc' as 'asc' | 'desc', q: '', category: '' as string, status: '' as string });
  const [livestockPageResult, setLivestockPageResult] = useState<{ content: Livestock[]; totalElements: number; totalPages: number } | null>(null);
  const [livestockGridRefresh, setLivestockGridRefresh] = useState(0);

  // Tenant: on first load read URL and persist companyName & instanceId to localStorage + Redux
  useEffect(() => {
    const fromUrl = getTenantFromUrl();
    if (fromUrl.companyName || fromUrl.instanceId || fromUrl.appType) {
      setTenantContext(fromUrl);
      dispatch(setTenantRedux(fromUrl));
    }
  }, [dispatch]);

  // Sync Redux tenant → tenantContext when Redux has values (e.g. after rehydrate) so API headers use persisted tenant
  useEffect(() => {
    if (reduxTenant.companyName || reduxTenant.instanceId) {
      setTenantContext(reduxTenant);
    }
  }, [reduxTenant.companyName, reduxTenant.instanceId, reduxTenant.appType]);

  // Fetch paginated livestock when on CATTLE_MANAGER or GOAT_MANAGER
  useEffect(() => {
    if (activeView !== 'CATTLE_MANAGER' && activeView !== 'GOAT_MANAGER') {
      setLivestockPageResult(null);
      return;
    }
    const species = activeView === 'CATTLE_MANAGER' ? 'CATTLE' : 'GOAT';
    const farmId = state.currentFarmId ?? undefined;
    const { number, size, sortBy, sortDirection, q, category, status } = livestockPageRequest;
    const categoryParam = category || (FIXED_CATEGORIES[0] ?? undefined);
    backendService.getLivestock({ page: number, limit: size, sortBy, sortDirection, q: q || undefined, farmId, species, category: categoryParam, status: status || undefined })
      .then((data) => {
        const page = Array.isArray(data) ? { content: data, totalElements: data.length, totalPages: 1 } : data;
        setLivestockPageResult({ content: page.content, totalElements: page.totalElements, totalPages: page.totalPages });
      })
      .catch(() => setLivestockPageResult(null));
  }, [activeView, state.currentFarmId, livestockPageRequest.number, livestockPageRequest.size, livestockPageRequest.sortBy, livestockPageRequest.sortDirection, livestockPageRequest.q, livestockPageRequest.category, livestockPageRequest.status, livestockGridRefresh]);

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
        const companyName = reduxTenant.companyName;
        if (companyName?.trim()) {
          await backendService.ensureTenantSetup(companyName).catch(() => { });
        }
        const [locations, farms, apiLivestock, expenses, apiSales, feed, infra, dietPlans, entities, ledger, consumptionLogs, processedFeedLedgers, treatmentProtocols, treatmentLogs] = await Promise.all([
          backendService.getLocations().catch(() => []),
          backendService.getFarms().catch(() => []),
          backendService.getLivestock(),
          backendService.getExpenses(),
          backendService.getSales().catch((e) => { console.warn("getSales failed, using persisted:", e); return []; }),
          backendService.getFeed(),
          backendService.getInfrastructure(),
          backendService.getDietPlans(),
          backendService.getEntities(),
          backendService.getLedger(),
          backendService.getConsumptionLogs(),
          backendService.getFeedLedgers().catch(() => []),
          backendService.getTreatmentProtocols(),
          backendService.getTreatmentLogs()
        ]);

        const salesFromApi = Array.isArray(apiSales) ? apiSales : [];
        const livestockList = toLivestockArray(apiLivestock);
        // Enrich sales missing farmId: backend may not return it, so infer from first sold animal's farmId
        const livestockById = new Map(livestockList.map(l => [l.id, l]));
        const enrichedApiSales: Sale[] = salesFromApi.map((s: Sale) => {
          if (s.farmId) return s;
          const firstAnimalId = s.soldAnimalIds?.[0];
          const animal = firstAnimalId ? livestockById.get(firstAnimalId) : null;
          const inferredFarmId = animal?.farmId;
          return { ...s, farmId: inferredFarmId ?? (s as any).farmId };
        });
        const persisted = getPersistedSales() as Sale[];
        const mergedSales: Sale[] = [...enrichedApiSales];
        if (persisted?.length) {
          persisted.forEach(p => {
            if (p && typeof p === 'object' && (p as Sale).id && !mergedSales.some(m => m.id === (p as Sale).id)) {
              mergedSales.push(p as Sale);
            }
          });
        }

        const statusOverrides = getPersistedLivestockStatus();
        const livestock = livestockList.map(l => ({
          ...l,
          status: (statusOverrides[l.id] as LivestockStatus) || l.status
        }));

        setState(prev => {
          const next = {
            ...prev,
            locations,
            farms,
            livestock,
            expenses,
            sales: mergedSales,
            feed,
            infrastructure: infra,
            dietPlans: (dietPlans || []).map(normalizeDietPlanTargetIds),
            entities,
            ledger,
            consumptionLogs,
            processedFeedLedgers: processedFeedLedgers ?? [],
            treatmentProtocols,
            treatmentLogs
          };
          if (prev.currentFarmId == null && farms.length > 0) {
            (next as AppState).currentFarmId = farms[0].id;
          }
          return next;
        });
        setPersistedSales(mergedSales);
      } catch (err: any) {
        console.error("Failed to load data, falling back to mocks", err);
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

  const handleCreateLocation = async (name: string, type: 'CITY' | 'REGION') => {
    try {
      const loc = await backendService.createLocation({
        id: `loc-${Date.now()}`,
        name: name.trim(),
        type
      });
      setState(prev => ({ ...prev, locations: [...prev.locations, loc] }));
      setShowAddCityModal(false);
    } catch (e: any) {
      alert(e?.message || 'Failed to create city.');
    }
  };

  const handleCreateFarm = async (data: { name: string; locationId: string; type: 'DAIRY' | 'MEAT' | 'MIXED'; currency: string; costCenterCode: string }) => {
    try {
      const farm = await backendService.createFarm({
        id: `farm-${Date.now()}`,
        name: data.name.trim(),
        locationId: data.locationId,
        type: data.type,
        currency: data.currency || 'PKR',
        costCenterCode: data.costCenterCode || `CC-${Date.now()}`
      });
      setState(prev => ({ ...prev, farms: [...prev.farms, farm], currentFarmId: prev.currentFarmId || farm.id }));
      setShowAddFarmModal(false);
    } catch (e: any) {
      alert(e?.message || 'Failed to create farm.');
    }
  };

  // --- DIET & NUTRITION ENGINE ---
  const processDailyConsumption = async () => {
    try {
      const result = await backendService.processDietPlans({});
      if (result.plansProcessed === 0 && result.ledgersCreated === 0) {
        alert(result.message || "No eligible plans to process (none active or already processed today).");
        return;
      }
      const [refetchedFeed, refetchedLogs, refetchedLedgers, refetchedLivestock, refetchedPlans, refetchedExpenses] = await Promise.all([
        backendService.getFeed(),
        backendService.getConsumptionLogs(),
        backendService.getFeedLedgers(),
        backendService.getLivestock(),
        backendService.getDietPlans(),
        backendService.getExpenses()
      ]);
        setState(prev => ({
        ...prev,
        feed: refetchedFeed,
        consumptionLogs: refetchedLogs,
        processedFeedLedgers: refetchedLedgers,
        livestock: toLivestockArray(refetchedLivestock),
        dietPlans: (refetchedPlans || []).map(normalizeDietPlanTargetIds),
        expenses: refetchedExpenses
      }));
      alert(result.message + (result.totalCost > 0 ? ` Total cost: PKR ${result.totalCost.toLocaleString()}` : ''));
    } catch (e: any) {
      console.error('Process daily consumption error:', e);
      const msg = e?.message || e?.response?.data?.message || String(e);
      alert(`Failed to process daily consumption: ${msg}`);
    }
  };

  const handleReverseLedger = async (ledgerId: string) => {
    try {
      const ledger = state.processedFeedLedgers?.find(l => l.id === ledgerId);
      if (!ledger) return alert("Ledger not found.");
      if (ledger.status === 'REVERSED') return alert("Already reversed.");
      await backendService.reverseFeedLedger(ledgerId);
      const getLedgers = backendService.getFeedLedgers ? backendService.getFeedLedgers() : Promise.resolve([]);
      const [expenses, feed, processedFeedLedgers, livestock] = await Promise.all([
        backendService.getExpenses(),
        backendService.getFeed(),
        getLedgers,
        backendService.getLivestock(),
      ]);
      setState(prev => ({
        ...prev,
        expenses: Array.isArray(expenses) ? expenses : prev.expenses,
        feed: Array.isArray(feed) ? feed : prev.feed,
        processedFeedLedgers: Array.isArray(processedFeedLedgers) ? processedFeedLedgers : (prev.processedFeedLedgers || []).map(l => l.id === ledgerId ? { ...l, status: 'REVERSED' } : l),
        livestock: toLivestockArray(livestock),
      }));
      alert(`Transaction reversed. Feed inventory, animal costs, and linked expense have been restored/removed by the server.`);
    } catch (e: any) {
      alert(`Reversal failed: ${e?.message ?? e}`);
    }
  };

  const handleClearFeedLedger = async () => {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://api.hulmsolutions.com/livestock';
      await fetch(`${apiUrl}/operations/consumption-logs/clear`, { method: 'DELETE' }).catch(() => { });

      setState(prev => ({ ...prev, consumptionLogs: [], processedFeedLedgers: [] }));
      localStorage.removeItem('cattleops_consumption_logs');
      localStorage.removeItem('cattleops_processed_feed_ledgers');
      alert("Ledger history completely purged.");
    } catch (e: any) {
      alert(`Clear failed: ${e.message}`);
    }
  };

  const handleLogTreatment = async (logs: TreatmentLog[]) => {
    if (logs.length === 0) return;
    try {
      let totalCost = 0;
      const invUpdates = new Map<string, FeedInventory>();
      state.feed.forEach(f => invUpdates.set(f.id, { ...f }));
      const livestockUpdates = new Map<string, Livestock>();

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
      for (const [id, animal] of Array.from(livestockUpdates.entries())) {
        await backendService.updateLivestock(id, animal);
      }
      await backendService.logTreatment(logs);
      if (totalCost > 0) await backendService.createExpense(expense);

      setState(prev => ({
        ...prev,
        feed: prev.feed.map(f => invUpdates.get(f.id) || f),
        livestock: prev.livestock.map(l => livestockUpdates.get(l.id) || l),
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
      setLivestockGridRefresh(r => r + 1);
    } catch (e) { alert("Failed to save livestock"); }
  };

  const updateLivestock = async (updatedAnimal: Livestock) => {
    try {
      const saved = await backendService.updateLivestock(updatedAnimal.id, updatedAnimal);
      setState(prev => ({
        ...prev,
        livestock: prev.livestock.map(l => l.id === saved.id ? saved : l)
      }));
      setPersistedLivestockStatus({ [saved.id]: saved.status });
      setLivestockGridRefresh(r => r + 1);
    } catch (e) {
      setState(prev => ({
        ...prev,
        livestock: prev.livestock.map(l => l.id === updatedAnimal.id ? { ...l, status: updatedAnimal.status } : l)
      }));
      setPersistedLivestockStatus({ [updatedAnimal.id]: updatedAnimal.status });
      console.warn("Livestock update saved locally; backend sync failed:", e);
    }
  };

  const addMedicalRecord = async (animalId: string, record: MedicalRecord) => {
    try {
      const animal = state.livestock.find(l => l.id === animalId);
      if (!animal) throw new Error("Animal not found");
      await backendService.addMedicalRecord(animalId, record);

      if (record.cost > 0) {
        const targetFarmId = state.currentFarmId || animal.farmId;
        if (!targetFarmId) { alert("Warning: Expense recorded but no Farm ID could be associated."); }
        const expense: Expense = {
          id: `med_${Date.now()}`,
          farmId: targetFarmId || 'UNKNOWN_FARM',
          category: record.type === 'VACCINATION' ? ExpenseCategory.VACCINE : ExpenseCategory.MEDICAL,
          amount: record.cost,
          date: record.date,
          description: `${record.type}: ${record.medicineName} (${animal.tagId})`,
          relatedAnimalId: animalId,
          farmName: state.farms.find(f => f.id === targetFarmId)?.name
        };
        await backendService.createExpense(expense);
      }

      const [rawLivestock, expenses] = await Promise.all([
        backendService.getLivestock(),
        record.cost > 0 ? backendService.getExpenses() : Promise.resolve(state.expenses)
      ]);
      setState(prev => ({ ...prev, livestock: toLivestockArray(rawLivestock), expenses }));
    } catch (e) { alert("Failed to add medical record: " + (e instanceof Error ? e.message : String(e))); }
  };

  const bulkVaccinate = async (animalIds: string[], record: MedicalRecord) => {
    try {
      await backendService.bulkVaccinate(animalIds, record);
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
      setLivestockGridRefresh(r => r + 1);
    } catch (e) { alert("Failed to bulk vaccinate: " + (e instanceof Error ? e.message : String(e))); }
  };

  const bulkMove = async (animalIds: string[], location: string) => {
    try {
      await backendService.bulkMove(animalIds, location);
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
      setLivestockGridRefresh(r => r + 1);
    } catch (e) { alert("Failed to bulk move: " + (e instanceof Error ? e.message : String(e))); }
  };

  const addBreedingRecord = async (animalId: string, record: InseminationRecord) => {
    try {
      const animal = state.livestock.find(l => l.id === animalId);
      const savedRecord = await backendService.addBreedingRecord(animalId, record);
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());

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

  const updateBreedingRecord = async (animalId: string, updatedRec: InseminationRecord) => {
    try {
      await backendService.updateBreedingRecord(animalId, updatedRec);
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
    } catch (e) {
      console.error(e);
      alert('Failed to update breeding record. Please try again.');
    }
  };

  const addWeightRecord = async (animalId: string, record: WeightRecord) => {
    try {
      await backendService.addWeightRecord(animalId, record);
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
    } catch (e) { alert("Failed to add weight record"); }
  };

  const addMilkRecord = async (animalId: string, record: MilkRecord) => {
    try {
      await backendService.addMilkRecord(animalId, record);
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
    } catch (e) { alert("Failed to add milk record"); }
  };

  const deleteLivestock = async (id: string, force = false) => {
    try {
      // Call backend which may soft-delete (ARCHIVED) or hard-delete depending on financial history
      await backendService.deleteLivestock(id, force);
      // Re-fetch to reflect server truth (archived vs removed)
      const updatedLivestock = toLivestockArray(await backendService.getLivestock());
      setState(prev => ({ ...prev, livestock: updatedLivestock }));
      setLivestockGridRefresh(r => r + 1);
    } catch (e: any) {
      alert(e?.message || "Failed to delete animal.");
    }
  };

  const handleCreateExpense = async (exp: Expense) => {
    if (!state.currentFarmId) { alert("Please select a farm to record expenses."); throw new Error("No farm selected"); }
    const expenseWithContext = { ...exp, farmId: state.currentFarmId, farmName: state.farms.find(f => f.id === state.currentFarmId)?.name };
    try {
      await backendService.createExpense(expenseWithContext);
      // Re-fetch affected modules to ensure UI is in sync with Backend Ledger Logic
      const [expenses, entities, ledger] = await Promise.all([
        backendService.getExpenses(),
        backendService.getEntities(),
        backendService.getLedger()
      ]);
      setState(prev => ({ ...prev, expenses, entities, ledger }));
    } catch (e) {
      alert("Failed to save expense");
      throw e;
    }
  };

  const handleUpdateExpense = async (exp: Expense) => {
    try {
      const updated = await backendService.updateExpense(exp.id, exp);
      setState(p => ({ ...p, expenses: p.expenses.map(e => e.id === updated.id ? updated : e) }));
    } catch (e) {
      console.error(e);
      alert('Failed to update expense.');
      throw e;
    }
  };


  const handleCreateSale = async (sale: Sale & { animalId?: string }) => {
    let targetFarmId = state.currentFarmId;

    if (!targetFarmId && sale.soldAnimalIds && sale.soldAnimalIds.length > 0) {
      const firstAnimal = state.livestock.find(l => l.id === sale.soldAnimalIds![0]);
      if (firstAnimal) targetFarmId = firstAnimal.farmId;
    }
    if (!targetFarmId && (sale as any).animalId) {
      const animal = state.livestock.find(l => l.id === (sale as any).animalId);
      if (animal) targetFarmId = animal.farmId;
    }

    if (!targetFarmId) { alert("Please select a farm to record sales."); return; }

    const saleWithContext: Sale = {
      ...sale,
      farmId: targetFarmId,
      paymentStatus: sale.paymentStatus ?? 'PAID',
      amountReceived: sale.amountReceived ?? sale.amount,
      soldAnimalIds: sale.soldAnimalIds ?? ((sale as any).animalId ? [(sale as any).animalId] : undefined)
    };

    // Add to state immediately so the grid shows it (works even if API fails or is offline)
    const saleToShow: Sale = { ...saleWithContext, id: saleWithContext.id };
    const newSalesAfterAdd = [...state.sales, saleToShow];
    setState(prev => ({ ...prev, sales: newSalesAfterAdd }));
    setPersistedSales(newSalesAfterAdd);

    try {
      const isBulk = (saleWithContext.soldAnimalIds?.length ?? 0) > 1;
      const saved = isBulk
        ? await backendService.createSaleBulk(saleWithContext)
        : await backendService.createSale(saleWithContext);
      const [salesFromApi, entities, ledger] = await Promise.all([
        backendService.getSales().catch(() => []),
        backendService.getEntities(),
        backendService.getLedger()
      ]);
      const salesToSet = Array.isArray(salesFromApi) && salesFromApi.length > 0
        ? salesFromApi
        : newSalesAfterAdd.slice(0, -1).concat({ ...saved, farmId: saved.farmId || targetFarmId });
      setState(prev => ({
        ...prev,
        sales: salesToSet,
        entities,
        ledger
      }));
      setPersistedSales(salesToSet);
    } catch (e) {
      // Sale already in state and persisted; keep it visible after refresh.
      console.warn("Sale saved locally; backend sync failed:", e);
    }
  };

  const handleDeleteSale = async (id: string) => {
    const saleToDelete = state.sales.find(s => s.id === id);
    if (!saleToDelete) return;
    try {
      if (!window.confirm("Are you sure you want to delete this sale? This will revert the animals to ACTIVE status.")) return;
      await backendService.deleteSale(id);

      // Cascading rollback for animals
      if (saleToDelete.soldAnimalIds) {
        for (const animalId of saleToDelete.soldAnimalIds) {
          const animalToRevert = state.livestock.find(l => l.id === animalId);
          if (animalToRevert) {
            await updateLivestock({ ...animalToRevert, status: 'ACTIVE' as any });
          }
        }
      }

      setState(p => {
        const nextSales = p.sales.filter(s => s.id !== id);
        setPersistedSales(nextSales);
        return { ...p, sales: nextSales };
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete sale completely. Check backend logs.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const expenseToDelete = state.expenses.find(e => e.id === id);
    if (!expenseToDelete) return;
    try {
      if (!window.confirm("Are you sure you want to delete this expense? This will revert inventory quantities if applicable.")) return;
      await backendService.deleteExpense(id);

      let updatedFeed = state.feed;
      // Check if it's a feed purchase we need to reverse
      if (expenseToDelete.feedItemId && expenseToDelete.quantity) {
        const inventoryItem = state.feed.find(f => f.id === expenseToDelete.feedItemId);
        if (inventoryItem) {
          const updatedItem = { ...inventoryItem, quantity: Math.max(0, inventoryItem.quantity - expenseToDelete.quantity) };
          try {
            await backendService.updateFeed(updatedItem.id, updatedItem);
            updatedFeed = state.feed.map(f => f.id === updatedItem.id ? updatedItem : f);
          } catch (e) { console.warn("Failed to revert inventory on expense delete", e); }
        }
      }

      setState(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id), feed: updatedFeed }));
    } catch (e) {
      console.error(e);
      alert("Failed to delete expense");
    }
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

  const addEntity = async (entity: Entity) => {
    try {
      const entityWithFarm = { ...entity, farmId: entity.farmId || state.currentFarmId || undefined };
      const saved = await backendService.createEntity(entityWithFarm);
      setState(prev => ({ ...prev, entities: [...prev.entities, saved] }));
    } catch (e: any) {
      alert(e?.message || 'Failed to add entity.');
    }
  };

  const updateEntity = async (entity: Entity) => {
    try {
      const updated = await backendService.updateEntity(entity.id, entity);
      setState(prev => ({ ...prev, entities: prev.entities.map(e => e.id === entity.id ? updated : e) }));
    } catch (e: any) {
      alert(e?.message || 'Failed to update entity.');
    }
  };

  const deleteEntity = async (id: string) => {
    try {
      await backendService.deleteEntity(id);
      setState(prev => ({ ...prev, entities: prev.entities.filter(e => e.id !== id) }));
    } catch (e: any) {
      alert(e?.message || 'Failed to delete entity.');
    }
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
              <button onClick={() => { setActiveView('OPERATIONS'); setIsOperationsMenuOpen(!isOperationsMenuOpen); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${activeView === 'OPERATIONS' ? 'text-emerald-700 bg-emerald-50/50' : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'}`}>
                <div className="flex items-center gap-3">
                  <ClipboardList size={20} className="group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-semibold text-sm">Operations & Feed</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOperationsMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOperationsMenuOpen && (
                <div className="mt-1 ml-4 pl-4 border-l-2 border-emerald-100 space-y-1 animate-slide-up">
                  <button onClick={() => { setActiveView('OPERATIONS'); setOperationsTab('FEED'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'OPERATIONS' && operationsTab === 'FEED' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Feed Stock</button>
                  <button onClick={() => { setActiveView('OPERATIONS'); setOperationsTab('MEDICINE'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'OPERATIONS' && operationsTab === 'MEDICINE' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Medicine Cabinet</button>
                  <button onClick={() => { setActiveView('OPERATIONS'); setOperationsTab('SUPPLIES'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'OPERATIONS' && operationsTab === 'SUPPLIES' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Farm Supplies</button>
                  <button onClick={() => { setActiveView('OPERATIONS'); setOperationsTab('INFRA'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'OPERATIONS' && operationsTab === 'INFRA' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Fixed Assets</button>
                  <button onClick={() => { setActiveView('OPERATIONS'); setOperationsTab('DIET'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'OPERATIONS' && operationsTab === 'DIET' ? 'text-emerald-700 bg-emerald-50 translate-x-1' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>Diets</button>
                </div>
              )}
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
              <NavItem view="SETTINGS" icon={Settings} label="System Settings" />
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
              <button type="button" onClick={() => setShowAddCityModal(true)} className="p-1.5 rounded bg-sky-100 text-sky-600 hover:bg-sky-200" title="Add City"><PlusCircle size={18} /></button>
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
              <button type="button" onClick={() => setShowAddFarmModal(true)} className="p-1.5 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Add Farm"><PlusCircle size={18} /></button>
              {state.currentFarmId && <div className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">{state.farms.find(f => f.id === state.currentFarmId)?.type}</div>}
            </div>
          </div>

          {/* Add City Modal */}
          {showAddCityModal && (
            <AddCityModal onClose={() => setShowAddCityModal(false)} onSubmit={handleCreateLocation} />
          )}
          {/* Add Farm Modal */}
          {showAddFarmModal && (
            <AddFarmModal locations={state.locations} onClose={() => setShowAddFarmModal(false)} onSubmit={handleCreateFarm} />
          )}

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
              <Dashboard
                isGlobalView={!state.currentFarmId && !state.currentLocationId}
                onNavigate={(view, options) => {
                  setActiveView(view);
                  if (options?.operationsTab) setOperationsTab(options.operationsTab);
                  if ((view === 'CATTLE_MANAGER' || view === 'GOAT_MANAGER') && options?.filterCategory) {
                    setLivestockPageRequest(prev => ({ ...prev, category: options.filterCategory ?? '', number: 0 }));
                  }
                  setIsSidebarOpen(false);
                }}
                state={{
                  ...state,
                  livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock),
                  expenses: state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : state.expenses),
                  sales: state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => s.farmId && state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales),
                  feed: state.currentFarmId ? state.feed.filter(f => f.farmId === state.currentFarmId) : (state.currentLocationId ? state.feed.filter(f => state.farms.find(farm => farm.id === f.farmId)?.locationId === state.currentLocationId) : state.feed),
                  dietPlans: state.currentFarmId ? state.dietPlans.filter(d => d.farmId === state.currentFarmId) : (state.currentLocationId ? state.dietPlans.filter(d => state.farms.find(farm => farm.id === d.farmId)?.locationId === state.currentLocationId) : state.dietPlans),
                }}
              />
            )}
            {activeView === 'CATTLE_MANAGER' && (
              <LivestockManager
                key="cattle-manager"
                livestock={livestockPageResult ? livestockPageResult.content : (state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId && l.species === 'CATTLE') : (state.currentLocationId ? state.livestock.filter(l => l.species === 'CATTLE' && state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock.filter(l => l.species === 'CATTLE')))}
                breeders={state.breeders} species="CATTLE" categories={FIXED_CATEGORIES}
                entities={state.entities}
                onAddLivestock={addLivestock} onUpdateLivestock={updateLivestock} onDeleteLivestock={deleteLivestock}
                onAddMedicalRecord={addMedicalRecord} onAddBreedingRecord={addBreedingRecord} onAddWeightRecord={addWeightRecord} onAddMilkRecord={addMilkRecord}
                onUpdateBreedingRecord={updateBreedingRecord}
                onBulkVaccinate={bulkVaccinate} onBulkMove={bulkMove}
                pagination={livestockPageResult ? { totalElements: livestockPageResult.totalElements, totalPages: livestockPageResult.totalPages, page: livestockPageRequest.number, size: livestockPageRequest.size, sortBy: livestockPageRequest.sortBy, sortDirection: livestockPageRequest.sortDirection, searchQ: livestockPageRequest.q, category: livestockPageRequest.category } : undefined}
                onPageChange={(page) => setLivestockPageRequest(prev => ({ ...prev, number: page }))}
                onSortChange={(sortBy, sortDirection) => setLivestockPageRequest(prev => ({ ...prev, sortBy, sortDirection, number: 0 }))}
                onSearchChange={(q) => setLivestockPageRequest(prev => ({ ...prev, q, number: 0 }))}
                onCategoryChange={(category) => setLivestockPageRequest(prev => ({ ...prev, category, number: 0 }))}
                inventory={state.feed} onAddSale={handleCreateSale}
              />
            )}
            {activeView === 'GOAT_MANAGER' && (
              <LivestockManager
                key="goat-manager"
                livestock={livestockPageResult ? livestockPageResult.content : (state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId && l.species === 'GOAT') : (state.currentLocationId ? state.livestock.filter(l => l.species === 'GOAT' && state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : state.livestock.filter(l => l.species === 'GOAT')))}
                breeders={state.breeders} species="GOAT" categories={FIXED_CATEGORIES}
                entities={state.entities}
                onAddLivestock={addLivestock} onUpdateLivestock={updateLivestock} onDeleteLivestock={deleteLivestock}
                onAddMedicalRecord={addMedicalRecord} onAddBreedingRecord={addBreedingRecord} onAddWeightRecord={addWeightRecord} onAddMilkRecord={addMilkRecord}
                onUpdateBreedingRecord={updateBreedingRecord}
                onBulkVaccinate={bulkVaccinate} onBulkMove={bulkMove}
                pagination={livestockPageResult ? { totalElements: livestockPageResult.totalElements, totalPages: livestockPageResult.totalPages, page: livestockPageRequest.number, size: livestockPageRequest.size, sortBy: livestockPageRequest.sortBy, sortDirection: livestockPageRequest.sortDirection, searchQ: livestockPageRequest.q, category: livestockPageRequest.category } : undefined}
                onPageChange={(page) => setLivestockPageRequest(prev => ({ ...prev, number: page }))}
                onSortChange={(sortBy, sortDirection) => setLivestockPageRequest(prev => ({ ...prev, sortBy, sortDirection, number: 0 }))}
                onSearchChange={(q) => setLivestockPageRequest(prev => ({ ...prev, q, number: 0 }))}
                onCategoryChange={(category) => setLivestockPageRequest(prev => ({ ...prev, category, number: 0 }))}
                inventory={state.feed} onAddSale={handleCreateSale}
              />
            )}
            {activeView === 'PALAI' && (
              <PalaiManager
                state={{
                  ...state,
                  livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : []),
                  customers: (state.currentFarmId ? state.entities.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.entities.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : [])).filter(e => e.type === 'CUSTOMER' || e.type === 'PALAI_CLIENT'),
                  invoices: state.currentFarmId ? state.invoices.filter(i => i.farmId === state.currentFarmId) : (state.currentLocationId ? state.invoices.filter(i => state.farms.find(f => f.id === i.farmId)?.locationId === state.currentLocationId) : []),
                }}
                onUpdateLivestock={updateLivestock}
                onAddExpense={handleCreateExpense}
              />
            )}
            {activeView === 'SALES' && (
              <SalesManager
                state={{
                  ...state,
                  sales: state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => s.farmId && state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales),
                  livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : []),
                }}
                currentFarmId={state.currentFarmId}
                currentLocationId={state.currentLocationId}
                onAddSale={handleCreateSale}
                onUpdateLivestock={updateLivestock}
                onDeleteSale={handleDeleteSale}
              />
            )}
            {activeView === 'FINANCE' && (
              <Financials
                expenses={state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : [])}
                sales={state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => s.farmId && state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales)}
                livestockList={state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : [])}
                entities={state.entities}
                farms={state.farms}
                locations={state.locations}
                currentFarmId={state.currentFarmId}
                currentLocationId={state.currentLocationId}
                onAddExpense={handleCreateExpense}
                onUpdateExpense={handleUpdateExpense}
                onAddSale={handleCreateSale}
                onDeleteExpense={handleDeleteExpense}
                onDeleteSale={handleDeleteSale}
                onDeleteLivestock={async (id) => { await backendService.deleteLivestock(id); setState(p => ({ ...p, livestock: p.livestock.filter(l => l.id !== id) })); }}
              />
            )}
            {activeView === 'OPERATIONS' && (
              <Operations
                initialTab={operationsTab}
                onTabChange={setOperationsTab}
                onAddExpense={handleCreateExpense}
                state={{
                  ...state,
                  feed: state.currentFarmId ? state.feed.filter(f => f.farmId === state.currentFarmId) : (state.currentLocationId ? state.feed.filter(f => state.farms.find(farm => farm.id === f.farmId)?.locationId === state.currentLocationId) : []),
                  infrastructure: state.currentFarmId ? state.infrastructure.filter(i => i.farmId === state.currentFarmId) : (state.currentLocationId ? state.infrastructure.filter(i => state.farms.find(farm => farm.id === i.farmId)?.locationId === state.currentLocationId) : []),
                  dietPlans: state.currentFarmId ? state.dietPlans.filter(d => d.farmId === state.currentFarmId) : (state.currentLocationId ? state.dietPlans.filter(d => state.farms.find(farm => farm.id === d.farmId)?.locationId === state.currentLocationId) : []),
                  livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : []),
                  treatmentProtocols: state.currentFarmId ? state.treatmentProtocols.filter(t => t.farmId === state.currentFarmId) : (state.currentLocationId ? state.treatmentProtocols.filter(t => state.farms.find(f => f.id === t.farmId)?.locationId === state.currentLocationId) : []),
                  processedFeedLedgers: state.currentFarmId ? (state.processedFeedLedgers || []).filter(p => p.farmId === state.currentFarmId) : (state.currentLocationId ? (state.processedFeedLedgers || []).filter(p => state.farms.find(f => f.id === p.farmId)?.locationId === state.currentLocationId) : (state.processedFeedLedgers || []))
                }}
                onReverseFeedLedger={handleReverseLedger}
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
                  const normalized = { ...saved, targetIds: Array.isArray(saved.targetIds) ? saved.targetIds : (Array.isArray((saved as any).assignedAnimalIds) ? (saved as any).assignedAnimalIds : []) };
                  setState(p => ({ ...p, dietPlans: [...p.dietPlans, normalized] }));
                }}
                onUpdateDietPlan={async (d) => {
                  const updated = await backendService.updateDietPlan(d.id, d);
                  const normalized = { ...updated, targetIds: Array.isArray(updated.targetIds) ? updated.targetIds : (Array.isArray((updated as any).assignedAnimalIds) ? (updated as any).assignedAnimalIds : []) };
                  setState(p => ({ ...p, dietPlans: p.dietPlans.map(i => i.id === d.id ? normalized : i) }));
                }}
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
                onLogTreatment={handleLogTreatment}
                onApplyProtocol={async (protocolId, targetAnimalIds, performedBy) => {
                  const result = await backendService.applyProtocol({ protocolId, targetAnimalIds, performedBy });
                  if (!result.success) throw new Error(result.message);
                  const [feed, treatmentLogs, expenses, livestock] = await Promise.all([
                    backendService.getFeed(),
                    backendService.getTreatmentLogs(),
                    backendService.getExpenses(),
                    backendService.getLivestock()
                  ]);
                  setState(prev => ({
                    ...prev,
                    feed: Array.isArray(feed) ? feed : prev.feed,
                    treatmentLogs: Array.isArray(treatmentLogs) ? treatmentLogs : prev.treatmentLogs,
                    expenses: Array.isArray(expenses) ? expenses : prev.expenses,
                    livestock: toLivestockArray(livestock)
                  }));
                }}
                onClearFeedLedger={handleClearFeedLedger}
              />
            )}
            {activeView === 'PROCUREMENT' && (
              <Procurement
                state={{
                  ...state,
                  feed: state.currentFarmId ? state.feed.filter(f => f.farmId === state.currentFarmId) : (state.currentLocationId ? state.feed.filter(f => state.farms.find(farm => farm.id === f.farmId)?.locationId === state.currentLocationId) : []),
                  expenses: state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : []),
                  entities: state.currentFarmId ? state.entities.filter(e => !e.farmId || e.farmId === state.currentFarmId) : (state.currentLocationId ? state.entities.filter(e => !e.farmId || state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : []),
                }}
                onAddExpense={handleCreateExpense}
                onUpdateExpense={async (exp) => {
                  try {
                    const updated = await backendService.updateExpense(exp.id, exp);
                    setState(p => ({ ...p, expenses: p.expenses.map(e => e.id === updated.id ? updated : e) }));
                  } catch (e) {
                    console.error(e);
                    alert('Failed to update expense.');
                    throw e;
                  }
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
              livestock: state.currentFarmId ? state.livestock.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.livestock.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : []),
              expenses: state.currentFarmId ? state.expenses.filter(e => e.farmId === state.currentFarmId) : (state.currentLocationId ? state.expenses.filter(e => state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : []),
              sales: state.currentFarmId ? state.sales.filter(s => s.farmId === state.currentFarmId) : (state.currentLocationId ? state.sales.filter(s => s.farmId && state.farms.find(f => f.id === s.farmId)?.locationId === state.currentLocationId) : state.sales),
            }} />}
            {activeView === 'ENTITIES' && (
              <EntityManager
                entities={state.currentFarmId ? state.entities.filter(e => !e.farmId || e.farmId === state.currentFarmId) : (state.currentLocationId ? state.entities.filter(e => !e.farmId || state.farms.find(f => f.id === e.farmId)?.locationId === state.currentLocationId) : [])}
                ledger={state.currentFarmId ? state.ledger.filter(l => l.farmId === state.currentFarmId) : (state.currentLocationId ? state.ledger.filter(l => state.farms.find(f => f.id === l.farmId)?.locationId === state.currentLocationId) : [])}
                currentFarmId={state.currentFarmId}
                currentLocationId={state.currentLocationId}
                onAddEntity={addEntity}
                onUpdateEntity={updateEntity}
                onDeleteEntity={deleteEntity}
                onAddPayment={handleAddPayment}
              />
            )}
            {activeView === 'AI' && <GeminiAdvisor state={state} />}
            {activeView === 'SETTINGS' && <SettingsModule />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

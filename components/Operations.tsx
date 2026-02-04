
import React, { useState } from 'react';
import { AppState, FeedInventory, Infrastructure, DietPlan } from '../types';
import { Warehouse, Construction, AlertCircle, Plus, Trash2, Edit2, Tag, X, Save, CheckCircle, ArrowLeft, Utensils, CalendarClock, Beef, Upload, Image as ImageIcon } from 'lucide-react';

interface Props {
    state: AppState;
    onAddFeed: (item: FeedInventory) => void | Promise<void>;
    onUpdateFeed: (item: FeedInventory) => void | Promise<void>;
    onDeleteFeed: (id: string) => void | Promise<void>;
    onAddInfrastructure: (item: Infrastructure) => void | Promise<void>;
    onUpdateInfrastructure: (item: Infrastructure) => void | Promise<void>;
    onDeleteInfrastructure: (id: string) => void | Promise<void>;
    onAddDietPlan: (plan: DietPlan) => void | Promise<void>;
    onUpdateDietPlan: (plan: DietPlan) => void | Promise<void>;
    onDeleteDietPlan: (id: string) => void | Promise<void>;
}

export const Operations: React.FC<Props> = ({
    state,
    onAddFeed,
    onUpdateFeed,
    onDeleteFeed,
    onAddInfrastructure,
    onUpdateInfrastructure,
    onDeleteInfrastructure,
    onAddDietPlan,
    onUpdateDietPlan,
    onDeleteDietPlan
}) => {
    const [activeTab, setActiveTab] = useState<'FEED' | 'MEDICINE' | 'INFRA' | 'DIET'>('FEED');
    const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');

    // --- FEED STATE ---
    const [editingFeed, setEditingFeed] = useState<FeedInventory | null>(null);
    const [feedForm, setFeedForm] = useState<Partial<FeedInventory>>({
        name: '', quantity: 0, unitCost: 0, reorderLevel: 0
    });

    // --- INFRASTRUCTURE STATE ---
    const [editingInfra, setEditingInfra] = useState<Infrastructure | null>(null);
    const [infraForm, setInfraForm] = useState<Partial<Infrastructure>>({
        name: '', assetTag: '', category: 'EQUIPMENT', status: 'OPERATIONAL', location: '', value: 0, purchaseDate: '', imageUrl: ''
    });

    // --- DIET PLAN STATE ---
    const [editingDiet, setEditingDiet] = useState<DietPlan | null>(null);
    const [dietForm, setDietForm] = useState<Partial<DietPlan>>({
        name: '', scheduleType: 'DAILY', description: '', assignedAnimalIds: []
    });

    // --- HELPERS ---

    const handleInfraImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInfraForm({ ...infraForm, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const openAddFeed = () => {
        setEditingFeed(null);
        setFeedForm({ name: '', quantity: 0, unitCost: 0, reorderLevel: 0 });
        setViewMode('FORM');
    };

    const openEditFeed = (item: FeedInventory) => {
        setEditingFeed(item);
        setFeedForm(item);
        setViewMode('FORM');
    };

    const openAddInfra = () => {
        setEditingInfra(null);
        setInfraForm({ name: '', assetTag: '', category: 'EQUIPMENT', status: 'OPERATIONAL', location: '', value: 0, purchaseDate: new Date().toISOString().split('T')[0], imageUrl: '' });
        setViewMode('FORM');
    };

    const openEditInfra = (item: Infrastructure) => {
        setEditingInfra(item);
        setInfraForm({ ...item, purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0] });
        setViewMode('FORM');
    };

    const openAddDiet = () => {
        setEditingDiet(null);
        setDietForm({ name: '', scheduleType: 'DAILY', description: '', assignedAnimalIds: [] });
        setViewMode('FORM');
    };

    const openEditDiet = (plan: DietPlan) => {
        setEditingDiet(plan);
        setDietForm(plan);
        setViewMode('FORM');
    };

    const handleFeedSubmit = async () => {
        if (!feedForm.name || feedForm.quantity === undefined) return alert("Name and Quantity required");
        const item: FeedInventory = {
            id: editingFeed ? editingFeed.id : Math.random().toString(36).substr(2, 9),
            name: feedForm.name,
            quantity: Number(feedForm.quantity),
            unitCost: Number(feedForm.unitCost) || 0,
            reorderLevel: Number(feedForm.reorderLevel) || 0
        };
        try {
            if (editingFeed) await onUpdateFeed(item);
            else await onAddFeed(item);
            setViewMode('LIST');
        } catch (e) {
            console.error(e);
            alert("Failed to save feed item. Is the backend running?");
        }
    };

    const handleInfraSubmit = async () => {
        if (!infraForm.name || !infraForm.assetTag) return alert("Name and Asset Tag required");
        const item: Infrastructure = {
            id: editingInfra ? editingInfra.id : Math.random().toString(36).substr(2, 9),
            name: infraForm.name!,
            assetTag: infraForm.assetTag!,
            category: (infraForm.category as any) || 'EQUIPMENT',
            status: (infraForm.status as any) || 'OPERATIONAL',
            location: infraForm.location || 'Unknown',
            value: Number(infraForm.value) || 0,
            purchaseDate: infraForm.purchaseDate || new Date().toISOString().split('T')[0],
            imageUrl: infraForm.imageUrl
        };
        try {
            if (editingInfra) await onUpdateInfrastructure(item);
            else await onAddInfrastructure(item);
            setViewMode('LIST');
            setInfraForm({ name: '', assetTag: '', category: 'EQUIPMENT', status: 'OPERATIONAL', location: '', value: 0, purchaseDate: '', imageUrl: '' });
        } catch (e) {
            console.error(e);
            alert("Failed to save asset. Is the backend running?");
        }
    };

    const handleDietSubmit = async () => {
        if (!dietForm.name || !dietForm.description) return alert("Name and Plan Details required");
        const plan: DietPlan = {
            id: editingDiet ? editingDiet.id : Math.random().toString(36).substr(2, 9),
            name: dietForm.name!,
            scheduleType: (dietForm.scheduleType as any) || 'DAILY',
            description: dietForm.description!,
            assignedAnimalIds: dietForm.assignedAnimalIds || []
        };
        try {
            if (editingDiet) await onUpdateDietPlan(plan);
            else await onAddDietPlan(plan);
            setViewMode('LIST');
        } catch (e) {
            console.error(e);
            alert("Failed to save diet plan. Is the backend running?");
        }
    };

    const toggleAnimalAssignment = (animalId: string) => {
        setDietForm(prev => {
            const currentIds = prev.assignedAnimalIds || [];
            if (currentIds.includes(animalId)) {
                return { ...prev, assignedAnimalIds: currentIds.filter(id => id !== animalId) };
            } else {
                return { ...prev, assignedAnimalIds: [...currentIds, animalId] };
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPERATIONAL': return 'text-green-600 bg-green-100';
            case 'NEEDS_REPAIR': return 'text-orange-600 bg-orange-100';
            case 'UNDER_MAINTENANCE': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Operations & Resources</h2>
                    <p className="text-sm text-gray-500">Manage inventory, assets, and nutrition plans</p>
                </div>
            </div>

            {/* Tabs - Only show if in LIST mode to avoid navigation confusion during edit */}
            {viewMode === 'LIST' && (
                <div className="border-b border-gray-200 flex space-x-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('FEED')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'FEED' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Feed Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('MEDICINE')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'MEDICINE' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Medicine Cabinet
                    </button>
                    <button
                        onClick={() => setActiveTab('INFRA')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'INFRA' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Infrastructure & Assets
                    </button>
                    <button
                        onClick={() => setActiveTab('DIET')}
                        className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'DIET' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Diet & Nutrition Plans
                    </button>
                </div>
            )}

            {/* --- FEED CONTENT --- */}
            {activeTab === 'FEED' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-end">
                                <button onClick={openAddFeed} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                    <Plus size={16} /> Add Item
                                </button>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {state.feed.filter(i => i.category !== 'MEDICINE').map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            <Warehouse size={16} className="text-gray-400" />
                                                            {item.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold">
                                                        {item.quantity} kg
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        PKR {item.unitCost.toFixed(2)} /kg
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.quantity <= item.reorderLevel ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                <AlertCircle size={12} /> Low Stock
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                <CheckCircle size={12} /> OK
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => openEditFeed(item)} className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 p-1.5 rounded"><Edit2 size={16} /></button>
                                                            <button onClick={() => { if (confirm('Delete this item?')) onDeleteFeed(item.id); }} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {state.feed.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">No feed items recorded. Add some stock.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in max-w-2xl mx-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-800">{editingFeed ? 'Edit Inventory Item' : 'Add New Feed Stock'}</h3>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input type="text" value={feedForm.name} onChange={e => setFeedForm({ ...feedForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Alfalfa Hay" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                                        <input type="number" value={feedForm.quantity} onChange={e => setFeedForm({ ...feedForm, quantity: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (PKR/kg)</label>
                                        <input type="number" value={feedForm.unitCost} onChange={e => setFeedForm({ ...feedForm, unitCost: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Alert Level (kg)</label>
                                    <input type="number" value={feedForm.reorderLevel} onChange={e => setFeedForm({ ...feedForm, reorderLevel: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <p className="text-xs text-gray-400 mt-1">System will flag "Low Stock" when quantity drops below this.</p>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                    <button onClick={handleFeedSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">Save Item</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* --- INFRASTRUCTURE CONTENT --- */}
            {activeTab === 'INFRA' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-end">
                                <button onClick={openAddInfra} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                    <Plus size={16} /> Add Asset
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {state.infrastructure.map(infra => (
                                    <div key={infra.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-5">
                                            <Construction size={80} />
                                        </div>
                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                                    {infra.imageUrl ? (
                                                        <img src={infra.imageUrl} alt="Asset" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Construction size={20} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{infra.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="bg-gray-800 text-white text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1">
                                                            <Tag size={10} /> {infra.assetTag}
                                                        </span>
                                                        <span className="text-xs text-gray-500 uppercase tracking-wide">{infra.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(infra.status)}`}>
                                                {infra.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-4 relative z-10 border-t border-gray-100 pt-3">
                                            <div>
                                                <p className="text-xs text-gray-400">Location</p>
                                                <p className="font-medium">{infra.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Value</p>
                                                <p className="font-medium">PKR {infra.value.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 flex justify-end gap-2 relative z-10">
                                            <button onClick={() => openEditInfra(infra)} className="text-emerald-600 hover:text-emerald-800 text-sm flex items-center gap-1">
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button onClick={async () => { if (confirm(`Remove asset ${infra.assetTag}?`)) await onDeleteInfrastructure(infra.id); }} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {state.infrastructure.length === 0 && (
                                    <div className="col-span-full p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                                        <Construction className="mx-auto text-gray-300 mb-2" size={48} />
                                        <p className="text-gray-500">No infrastructure or assets tracked yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in max-w-2xl mx-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => { setViewMode('LIST'); setEditingInfra(null); }} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-800">{editingInfra ? 'Edit Asset' : 'Register New Asset'}</h3>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

                                {/* Image Upload Section */}
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-emerald-400 transition-colors">
                                        {infraForm.imageUrl ? (
                                            <img src={infraForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="text-gray-300" size={32} />
                                        )}
                                        <input type="file" accept="image/*" onChange={handleInfraImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <Upload className="text-white" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500 flex-1">
                                        <p className="font-medium text-gray-800 mb-1">Asset Photo</p>
                                        <p>Upload a photo of the machinery, building, or equipment for identification.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag *</label>
                                        <div className="relative">
                                            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" value={infraForm.assetTag} onChange={e => setInfraForm({ ...infraForm, assetTag: e.target.value.toUpperCase() })} className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 font-mono focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="TRAC-01" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select value={infraForm.category} onChange={e => setInfraForm({ ...infraForm, category: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            <option value="VEHICLE">Vehicle</option>
                                            <option value="EQUIPMENT">Equipment</option>
                                            <option value="BUILDING">Building</option>
                                            <option value="PASTURE">Pasture/Land</option>
                                            <option value="TOOL">Tool</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                                    <input type="text" value={infraForm.name} onChange={e => setInfraForm({ ...infraForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. John Deere Tractor" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select value={infraForm.status} onChange={e => setInfraForm({ ...infraForm, status: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            <option value="OPERATIONAL">Operational</option>
                                            <option value="NEEDS_REPAIR">Needs Repair</option>
                                            <option value="UNDER_MAINTENANCE">Maintenance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                        <input type="text" value={infraForm.location} onChange={e => setInfraForm({ ...infraForm, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Value (PKR)</label>
                                        <input type="number" value={infraForm.value} onChange={e => setInfraForm({ ...infraForm, value: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                                        <input type="date" value={infraForm.purchaseDate} onChange={e => setInfraForm({ ...infraForm, purchaseDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button onClick={() => { setViewMode('LIST'); setEditingInfra(null); }} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                    <button onClick={handleInfraSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">{editingInfra ? 'Update Asset' : 'Create Asset'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* --- DIET PLAN CONTENT --- */}
            {activeTab === 'DIET' && (
                <>
                    {viewMode === 'LIST' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-end">
                                <button onClick={openAddDiet} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium">
                                    <Plus size={16} /> Create Plan
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {state.dietPlans.map(plan => (
                                    <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="p-6 border-b border-gray-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                                        <Utensils size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 text-lg">{plan.name}</h3>
                                                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit mt-1">
                                                            <CalendarClock size={10} /> {plan.scheduleType} SCHEDULE
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEditDiet(plan)} className="text-gray-400 hover:text-emerald-600"><Edit2 size={16} /></button>
                                                    <button onClick={() => { if (confirm('Delete this diet plan?')) onDeleteDietPlan(plan.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed mb-4 h-32 overflow-y-auto custom-scrollbar">
                                                {plan.description}
                                            </div>

                                            <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-50">
                                                <span className="flex items-center gap-1"><Beef size={14} /> {plan.assignedAnimalIds.length} Animals Assigned</span>
                                                <button onClick={() => openEditDiet(plan)} className="text-emerald-600 font-medium text-xs hover:underline">Manage Assignments</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {state.dietPlans.length === 0 && (
                                    <div className="col-span-full p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                                        <Utensils className="mx-auto text-gray-300 mb-2" size={48} />
                                        <p className="text-gray-500">No diet plans created yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in max-w-4xl mx-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-800">{editingDiet ? 'Edit Diet Plan' : 'Create Nutrition Plan'}</h3>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                                        <input type="text" value={dietForm.name} onChange={e => setDietForm({ ...dietForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. High Protein Finisher" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
                                        <select value={dietForm.scheduleType} onChange={e => setDietForm({ ...dietForm, scheduleType: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            <option value="DAILY">Daily Routine</option>
                                            <option value="WEEKLY">Weekly Plan</option>
                                            <option value="MONTHLY">Monthly Target</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Details / Chart</label>
                                    <textarea
                                        value={dietForm.description}
                                        onChange={e => setDietForm({ ...dietForm, description: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none h-40 font-mono text-sm"
                                        placeholder={`Time | Feed Type | Quantity\n----------------------------\n07:00 | Silage    | 5kg\n12:00 | Grazing   | Free\n18:00 | Hay Mix   | 3kg`}
                                    ></textarea>
                                    <p className="text-xs text-gray-400 mt-2">Enter the schedule, quantities, or chart details here.</p>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Beef size={18} /> Assign Animals</h4>
                                    <p className="text-sm text-gray-500 mb-4">Select which animals are following this diet plan.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        {state.livestock.filter(l => l.status === 'ACTIVE').map(animal => (
                                            <label key={animal.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded cursor-pointer hover:bg-emerald-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={dietForm.assignedAnimalIds?.includes(animal.id) || false}
                                                    onChange={() => toggleAnimalAssignment(animal.id)}
                                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                                                />
                                                <div>
                                                    <div className="font-bold text-xs text-gray-800">{animal.tagId}</div>
                                                    <div className="text-[10px] text-gray-500">{animal.breed} • {animal.category}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                    <button onClick={handleDietSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">Save Plan</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};


import React, { useState } from 'react';
import { Entity, EntityType, LedgerRecord } from '../types';
import { Plus, User, Truck, Store, Phone, MapPin, FileText, ArrowLeft, ArrowRight, Wallet, History } from 'lucide-react';

interface Props {
    entities: Entity[];
    ledger: LedgerRecord[];
    onAddEntity: (e: Entity) => void;
    onUpdateEntity: (e: Entity) => void;
    onDeleteEntity: (id: string) => void;
    onAddPayment: (p: { entityId: string, amount: number, date: string, notes?: string }) => void;
}

export const EntityManager: React.FC<Props> = ({ entities, ledger, onAddEntity, onUpdateEntity, onDeleteEntity, onAddPayment }) => {
    const [activeTab, setActiveTab] = useState<EntityType>('VENDOR');
    const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'LEDGER'>('LIST');
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

    const [form, setForm] = useState<Partial<Entity>>({
        type: 'VENDOR',
        status: 'ACTIVE',
        openingBalance: 0,
        currentBalance: 0,
        name: '',
        contact: '',
        address: ''
    });

    const selectedEntity = entities.find(e => e.id === selectedEntityId);
    const entityLedger = ledger.filter(l => l.entityId === selectedEntityId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSave = () => {
        if (!form.name || !form.contact) return alert("Name and Contact are required");

        const newEntity: Entity = {
            id: form.id || Math.random().toString(36).substr(2, 9),
            type: form.type || activeTab,
            name: form.name,
            contact: form.contact,
            address: form.address,
            email: form.email,
            status: form.status || 'ACTIVE',
            openingBalance: Number(form.openingBalance) || 0,
            currentBalance: Number(form.currentBalance) || Number(form.openingBalance) || 0,
            notes: form.notes
        };

        if (form.id) {
            onUpdateEntity(newEntity);
        } else {
            onAddEntity(newEntity);
        }
        setViewMode('LIST');
        setForm({ type: activeTab, status: 'ACTIVE', openingBalance: 0, currentBalance: 0, name: '', contact: '', address: '' });
    };

    const getTypeIcon = (type: EntityType) => {
        switch (type) {
            case 'VENDOR': return <Store size={18} />;
            case 'CUSTOMER': return <User size={18} />;
            case 'PALAI_CLIENT': return <Wallet size={18} />;
        }
    };

    const openLedger = (id: string) => {
        setSelectedEntityId(id);
        setViewMode('LEDGER');
    };

    if (viewMode === 'LEDGER' && selectedEntity) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{selectedEntity.name}</h2>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            {getTypeIcon(selectedEntity.type)} {selectedEntity.type} • {selectedEntity.contact}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-6">
                        <button onClick={() => {
                            const amount = prompt("Enter Payment Amount (PKR):");
                            if (amount) {
                                const notes = prompt("Notes / Reference:");
                                onAddPayment({
                                    entityId: selectedEntity.id,
                                    amount: parseFloat(amount),
                                    date: new Date().toISOString().split('T')[0],
                                    notes: notes || undefined
                                });
                            }
                        }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                            <Plus size={16} /> New Transaction
                        </button>
                        <div className="text-right">
                            <p className="text-xs uppercase font-bold text-gray-400">Current Balance</p>
                            <p className={`text-xl font-black ${selectedEntity.currentBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                PKR {Math.abs(selectedEntity.currentBalance).toLocaleString()} {selectedEntity.currentBalance < 0 ? '(Payable)' : '(Receivable)'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit (+)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit (-)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {entityLedger.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions found</td></tr>
                            )}
                            {entityLedger.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold bg-gray-50 rounded text-gray-500">{record.referenceType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{record.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                                        {record.debit > 0 ? record.debit.toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                                        {record.credit > 0 ? record.credit.toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                                        {record.balanceAfter.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (viewMode === 'FORM') {
        return (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">{form.id ? 'Edit' : 'Add'} {activeTab}</h2>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Name</label>
                            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Al-Madina Feed Store" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Contact / Phone</label>
                            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="0300-1234567" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Address</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Shop 12, Grain Market..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Opening Balance (PKR)</label>
                            <input type="number" disabled={!!form.id} className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: parseFloat(e.target.value) })} />
                            <p className="text-xs text-gray-400 mt-1">Use negative for quantity you owe (Payable).</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Email (Optional)</label>
                            <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Notes</label>
                        <textarea className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-500 hover:text-gray-800 font-bold">CANCEL</button>
                        <button onClick={handleSave} className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100">SAVE RECORD</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Entity Registry</h2>
                <button
                    onClick={() => {
                        setForm({ type: activeTab, status: 'ACTIVE', openingBalance: 0, currentBalance: 0, name: '', contact: '', address: '' });
                        setViewMode('FORM');
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                >
                    <Plus size={18} /> ADD NEW {activeTab}
                </button>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['VENDOR', 'CUSTOMER', 'PALAI_CLIENT'] as EntityType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.replace('_', ' ')}S
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {entities.filter(e => e.type === activeTab).map(entity => (
                    <div key={entity.id} onClick={() => openLedger(entity.id)} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${entity.type === 'VENDOR' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {getTypeIcon(entity.type)}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${entity.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{entity.status}</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-emerald-600 transition-colors">{entity.name}</h3>
                        <div className="space-y-2 mb-6">
                            <p className="text-xs text-gray-500 flex items-center gap-2"><Phone size={14} /> {entity.contact}</p>
                            {entity.address && <p className="text-xs text-gray-500 flex items-center gap-2"><MapPin size={14} /> {entity.address}</p>}
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Balance</p>
                                <p className={`text-lg font-black ${entity.currentBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {Math.abs(entity.currentBalance).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setForm(entity); setViewMode('FORM'); }}
                                    className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                >
                                    <FileText size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openLedger(entity.id); }}
                                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                >
                                    <History size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {entities.filter(e => e.type === activeTab).length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 font-bold">No {activeTab.replace('_', ' ').toLowerCase()}s found.</p>
                        <button onClick={() => setViewMode('FORM')} className="text-emerald-600 font-bold text-sm mt-2 hover:underline">Add First Record</button>
                    </div>
                )}
            </div>
        </div>
    );
};

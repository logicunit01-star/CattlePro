import React, { useState } from 'react';
import { User, Settings as SettingsIcon, Shield, Key, Bell, Save, Mail, Briefcase, Database, Users, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';

import { Location, Farm } from '../types';

interface UserRole {
    id: string;
    name: string;
    email: string;
    role: 'SUPERADMIN' | 'MANAGER' | 'WORKER' | 'VIEWER';
    status: 'ACTIVE' | 'INACTIVE';
    lastLogin: string;
}

const initialUsers: UserRole[] = [
    { id: '1', name: 'SuperAdmin User', email: 'admin@cattleops.com', role: 'SUPERADMIN', status: 'ACTIVE', lastLogin: '2026-02-28 10:00 AM' },
    { id: '2', name: 'Farm Manager', email: 'manager@cattleops.com', role: 'MANAGER', status: 'ACTIVE', lastLogin: '2026-02-27 04:30 PM' },
    { id: '3', name: 'Worker One', email: 'worker@cattleops.com', role: 'WORKER', status: 'ACTIVE', lastLogin: '2026-02-28 08:15 AM' }
];

interface SettingsProps {
    locations?: Location[];
    farms?: Farm[];
    currentLocationId?: string | null;
    currentFarmId?: string | null;
    onSetLocation?: (id: string | null) => void;
    onSetFarm?: (id: string | null) => void;
    onSyncLocations?: () => void;
    onAddCity?: () => void;
    onAddFarm?: () => void;
}

export const SettingsModule: React.FC<SettingsProps> = ({
    locations = [],
    farms = [],
    currentLocationId,
    currentFarmId,
    onSetLocation,
    onSetFarm,
    onSyncLocations,
    onAddCity,
    onAddFarm
}) => {
    const [activeDrawer, setActiveDrawer] = useState<'NONE' | 'GENERAL' | 'USERS' | 'SECURITY' | 'API'>('NONE');
    const [users, setUsers] = useState<UserRole[]>(initialUsers);

    const DrawerTemplate = ({ title, icon: Icon, children }: any) => (
        <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${activeDrawer !== 'NONE' ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                            <Icon size={24} className="text-slate-700" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 font-display">{title}</h2>
                    </div>
                    <button onClick={() => setActiveDrawer('NONE')} className="text-slate-400 hover:text-slate-700 font-bold px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                        Close
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    {children}
                </div>
                <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
                    <button onClick={() => setActiveDrawer('NONE')} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
                    <button onClick={() => setActiveDrawer('NONE')} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-200">Save Changes</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10 max-w-6xl mx-auto mt-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display flex items-center gap-3">
                        <SettingsIcon size={28} className="text-slate-500" />
                        Configuration Hub
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage your enterprise instance setup and security.</p>
                </div>
            </div>

            {/* Location & Farm Settings Panel */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 premium-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Briefcase size={20} className="text-emerald-600"/> Global Context Setup</h3>
                        <p className="text-sm text-slate-500 mt-1">Select the active city and farm to filter the dashboard, or sync manually if data is missing.</p>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
                        <div className="flex gap-2 w-full">
                            <select
                                value={currentLocationId || ''}
                                onChange={(e) => onSetLocation && onSetLocation(e.target.value || null)}
                                className="flex-1 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                            >
                                <option value="">All Cities</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            {onAddCity && (
                                <button onClick={onAddCity} className="p-3 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition-colors shrink-0 font-bold text-sm" title="Add City">
                                    + City
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 w-full">
                            <select
                                value={currentFarmId || ''}
                                onChange={(e) => onSetFarm && onSetFarm(e.target.value || null)}
                                className="flex-1 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                            >
                                <option value="">{currentLocationId ? 'All Farms in City' : 'All Farms (Global)'}</option>
                                {farms.filter(f => !currentLocationId || f.locationId === currentLocationId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            {onAddFarm && (
                                <button onClick={onAddFarm} className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors shrink-0 font-bold text-sm" title="Add Farm">
                                    + Farm
                                </button>
                            )}
                        </div>
                        <button onClick={onSyncLocations} className="p-3 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition-colors shrink-0 flex items-center gap-2 font-bold text-sm" title="Manual Sync">
                            <Database size={16} /> Sync
                        </button>
                    </div>
                </div>
            </div>

            {/* Mandatory Setup Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div onClick={() => setActiveDrawer('GENERAL')} className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 hover:border-emerald-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Briefcase size={24} /></div>
                        <CheckCircle size={20} className="text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">General Profile</h3>
                    <p className="text-sm text-slate-500 mt-1">Company name & currency</p>
                </div>

                <div onClick={() => setActiveDrawer('USERS')} className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 hover:border-blue-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
                        <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">{users.length} Users</div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Team Access</h3>
                    <p className="text-sm text-slate-500 mt-1">Roles & permissions</p>
                </div>

                <div onClick={() => setActiveDrawer('SECURITY')} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-slate-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Shield size={24} /></div>
                        <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Security & Auth</h3>
                    <p className="text-sm text-slate-500 mt-1">2FA & Audit logs</p>
                </div>

                <div onClick={() => setActiveDrawer('API')} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-slate-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Database size={24} /></div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">API Integrations</h3>
                    <p className="text-sm text-slate-500 mt-1">Webhooks & tokens</p>
                </div>
            </div>

            {/* List Format for other settings */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 font-display">System Status</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                            <p className="font-bold text-slate-800">Data Backup</p>
                            <p className="text-sm text-slate-500">Automated daily backups to secure cloud.</p>
                        </div>
                        <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Active</span>
                    </div>
                    <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                            <p className="font-bold text-slate-800">Chronological Ledger</p>
                            <p className="text-sm text-slate-500">Strict double-entry accounting mode.</p>
                        </div>
                        <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Enforced</span>
                    </div>
                </div>
            </div>

            {/* Drawers backdrop */}
            {activeDrawer !== 'NONE' && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setActiveDrawer('NONE')}></div>
            )}

            {/* General Drawer */}
            {activeDrawer === 'GENERAL' && (
                <DrawerTemplate title="General Profile" icon={Briefcase}>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Company / Instance Name</label>
                            <input type="text" className="input-premium" defaultValue="GoatUnit Livestock" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Default Currency</label>
                            <select className="input-premium">
                                <option value="PKR">PKR (Pakistani Rupee)</option>
                                <option value="USD">USD (US Dollar)</option>
                                <option value="EUR">EUR (Euro)</option>
                            </select>
                        </div>
                    </div>
                </DrawerTemplate>
            )}

            {/* Users Drawer */}
            {activeDrawer === 'USERS' && (
                <DrawerTemplate title="Team Access" icon={Users}>
                    <div className="space-y-6">
                        <button className="w-full py-4 border-2 border-dashed border-emerald-200 bg-emerald-50 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2">
                            + Invite New Member
                        </button>
                        
                        <div className="space-y-3">
                            {users.map(u => (
                                <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{u.name}</p>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                        u.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {u.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </DrawerTemplate>
            )}

            {/* Security Drawer */}
            {(activeDrawer === 'SECURITY' || activeDrawer === 'API') && (
                <DrawerTemplate title={activeDrawer === 'SECURITY' ? "Security Settings" : "API Integrations"} icon={activeDrawer === 'SECURITY' ? Shield : Database}>
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <Key size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-600">Advanced Module</h3>
                        <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm">This section is restricted in your current role. Contact the system administrator.</p>
                    </div>
                </DrawerTemplate>
            )}
        </div>
    );
};

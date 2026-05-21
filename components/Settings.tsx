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

const normalizeUser = (u: any): UserRole => ({
    id: String(u.id ?? u.userId ?? u.email ?? Math.random()),
    name: u.name ?? u.fullName ?? u.displayName ?? u.email ?? 'Unnamed User',
    email: u.email ?? '',
    role: (u.role ?? u.roleName ?? 'VIEWER') as UserRole['role'],
    status: (u.status ?? (u.enabled === false ? 'INACTIVE' : 'ACTIVE')) as UserRole['status'],
    lastLogin: u.lastLogin ?? u.lastLoginAt ?? 'Never'
});

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
        <div className="space-y-4 animate-fade-in max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight font-display flex items-center gap-3">
                        <SettingsIcon size={22} className="text-slate-500" />
                        Configuration Hub
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Manage your enterprise instance setup and security.</p>
                </div>
            </div>

            {/* Location & Farm Settings Panel */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 premium-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2"><Briefcase size={18} className="text-emerald-600" /> Global Context Setup</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Select the active city and farm to filter the dashboard, or sync manually if data is missing.</p>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full">
                        <div className="flex gap-2 w-full">
                            <select
                                value={currentLocationId || ''}
                                onChange={(e) => onSetLocation && onSetLocation(e.target.value || null)}
                                className="flex-1 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                            >
                                <option value="">All Cities</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            {onAddCity && (
                                <button onClick={onAddCity} className="px-3 py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors shrink-0 font-bold text-sm" title="Add City">
                                    + City
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 w-full">
                            <select
                                value={currentFarmId || ''}
                                onChange={(e) => onSetFarm && onSetFarm(e.target.value || null)}
                                className="flex-1 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                            >
                                <option value="">{currentLocationId ? 'All Farms in City' : 'All Farms (Global)'}</option>
                                {farms.filter(f => !currentLocationId || f.locationId === currentLocationId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            {onAddFarm && (
                                <button onClick={onAddFarm} className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shrink-0 font-bold text-sm" title="Add Farm">
                                    + Farm
                                </button>
                            )}
                        </div>
                        <button onClick={onSyncLocations} className="px-3 py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors shrink-0 flex items-center gap-2 font-bold text-sm" title="Manual Sync">
                            <Database size={14} /> Sync
                        </button>
                    </div>
                </div>
            </div>

            {/* Mandatory Setup Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div onClick={() => setActiveDrawer('GENERAL')} className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 hover:border-emerald-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl group-hover:scale-110 transition-transform"><Briefcase size={18} /></div>
                        <CheckCircle size={18} className="text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">General Profile</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Company name & currency</p>
                </div>

                <div onClick={() => setActiveDrawer('USERS')} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 hover:border-blue-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform"><Users size={18} /></div>
                        <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{users.length} Users</div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Team Access</h3>
                    <p className="text-sm text-slate-500 mt-1">Roles & permissions</p>
                </div>

                <div onClick={() => setActiveDrawer('SECURITY')} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-slate-100 text-slate-600 p-2 rounded-xl group-hover:scale-110 transition-transform"><Shield size={18} /></div>
                        <AlertTriangle size={18} className="text-amber-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Security & Auth</h3>
                    <p className="text-xs text-slate-500 mt-0.5">2FA & Audit logs</p>
                </div>

                <div onClick={() => setActiveDrawer('API')} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 premium-card cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-slate-100 text-slate-600 p-2 rounded-xl group-hover:scale-110 transition-transform"><Database size={18} /></div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">API Integrations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Webhooks & tokens</p>
                </div>
            </div>

            {/* List Format for other settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800 font-display text-sm">System Status</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    <div className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Data Backup</p>
                            <p className="text-xs text-slate-500">Automated daily backups to secure cloud.</p>
                        </div>
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Active</span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Chronological Ledger</p>
                            <p className="text-xs text-slate-500">Strict double-entry accounting mode.</p>
                        </div>
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Enforced</span>
                    </div>
                </div>
            </div>

            {/* Legacy Tag Migration Panel — for companies with animals tagged in the old EX-<CAT>-<N> format. */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Tag size={16} className="text-amber-600" />
                    <h3 className="font-bold text-slate-800 font-display text-sm">Legacy Tag Migration</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm text-slate-700 font-medium">
                                Rewrites old-format animal tags (e.g. <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700">EX-BR-1</code>) into the new species-aware format (<code className="bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-700">EX-CT-BR-1</code> for cattle, <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-700">EX-GT-BR-1</code> for goats).
                            </p>
                            <p className="text-xs text-slate-500 mt-1.5">
                                Run <strong>Preview</strong> first to see the proposed changes. The operation is idempotent — running it after migration is a no-op.
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={handlePreviewMigration}
                                disabled={migrationBusy !== false}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold rounded-lg text-sm flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw size={14} className={migrationBusy === 'preview' ? 'animate-spin' : ''} />
                                {migrationBusy === 'preview' ? 'Scanning…' : 'Preview'}
                            </button>
                            {migrationReport && !migrationApplied && migrationReport.migratedCount > 0 && (
                                <button
                                    onClick={handleApplyMigration}
                                    disabled={migrationBusy !== false}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm shadow-sm transition-colors"
                                >
                                    {migrationBusy === 'apply' ? 'Applying…' : 'Apply Migration'}
                                </button>
                            )}
                        </div>
                    </div>

                    {migrationReport && (
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Animals</p>
                                    <p className="text-lg font-extrabold text-slate-800">{migrationReport.totalAnimals}</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Already Migrated</p>
                                    <p className="text-lg font-extrabold text-emerald-800">{migrationReport.alreadyNewFormat}</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{migrationApplied ? 'Migrated' : 'Will Migrate'}</p>
                                    <p className="text-lg font-extrabold text-amber-800">{migrationReport.migratedCount}</p>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Renumbered</p>
                                    <p className="text-lg font-extrabold text-indigo-800">{migrationReport.renumberedCount}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Skipped</p>
                                    <p className="text-lg font-extrabold text-slate-700">{migrationReport.skippedCount}</p>
                                </div>
                            </div>

                            {migrationApplied && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                                    <p className="text-sm font-bold text-emerald-800">Migration applied successfully. Refresh the Livestock module to see the updated tags.</p>
                                </div>
                            )}

                            {migrationReport.migrated.length > 0 && (
                                <details className="border border-slate-200 rounded-lg overflow-hidden" open>
                                    <summary className="px-3 py-2 bg-slate-50 cursor-pointer font-bold text-xs text-slate-700 uppercase tracking-wider">
                                        Tag Changes ({migrationReport.migrated.length})
                                    </summary>
                                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                                        {migrationReport.migrated.map((row, idx) => (
                                            <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="font-mono text-slate-400 line-through truncate">{row.oldTag}</span>
                                                    <ChevronRight size={12} className="text-slate-400 shrink-0" />
                                                    <span className="font-mono font-bold text-emerald-700 truncate">{row.newTag}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 ml-2">
                                                    {row.species} · {row.category}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {migrationReport.renumbered.length > 0 && (
                                <details className="border border-indigo-200 rounded-lg overflow-hidden">
                                    <summary className="px-3 py-2 bg-indigo-50 cursor-pointer font-bold text-xs text-indigo-700 uppercase tracking-wider">
                                        Renumbered Due to Collision ({migrationReport.renumbered.length})
                                    </summary>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-indigo-100">
                                        {migrationReport.renumbered.map((row, idx) => (
                                            <div key={idx} className="px-3 py-2 text-xs hover:bg-indigo-50">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-slate-400 line-through">{row.oldTag}</span>
                                                    <ChevronRight size={12} className="text-slate-400" />
                                                    <span className="font-mono font-bold text-indigo-700">{row.newTag}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{row.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {migrationReport.skipped.length > 0 && (
                                <details className="border border-slate-200 rounded-lg overflow-hidden">
                                    <summary className="px-3 py-2 bg-slate-50 cursor-pointer font-bold text-xs text-slate-600 uppercase tracking-wider">
                                        Skipped ({migrationReport.skipped.length})
                                    </summary>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {migrationReport.skipped.map((row, idx) => (
                                            <div key={idx} className="px-3 py-2 text-xs">
                                                <span className="font-mono text-slate-600">{row.oldTag || '(blank)'}</span>
                                                <span className="text-slate-500"> — {row.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
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
                        <button onClick={inviteUser} className="w-full py-4 border-2 border-dashed border-emerald-200 bg-emerald-50 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2">
                            + Invite New Member
                        </button>
                        {usersLoading && <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-500">Loading team access...</div>}
                        {usersError && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-center justify-between gap-3">
                                <span>{usersError}</span>
                                <button onClick={loadUsers} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">Retry</button>
                            </div>
                        )}

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
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${u.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {u.role}
                                    </span>
                                </div>
                            ))}
                            {!usersLoading && !usersError && users.length === 0 && (
                                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                    <Users size={32} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm font-bold text-slate-500">No users returned by the backend.</p>
                                </div>
                            )}
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

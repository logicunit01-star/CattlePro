import React, { useEffect, useState } from 'react';
import { User, Settings as SettingsIcon, Shield, Key, Bell, Save, Mail, Briefcase, Database, Users, ChevronRight, CheckCircle, AlertTriangle, Tag, RefreshCw, Edit2, Trash2, Power, FileSearch } from 'lucide-react';

import { Location, Farm } from '../types';
import { backendService } from '../services/backendService';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

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
    const toast = useToast();
    const { confirm, prompt } = useConfirm();
    const [activeDrawer, setActiveDrawer] = useState<'NONE' | 'GENERAL' | 'USERS' | 'SECURITY' | 'API'>('NONE');
    const [users, setUsers] = useState<UserRole[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
    const [notificationPrefs, setNotificationPrefs] = useState({
        lowStock: true,
        animalHealth: true,
        finance: true,
        palai: true,
        email: false,
        push: true,
    });
    const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);
    const [migrationBusy, setMigrationBusy] = useState<false | 'preview' | 'apply'>(false);
    const [migrationReport, setMigrationReport] = useState<Awaited<ReturnType<typeof backendService.migrateLegacyTags>> | null>(null);
    const [migrationApplied, setMigrationApplied] = useState(false);

    const loadUsers = async () => {
        setUsersLoading(true);
        setUsersError(null);
        try {
            const rows = await backendService.getUsers();
            setUsers(Array.isArray(rows) ? rows.map(normalizeUser) : []);
        } catch (e: any) {
            setUsers([]);
            setUsersError(e?.message || 'Unable to load team users.');
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const refreshContext = async (message: string) => {
        await onSyncLocations?.();
        toast.success(message);
    };

    const editLocation = async (location: Location) => {
        setEditingLocation({ ...location });
    };

    const deactivateLocation = async (location: Location) => {
        const ok = await confirm({ title: 'Deactivate city', message: 'Deactivate this city? Linked records remain preserved on the backend.', confirmLabel: 'Deactivate', danger: true });
        if (!ok) return;
        await backendService.patchLocationStatus(location.id, 'INACTIVE');
        await refreshContext('City deactivated.');
    };

    const removeLocation = async (location: Location) => {
        const ok = await confirm({ title: 'Delete city', message: 'Delete this city only if the backend confirms it has no linked farms or records.', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        await backendService.deleteLocation(location.id);
        await refreshContext('City deleted.');
    };

    const editFarm = async (farm: Farm) => {
        setEditingFarm({ ...farm });
    };

    const saveLocationForm = async () => {
        if (!editingLocation?.name.trim()) { toast.warning('City name is required.'); return; }
        await backendService.updateLocation(editingLocation.id, editingLocation);
        setEditingLocation(null);
        await refreshContext('City updated.');
    };

    const saveFarmForm = async () => {
        if (!editingFarm?.name.trim()) { toast.warning('Farm name is required.'); return; }
        if (!editingFarm.locationId) { toast.warning('Farm city is required.'); return; }
        await backendService.updateFarm(editingFarm.id, editingFarm);
        setEditingFarm(null);
        await refreshContext('Farm updated.');
    };

    const saveNotificationPreferences = async () => {
        setSavingNotificationPrefs(true);
        try {
            await backendService.updateNotificationPreferences(notificationPrefs);
            toast.success('Notification preferences saved.');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save notification preferences.');
        } finally {
            setSavingNotificationPrefs(false);
        }
    };

    const deactivateFarm = async (farm: Farm) => {
        const ok = await confirm({ title: 'Deactivate farm', message: 'Deactivate this farm? Linked livestock, inventory, and ledger records remain preserved on the backend.', confirmLabel: 'Deactivate', danger: true });
        if (!ok) return;
        await backendService.patchFarmStatus(farm.id, 'INACTIVE');
        await refreshContext('Farm deactivated.');
    };

    const removeFarm = async (farm: Farm) => {
        const ok = await confirm({ title: 'Delete farm', message: 'Delete this farm only if the backend confirms it has no linked operational or financial records.', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        await backendService.deleteFarm(farm.id);
        await refreshContext('Farm deleted.');
    };

    const loadAuditLogs = async () => {
        setAuditLoading(true);
        setAuditError(null);
        try {
            const rows = await backendService.getAuditLogs({ limit: 50 });
            setAuditLogs(Array.isArray(rows) ? rows : []);
        } catch (e: any) {
            setAuditLogs([]);
            setAuditError(e?.message || 'Unable to load audit logs.');
        } finally {
            setAuditLoading(false);
        }
    };

    useEffect(() => {
        if (activeDrawer === 'SECURITY') loadAuditLogs();
    }, [activeDrawer]);

    const inviteUser = async () => {
        const email = await prompt({ title: 'Invite team member', label: 'Email', inputType: 'text' });
        if (!email) return;
        const name = await prompt({ title: 'Invite team member', label: 'Name', inputType: 'text', defaultValue: email, allowEmpty: true }) || email;
        try {
            const created = await backendService.createUser({ email, name, role: 'VIEWER', status: 'ACTIVE' });
            setUsers(prev => [...prev, normalizeUser(created)]);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to invite user.');
        }
    };

    const handlePreviewMigration = async () => {
        setMigrationBusy('preview');
        try {
            setMigrationReport(await backendService.migrateLegacyTags(true));
            setMigrationApplied(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to preview tag migration.');
        } finally {
            setMigrationBusy(false);
        }
    };

    const handleApplyMigration = async () => {
        setMigrationBusy('apply');
        try {
            setMigrationReport(await backendService.migrateLegacyTags(false));
            setMigrationApplied(true);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to apply tag migration.');
        } finally {
            setMigrationBusy(false);
        }
    };

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm">Cities</h3>
                        <span className="text-[10px] font-black uppercase text-slate-400">{locations.length} total</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {locations.map(location => (
                            <div key={location.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{location.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{location.type || 'CITY'} · {(location as any).status || 'ACTIVE'}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => void editLocation(location).catch((e: any) => toast.error(e?.message || 'Failed to update city.'))} className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Edit city"><Edit2 size={14} /></button>
                                    <button onClick={() => void deactivateLocation(location).catch((e: any) => toast.error(e?.message || 'Failed to deactivate city.'))} className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg" title="Deactivate city"><Power size={14} /></button>
                                    <button onClick={() => void removeLocation(location).catch((e: any) => toast.error(e?.message || 'Failed to delete city.'))} className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg" title="Delete city"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {locations.length === 0 && <div className="p-6 text-center text-sm font-bold text-slate-400">No cities configured.</div>}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-sm">Farms</h3>
                        <span className="text-[10px] font-black uppercase text-slate-400">{farms.length} total</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {farms.filter(f => !currentLocationId || f.locationId === currentLocationId).map(farm => (
                            <div key={farm.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{farm.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{farm.type} · {(farm as any).status || 'ACTIVE'}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => void editFarm(farm).catch((e: any) => toast.error(e?.message || 'Failed to update farm.'))} className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Edit farm"><Edit2 size={14} /></button>
                                    <button onClick={() => void deactivateFarm(farm).catch((e: any) => toast.error(e?.message || 'Failed to deactivate farm.'))} className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg" title="Deactivate farm"><Power size={14} /></button>
                                    <button onClick={() => void removeFarm(farm).catch((e: any) => toast.error(e?.message || 'Failed to delete farm.'))} className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg" title="Delete farm"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {farms.filter(f => !currentLocationId || f.locationId === currentLocationId).length === 0 && <div className="p-6 text-center text-sm font-bold text-slate-400">No farms in this context.</div>}
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
                    {activeDrawer === 'SECURITY' ? (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileSearch size={16} className="text-slate-500" />
                                        <h3 className="font-bold text-slate-800 text-sm">Audit Logs</h3>
                                    </div>
                                    <button onClick={loadAuditLogs} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100">Refresh</button>
                                </div>
                                {auditLoading && <div className="p-5 text-sm font-bold text-slate-500">Loading audit logs...</div>}
                                {auditError && <div className="m-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{auditError}</div>}
                                {!auditLoading && !auditError && auditLogs.length === 0 && (
                                    <div className="p-8 text-center text-slate-400">
                                        <FileSearch size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm font-bold">No audit events returned.</p>
                                    </div>
                                )}
                                {!auditLoading && !auditError && auditLogs.length > 0 && (
                                    <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                                        {auditLogs.map((row, idx) => (
                                            <div key={row.id ?? idx} className="px-5 py-3 hover:bg-slate-50">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-black text-slate-800 text-xs uppercase">{row.action ?? row.eventType ?? row.type ?? 'AUDIT_EVENT'}</p>
                                                    <span className="text-[10px] font-bold text-slate-400">{row.createdAt ?? row.timestamp ?? row.date ?? ''}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{row.entityType ?? row.module ?? 'Entity'} {row.entityId ? `· ${row.entityId}` : ''}</p>
                                                {(row.actorName || row.actor || row.userName) && <p className="text-[11px] text-slate-400 mt-1">Actor: {row.actorName ?? row.actor ?? row.userName}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                    <Bell size={16} className="text-slate-500" />
                                    <h3 className="font-bold text-slate-800 text-sm">Notification Preferences</h3>
                                </div>
                                <div className="p-5 space-y-3">
                                    {[
                                        ['lowStock', 'Low stock alerts'],
                                        ['animalHealth', 'Animal health and due dates'],
                                        ['finance', 'Finance and payment reminders'],
                                        ['palai', 'Palai invoice and assignment updates'],
                                        ['email', 'Email delivery'],
                                        ['push', 'Push/device delivery'],
                                    ].map(([key, label]) => (
                                        <label key={key} className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                                            <span className="text-sm font-bold text-slate-700">{label}</span>
                                            <input
                                                type="checkbox"
                                                checked={(notificationPrefs as any)[key]}
                                                onChange={e => setNotificationPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                        </label>
                                    ))}
                                    <button onClick={saveNotificationPreferences} disabled={savingNotificationPrefs} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
                                        {savingNotificationPrefs ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                            <div className="text-center py-10 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                <Key size={36} className="mx-auto text-slate-300 mb-3" />
                                <h3 className="text-base font-bold text-slate-600">API Tokens</h3>
                                <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm">Webhook and token management remains restricted until backend exposes permission-aware current-user metadata.</p>
                            </div>
                        </div>
                    )}
                </DrawerTemplate>
            )}

            {(editingLocation || editingFarm) && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => { setEditingLocation(null); setEditingFarm(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-black text-slate-800">{editingLocation ? 'Edit City' : 'Edit Farm'}</h3>
                            <button onClick={() => { setEditingLocation(null); setEditingFarm(null); }} className="text-slate-400 hover:text-slate-700 font-bold">Close</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {editingLocation && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City Name</label>
                                        <input value={editingLocation.name} onChange={e => setEditingLocation({ ...editingLocation, name: e.target.value })} className="input-premium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                        <select value={editingLocation.type} onChange={e => setEditingLocation({ ...editingLocation, type: e.target.value as Location['type'] })} className="input-premium">
                                            <option value="CITY">City</option>
                                            <option value="REGION">Region</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                        <select value={(editingLocation as any).status || 'ACTIVE'} onChange={e => setEditingLocation({ ...(editingLocation as any), status: e.target.value })} className="input-premium">
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {editingFarm && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Farm Name</label>
                                        <input value={editingFarm.name} onChange={e => setEditingFarm({ ...editingFarm, name: e.target.value })} className="input-premium" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City</label>
                                            <select value={editingFarm.locationId} onChange={e => setEditingFarm({ ...editingFarm, locationId: e.target.value })} className="input-premium">
                                                {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                            <select value={editingFarm.type} onChange={e => setEditingFarm({ ...editingFarm, type: e.target.value as Farm['type'] })} className="input-premium">
                                                <option value="DAIRY">Dairy</option>
                                                <option value="MEAT">Meat</option>
                                                <option value="MIXED">Mixed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                                            <input value={editingFarm.currency} onChange={e => setEditingFarm({ ...editingFarm, currency: e.target.value })} className="input-premium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Center</label>
                                            <input value={editingFarm.costCenterCode} onChange={e => setEditingFarm({ ...editingFarm, costCenterCode: e.target.value })} className="input-premium" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                        <select value={(editingFarm as any).status || 'ACTIVE'} onChange={e => setEditingFarm({ ...(editingFarm as any), status: e.target.value })} className="input-premium">
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => { setEditingLocation(null); setEditingFarm(null); }} className="px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-200">Cancel</button>
                            <button onClick={() => void (editingLocation ? saveLocationForm() : saveFarmForm()).catch((e: any) => toast.error(e?.message || 'Failed to save.'))} className="px-4 py-2 rounded-lg font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

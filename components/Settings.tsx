import React, { useState } from 'react';
import { User, Settings as SettingsIcon, Shield, Key, Bell, Save, Mail, Briefcase, Database, Users } from 'lucide-react';

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

export const SettingsModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'USERS' | 'API' | 'SECURITY'>('USERS');
    const [users, setUsers] = useState<UserRole[]>(initialUsers);

    return (
        <div className="space-y-6 animate-fade-in p-4 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-gray-100">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display flex items-center gap-3">
                        <SettingsIcon size={28} className="text-slate-500" />
                        System Settings
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage instance configuration, roles, and security.</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-700 transition-all uppercase tracking-widest">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-64 space-y-2 shrink-0">
                    <button onClick={() => setActiveTab('GENERAL')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-3"><Briefcase size={18} /> General System</div>
                    </button>
                    <button onClick={() => setActiveTab('USERS')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'USERS' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-3"><Users size={18} /> User Management</div>
                        <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{users.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('SECURITY')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'SECURITY' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-3"><Shield size={18} /> Security & Auth</div>
                    </button>
                    <button onClick={() => setActiveTab('API')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'API' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-3"><Database size={18} /> API Access</div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'USERS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 premium-card">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Shield size={18} className="text-emerald-500" /> Instance Administrators & Roles</h3>
                                    <p className="text-xs text-slate-500 mt-1">Manage who has access to this SaaS instance and their permissions.</p>
                                </div>
                                <button className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-emerald-100">
                                    + INVITE USER
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Profile</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Login</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {users.map(u => (
                                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                                {u.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{u.name}</p>
                                                                <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><Mail size={10} /> {u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${u.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                u.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {u.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium whitespace-nowrap">
                                                        {u.lastLogin}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6 animate-fade-in bg-white p-8 rounded-2xl shadow-sm border border-slate-100 premium-card">
                            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-6">Instance Preferences</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Company / Instance Name</label>
                                    <input type="text" className="w-full border-b-2 border-slate-200 focus:border-emerald-500 py-2 outline-none text-slate-800 font-bold" defaultValue="GoatUnit Livestock" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Default Currency</label>
                                    <select className="w-full border-b-2 border-slate-200 focus:border-emerald-500 py-2 outline-none text-slate-800 font-bold bg-transparent">
                                        <option value="PKR">PKR (Pakistani Rupee)</option>
                                        <option value="USD">USD (US Dollar)</option>
                                        <option value="EUR">EUR (Euro)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                                        <div>
                                            <span className="font-bold text-slate-700 block">Enable strict chronological accounting</span>
                                            <span className="text-xs text-slate-400">Enforces double-entry logging for all financial operations.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                                        <div>
                                            <span className="font-bold text-slate-700 block">Email Alerts for Tasks</span>
                                            <span className="text-xs text-slate-400">Receive summaries for upcoming vaccinations and breedings.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'SECURITY' || activeTab === 'API') && (
                        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Key size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-600">{activeTab} Controls</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-2 font-medium">This module is currently disabled in the demo environment. Contact support to enable advanced settings.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

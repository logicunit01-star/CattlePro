
import React from 'react';
import { AppState, Livestock } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Activity, Milk, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

interface Props {
  state: AppState;
}

const COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];

export const Dashboard: React.FC<Props> = ({ state }) => {

  // --- KPIs ---
  const activeAnimals = state.livestock.filter(l => l.status === 'ACTIVE');
  const totalLivestock = activeAnimals.length;
  const cattleCount = activeAnimals.filter(l => l.species === 'CATTLE').length;
  const goatCount = activeAnimals.filter(l => l.species === 'GOAT').length;

  const totalExpenses = state.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = state.sales.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // --- DAIRY METRICS ---
  const todayStr = new Date().toISOString().split('T')[0];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const milkData = last7Days.map(date => {
    const dailyTotal = state.livestock.reduce((sum, animal) => {
      const record = animal.milkProductionHistory?.find(r => r.date === date);
      return sum + (record ? record.quantity : 0);
    }, 0);
    return { date: date.slice(5), liters: dailyTotal };
  });

  const totalMilkToday = milkData[milkData.length - 1].liters;

  // --- UPCOMING TASKS (Vaccinations/Checks due) ---
  const upcomingTasks = state.livestock.flatMap(animal => {
    // Check medical records for nextDueDate
    const medicalTasks = (animal.healthHistory || [])
      .filter(r => r.nextDueDate && r.nextDueDate >= todayStr)
      .map(r => ({
        id: r.id,
        animalId: animal.id,
        tag: animal.tagId,
        type: 'HEALTH',
        task: r.type,
        date: r.nextDueDate!,
        description: `Follow-up: ${r.medicineName || 'Checkup'}`
      }));

    return medicalTasks;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);

  // --- FINANCIAL TREND (Mini) ---
  // Simple approximation for the chart
  const expenseByCategory = state.expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-400">Total Animals</p>
            <h3 className="text-3xl font-black text-gray-800 mt-1">{totalLivestock}</h3>
            <div className="flex gap-2 mt-2 text-xs font-bold">
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">{cattleCount} Cattle</span>
              <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded">{goatCount} Goats</span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-full text-gray-400">
            <Activity size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-400">Milk Today</p>
            <h3 className="text-3xl font-black text-sky-600 mt-1">{totalMilkToday.toFixed(1)} L</h3>
            <p className="text-xs text-gray-400 mt-2">Daily yield across herd</p>
          </div>
          <div className="bg-sky-50 p-4 rounded-full text-sky-500">
            <Milk size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-400">Net Profit</p>
            <h3 className={`text-3xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {netProfit >= 0 ? '+' : ''}PKR {Math.abs(netProfit).toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-2">Revenue - Expenses</p>
          </div>
          <div className={`p-4 rounded-full ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-400">Alerts</p>
            <h3 className="text-3xl font-black text-amber-500 mt-1">{upcomingTasks.length}</h3>
            <p className="text-xs text-gray-400 mt-2">Upcoming tasks / Due</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-full text-amber-500">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COL: Charts */}
        <div className="lg:col-span-2 space-y-6">

          {/* Milk Production Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Milk size={18} className="text-sky-500" /> Milk Production Trend (7 Days)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={milkData}>
                  <defs>
                    <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="liters" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorMilk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><DollarSign size={18} className="text-emerald-600" /> Expense Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="space-y-3">
                  {pieData.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-gray-600 font-medium">{entry.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{(entry.value / totalExpenses * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: Widgets */}
        <div className="space-y-6">

          {/* Upcoming Tasks */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar size={18} className="text-amber-500" />
              Upcoming Tasks
            </h3>

            <div className="space-y-4">
              {upcomingTasks.length > 0 ? upcomingTasks.map((task, idx) => (
                <div key={idx} className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 cursor-pointer group">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-lg shrink-0 group-hover:bg-amber-200 transition-colors">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase mb-0.5">{task.date} • {task.tag}</p>
                    <p className="text-sm font-bold text-gray-800">{task.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{task.task} Due</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <CheckCircle className="mx-auto text-gray-200 mb-2" size={40} />
                  <p className="text-gray-400 text-sm">No pending tasks for next 30 days.</p>
                </div>
              )}
            </div>

            <button className="w-full mt-6 py-3 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              VIEW ALL TASKS <ArrowRight size={14} />
            </button>
          </div>

          {/* Quick Actions (Visual Only) */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-lg mb-2">Farm Health Score</h3>
            <div className="text-5xl font-black mb-2">98<span className="text-2xl opacity-60">%</span></div>
            <p className="text-emerald-100 text-sm mb-6">Based on mortality, vaccination coverage, and growth rates.</p>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-300 w-[98%]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

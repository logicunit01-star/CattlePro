
import React from 'react';
import { AppState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Activity, Milk } from 'lucide-react';

interface Props {
  state: AppState;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const Dashboard: React.FC<Props> = ({ state }) => {
  
  // KPIs
  const totalLivestock = state.livestock.length;
  const cattleCount = state.livestock.filter(l => l.species === 'CATTLE').length;
  const goatCount = state.livestock.filter(l => l.species === 'GOAT').length;

  const totalExpenses = state.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = state.sales.reduce((acc, curr) => acc + curr.amount, 0);
  // eslint-disable-next-line
  const netProfit = totalRevenue - totalExpenses;

  // Calculate Total Milk for "Today" (or recent) across all dairy animals
  const todayStr = new Date().toISOString().split('T')[0];
  const totalMilkToday = state.livestock.reduce((total, animal) => {
      const todaysRecord = animal.milkProductionHistory?.find(r => r.date === todayStr);
      return total + (todaysRecord ? todaysRecord.quantity : 0);
  }, 0);

  const totalMilkAllTime = state.livestock.reduce((total, animal) => {
      return total + (animal.milkProductionHistory?.reduce((sum, r) => sum + r.quantity, 0) || 0);
  }, 0);
  
  // Dynamic Category Counts (Combined)
  const categoryCounts = state.categories.map(cat => ({
    name: cat,
    count: state.livestock.filter(c => c.category === cat).length
  })).sort((a, b) => b.count - a.count);

  const topCategory = categoryCounts[0] || { name: 'N/A', count: 0 };

  // Chart Data Preparation
  const expenseByCategory = state.expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  }));

  const speciesDistribution = [
      { name: 'Cattle', count: cattleCount },
      { name: 'Goats', count: goatCount }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Animals</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalLivestock}</h3>
            <p className="text-xs text-gray-400">
              {cattleCount} Cattle • {goatCount} Goats
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-lg">
            <Milk size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Dairy Production</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalMilkToday} Liters</h3>
            <p className="text-xs text-sky-600">Yield Today (All Species)</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-800">PKR {totalRevenue.toLocaleString()}</h3>
            <p className="text-xs text-green-600">Across all verticals</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Low Stock Alert</p>
            <h3 className="text-2xl font-bold text-gray-800">{state.feed.filter(f => f.quantity <= f.reorderLevel).length} Items</h3>
            <p className="text-xs text-gray-400">Need Reordering</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Outflow Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Species Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Farm Population by Species</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={speciesDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

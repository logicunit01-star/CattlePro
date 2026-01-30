
import React, { useState } from 'react';
import { Expense, ExpenseCategory, Sale, Livestock } from '../types';
import { Plus, DollarSign, Truck, Wrench, Syringe, Briefcase, Home, Stethoscope, Dna, ArrowLeft, Trash2 } from 'lucide-react';

interface Props {
  expenses: Expense[];
  sales: Sale[];
  livestockList?: Livestock[];
  onAddExpense: (e: Expense) => void;
  onAddSale: (s: Sale) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteSale: (id: string) => void;
}

type FinancialView = 'LIST' | 'ADD_EXPENSE' | 'ADD_SALE';

export const Financials: React.FC<Props> = ({ expenses, sales, livestockList = [], onAddExpense, onAddSale, onDeleteExpense, onDeleteSale }) => {
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'SALES'>('EXPENSES');
  const [viewMode, setViewMode] = useState<FinancialView>('LIST');

  // Forms State
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
      amount: 0, category: ExpenseCategory.OTHER, date: new Date().toISOString().split('T')[0], description: ''
  });

  const [newSale, setNewSale] = useState<Partial<Sale>>({
      amount: 0, date: new Date().toISOString().split('T')[0], buyer: '', weightAtSale: 0, animalId: ''
  });

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case ExpenseCategory.TRANSPORT: return <Truck size={16} />;
      case ExpenseCategory.MAINTENANCE: return <Wrench size={16} />;
      case ExpenseCategory.VACCINE: return <Syringe size={16} />;
      case ExpenseCategory.MEDICAL: return <Stethoscope size={16} />;
      case ExpenseCategory.BREEDING: return <Dna size={16} />;
      case ExpenseCategory.LABOR: return <Briefcase size={16} />;
      case ExpenseCategory.INFRASTRUCTURE: return <Home size={16} />;
      default: return <DollarSign size={16} />;
    }
  };

  const handleSaveExpense = () => {
      if(!newExpense.amount || !newExpense.description) return alert("Amount and Description required");
      onAddExpense({
          id: Math.random().toString(36).substr(2,9),
          category: newExpense.category || ExpenseCategory.OTHER,
          amount: Number(newExpense.amount),
          date: newExpense.date || new Date().toISOString().split('T')[0],
          description: newExpense.description
      });
      setViewMode('LIST');
      setNewExpense({ amount: 0, category: ExpenseCategory.OTHER, date: new Date().toISOString().split('T')[0], description: '' });
  };

  const handleSaveSale = () => {
      if(!newSale.amount || !newSale.buyer || !newSale.animalId) return alert("Amount, Buyer, and Animal ID required");
      onAddSale({
          id: Math.random().toString(36).substr(2,9),
          amount: Number(newSale.amount),
          buyer: newSale.buyer,
          date: newSale.date || new Date().toISOString().split('T')[0],
          animalId: newSale.animalId,
          weightAtSale: Number(newSale.weightAtSale) || 0
      });
      setViewMode('LIST');
      setNewSale({ amount: 0, date: new Date().toISOString().split('T')[0], buyer: '', weightAtSale: 0, animalId: '' });
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

  // RENDER
  if (viewMode === 'ADD_EXPENSE') {
      return (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
              <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                      <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-800">Log Expense</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR)</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}>
                              {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input type="date" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Expense details..."></textarea>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                      <button onClick={handleSaveExpense} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Save Expense</button>
                  </div>
              </div>
          </div>
      );
  }

  if (viewMode === 'ADD_SALE') {
      return (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
              <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                      <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-800">Record Sale</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sold Animal</label>
                      <select className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.animalId} onChange={e => setNewSale({...newSale, animalId: e.target.value})}>
                          <option value="">Select Animal...</option>
                          {livestockList.filter(c => c.status === 'ACTIVE').map(c => (
                              <option key={c.id} value={c.id}>[{c.species}] {c.tagId} - {c.breed}</option>
                          ))}
                      </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sale Amount (PKR)</label>
                          <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.amount} onChange={e => setNewSale({...newSale, amount: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Weight at Sale (kg)</label>
                          <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.weightAtSale} onChange={e => setNewSale({...newSale, weightAtSale: parseFloat(e.target.value)})} />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                          <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.buyer} onChange={e => setNewSale({...newSale, buyer: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input type="date" className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" value={newSale.date} onChange={e => setNewSale({...newSale, date: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setViewMode('LIST')} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                      <button onClick={handleSaveSale} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Confirm Sale</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Financial Management</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex gap-4">
            <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold">Revenue</p>
                <p className="text-sm font-bold text-green-600">PKR {totalSales.toLocaleString()}</p>
            </div>
            <div className="w-px bg-gray-200"></div>
             <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold">Expense</p>
                <p className="text-sm font-bold text-red-600">PKR {totalExpenses.toLocaleString()}</p>
            </div>
             <div className="w-px bg-gray-200"></div>
             <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold">Net Profit</p>
                <p className={`text-sm font-bold ${(totalSales - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    PKR {(totalSales - totalExpenses).toLocaleString()}
                </p>
            </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`pb-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'EXPENSES'
              ? 'border-b-2 border-emerald-500 text-emerald-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Expenses & Operations
        </button>
        <button
          onClick={() => setActiveTab('SALES')}
          className={`pb-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'SALES'
              ? 'border-b-2 border-emerald-500 text-emerald-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sales & Revenue
        </button>
      </div>

      {activeTab === 'EXPENSES' ? (
        <div className="space-y-4 animate-fade-in">
           <div className="flex justify-end">
             <button 
                onClick={() => setViewMode('ADD_EXPENSE')}
                className="flex items-center gap-2 text-sm font-medium text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
             >
                <Plus size={16} /> Log Expense
             </button>
           </div>
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{expense.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.category === ExpenseCategory.VACCINE ? 'bg-blue-100 text-blue-800' : expense.category === ExpenseCategory.MEDICAL ? 'bg-orange-100 text-orange-800' : expense.category === ExpenseCategory.BREEDING ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800'}`}>
                            {getCategoryIcon(expense.category)}
                            {expense.category}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{expense.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                        PKR {expense.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                                onClick={() => { if (confirm('Delete this expense?')) onDeleteExpense(expense.id); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
             </div>
           </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
             <div className="flex justify-end">
             <button 
                onClick={() => setViewMode('ADD_SALE')}
                className="flex items-center gap-2 text-sm font-medium text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
             >
                <Plus size={16} /> Record Sale
             </button>
           </div>
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Animal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.buyer}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">ID: {sale.animalId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.weightAtSale} kg</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                        +PKR {sale.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                                onClick={() => { if (confirm('Delete this sale?')) onDeleteSale(sale.id); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

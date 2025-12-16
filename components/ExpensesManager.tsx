
import React, { useState } from 'react';
import { Expense } from '../types';
import { EXPENSE_CATEGORIES, formatCurrency } from '../constants';
import { Plus, Trash2, Receipt, Calendar, Tag, Download, PieChart } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ExpensesManagerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

const ExpensesManager: React.FC<ExpensesManagerProps> = ({ expenses, setExpenses }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: EXPENSE_CATEGORIES[0]
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      title: formData.title!,
      amount: Number(formData.amount),
      date: formData.date!,
      category: formData.category!,
      notes: formData.notes || ''
    };

    setExpenses([newExpense, ...expenses]);
    setFormData({ date: new Date().toISOString().split('T')[0], category: EXPENSE_CATEGORIES[0], title: '', amount: 0, notes: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this expense record?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const downloadExpensesCSV = () => {
    if (expenses.length === 0) {
      alert("No expenses to export.");
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Title,Category,Amount,Notes\n"
      + expenses.map(e => `${e.date},"${e.title}",${e.category},${e.amount},"${e.notes || ''}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Prepare Pie Chart Data
  const categoryData = EXPENSE_CATEGORIES.map(cat => {
    const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    return { name: cat, value: total };
  }).filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm placeholder-slate-400";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Company Expenses</h2>
          <p className="text-slate-500">Track operating costs and overheads.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={downloadExpensesCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium shadow-sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors"
          >
            {showForm ? 'Cancel' : <><Plus className="h-5 w-5" /> Add Expense</>}
          </button>
        </div>
      </div>

      {/* Stats & Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-3 mb-2">
             <div className="bg-red-50 p-2 rounded-lg text-red-600">
               <Receipt className="h-6 w-6" />
             </div>
             <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Spending</span>
           </div>
           <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(totalExpenses)}</p>
           <p className="text-xs text-slate-400 mt-1">All time records</p>
        </div>

        {/* Category Chart */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center">
           <div className="flex-1 w-full h-48">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}}/>
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data for chart</div>
              )}
           </div>
           <div className="mt-4 sm:mt-0 sm:ml-6 text-sm text-slate-500 w-full sm:w-auto">
             <p className="font-semibold mb-2 text-slate-700">Top Categories</p>
             <ul className="space-y-1">
               {categoryData.slice(0, 3).sort((a,b) => b.value - a.value).map((d, i) => (
                 <li key={i} className="flex justify-between w-full sm:w-40">
                   <span>{d.name}</span>
                   <span className="font-bold">{formatCurrency(d.value)}</span>
                 </li>
               ))}
             </ul>
           </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg animate-in slide-in-from-top-4">
           <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Plus className="h-5 w-5 text-indigo-600" /> Record New Expense
           </h3>
           <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                 <input autoFocus required type="text" placeholder="e.g. Adobe CC Subscription" className={inputClass} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                 <input required type="number" placeholder="0.00" className={inputClass} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                 <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                   {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                 <input required type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="lg:col-span-3">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                 <textarea 
                    placeholder="Add specific details, invoice numbers, or vendor info..." 
                    className={`${inputClass} min-h-[44px] py-2 resize-y`} 
                    value={formData.notes || ''} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                 />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition-all">
                   Save Record
                </button>
              </div>
           </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length > 0 ? (
                expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric'})}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {expense.title}
                      {expense.notes && (
                        <p className="text-xs text-slate-400 font-normal mt-0.5 max-w-xs">{expense.notes}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Tag className="h-3 w-3" /> {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 text-center">
                       <button onClick={() => handleDelete(expense.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpensesManager;

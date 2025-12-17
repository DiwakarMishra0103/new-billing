import React, { useState, useMemo } from 'react';
import { Expense } from '../types';
import { EXPENSE_CATEGORIES, formatCurrency } from '../constants';
import { 
  Plus, Trash2, Receipt, Calendar, Tag, Download, 
  Search, Filter, TrendingUp, TrendingDown, Edit2, 
  X, Save, ArrowUpRight, DollarSign, PieChart as PieChartIcon, 
  BarChart3, Check, ChevronDown
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';

interface ExpensesManagerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

const ExpensesManager: React.FC<ExpensesManagerProps> = ({ expenses, setExpenses }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Custom Dropdown State for Modal
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: EXPENSE_CATEGORIES[0]
  });

  // --- Handlers ---

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({ ...expense });
    } else {
      setEditingId(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: EXPENSE_CATEGORIES[0],
        title: '',
        amount: undefined,
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setIsCategoryOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    if (editingId) {
      // Edit Mode
      setExpenses(expenses.map(ex => ex.id === editingId ? { ...ex, ...formData } as Expense : ex));
    } else {
      // Add Mode
      const newExpense: Expense = {
        id: Date.now().toString(),
        title: formData.title!,
        amount: Number(formData.amount),
        date: formData.date!,
        category: formData.category!,
        notes: formData.notes || ''
      };
      setExpenses([newExpense, ...expenses]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
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

  // --- Derived Data & Analytics ---

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = filteredExpenses.length;
    
    // Calculate Top Category
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    let topCatName = 'N/A';
    let topCatAmount = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatName = cat;
      }
    });

    // Simple month-over-month (dummy logic for demo if not enough data)
    // In a real app, compare current month vs last month
    return { total, count, topCatName, topCatAmount };
  }, [filteredExpenses]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    // 1. Category Breakdown (Pie)
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const pieData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 2. Monthly Trend (Bar)
    const monthMap: Record<string, number> = {};
    // Initialize last 6 months to 0
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[key] = 0;
    }
    
    expenses.forEach(e => {
       const d = new Date(e.date);
       const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
       if (monthMap[key] !== undefined) { // only count if in range
          monthMap[key] += e.amount;
       }
    });

    const trendData = Object.entries(monthMap).map(([name, amount]) => ({ name, amount }));

    return { pieData, trendData };
  }, [expenses, filteredExpenses]);

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm placeholder-slate-400";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expense Management</h2>
          <p className="text-slate-500 text-sm">Track overheads, salaries, and operational costs.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadExpensesCSV}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium shadow-sm text-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Spending</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.total)}</h3>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                 <Receipt className="h-3 w-3" /> {stats.count} records found
              </div>
           </div>
           <div className="bg-red-50 p-3 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-600" />
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Top Category</p>
              <h3 className="text-xl font-bold text-slate-800 truncate max-w-[150px]">{stats.topCatName}</h3>
              <p className="text-xs text-slate-500 mt-1">{formatCurrency(stats.topCatAmount)} spent</p>
           </div>
           <div className="bg-amber-50 p-3 rounded-xl">
              <Tag className="h-6 w-6 text-amber-600" />
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Average</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.total > 0 ? stats.total / 6 : 0)}</h3>
              <p className="text-xs text-slate-500 mt-1">Based on last 6 months</p>
           </div>
           <div className="bg-blue-50 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-blue-600" />
           </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Trend Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
               <BarChart3 className="h-4 w-4 text-indigo-600" /> Spending Trend (Last 6 Months)
            </h3>
            <div className="flex-1 min-h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                     <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     />
                     <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Breakdown Chart */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
               <PieChartIcon className="h-4 w-4 text-indigo-600" /> Category Breakdown
            </h3>
            <div className="flex-1 min-h-[200px] relative">
               {chartData.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={chartData.pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {chartData.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                     </PieChart>
                  </ResponsiveContainer>
               ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">No data available</div>
               )}
               {/* Center Text */}
               {chartData.pieData.length > 0 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                       <span className="block text-xl font-bold text-slate-800">{chartData.pieData.length}</span>
                       <span className="text-[10px] text-slate-400 uppercase">Categories</span>
                    </div>
                 </div>
               )}
            </div>
            <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
               {chartData.pieData.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-slate-600">{entry.name}</span>
                     </div>
                     <span className="font-bold text-slate-800">{formatCurrency(entry.value)}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full sm:w-80">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
               <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
               />
            </div>
            <div className="relative w-full sm:w-auto min-w-[200px]">
               <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full flex items-center justify-between gap-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
               >
                  <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <span>{categoryFilter === 'ALL' ? 'All Categories' : categoryFilter}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
               </button>
               
               {isFilterOpen && (
                  <>
                     <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                     <div className="absolute right-0 top-full mt-2 w-full sm:w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-20 py-1 animate-in fade-in zoom-in-95 duration-200 max-h-64 overflow-y-auto custom-scrollbar">
                        <button
                           onClick={() => { setCategoryFilter('ALL'); setIsFilterOpen(false); }}
                           className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${categoryFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                        >
                           <span>All Categories</span>
                           {categoryFilter === 'ALL' && <Check className="h-4 w-4" />}
                        </button>
                        {EXPENSE_CATEGORIES.map(cat => (
                           <button
                              key={cat}
                              onClick={() => { setCategoryFilter(cat); setIsFilterOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${categoryFilter === cat ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                           >
                              <span>{cat}</span>
                              {categoryFilter === cat && <Check className="h-4 w-4" />}
                           </button>
                        ))}
                     </div>
                  </>
               )}
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                  <tr>
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Details</th>
                     <th className="px-6 py-4">Category</th>
                     <th className="px-6 py-4 text-right">Amount</th>
                     <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length > 0 ? (
                     filteredExpenses.map(expense => (
                        <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-6 py-4 text-slate-600 whitespace-nowrap w-32">
                              <div className="flex flex-col">
                                 <span className="font-bold text-slate-700">
                                    {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                 </span>
                                 <span className="text-[10px] text-slate-400">
                                    {new Date(expense.date).toLocaleDateString('en-IN', { year: 'numeric' })}
                                 </span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <p className="font-medium text-slate-800">{expense.title}</p>
                              {expense.notes && (
                                 <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{expense.notes}</p>
                              )}
                           </td>
                           <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                 <Tag className="h-3 w-3 text-slate-400" /> {expense.category}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-slate-700">
                              {formatCurrency(expense.amount)}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => openModal(expense)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                    <Edit2 className="h-4 w-4" />
                                 </button>
                                 <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                           <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                              <Search className="h-5 w-5 text-slate-300" />
                           </div>
                           <p>No expenses found.</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                     <Receipt className="h-5 w-5 text-indigo-600" />
                     {editingId ? 'Edit Expense' : 'Record New Expense'}
                  </h3>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                     <X className="h-5 w-5" />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto">
                  <form id="expense-form" onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                        <input 
                           autoFocus 
                           required 
                           type="text" 
                           placeholder="e.g. Adobe CC Subscription" 
                           className={inputClass} 
                           value={formData.title} 
                           onChange={e => setFormData({...formData, title: e.target.value})} 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                           <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                              <input 
                                 required 
                                 type="number" 
                                 placeholder="0.00" 
                                 className={`${inputClass} pl-8`} 
                                 value={formData.amount || ''} 
                                 onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                           <input 
                              required 
                              type="date" 
                              className={inputClass} 
                              value={formData.date} 
                              onChange={e => setFormData({...formData, date: e.target.value})} 
                           />
                        </div>
                     </div>
                     <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                        <button
                           type="button"
                           onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                           className="w-full text-left p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm flex items-center justify-between text-sm"
                        >
                           <span>{formData.category}</span>
                           <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                        
                        {isCategoryOpen && (
                           <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsCategoryOpen(false)}></div>
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto custom-scrollbar">
                                 {EXPENSE_CATEGORIES.map(c => (
                                    <button
                                       key={c}
                                       type="button"
                                       onClick={() => {
                                          setFormData({...formData, category: c});
                                          setIsCategoryOpen(false);
                                       }}
                                       className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${formData.category === c ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-700'}`}
                                    >
                                       <span>{c}</span>
                                       {formData.category === c && <Check className="h-4 w-4" />}
                                    </button>
                                 ))}
                              </div>
                           </>
                        )}
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                        <textarea 
                           placeholder="Add specific details, invoice numbers, or vendor info..." 
                           className={`${inputClass} min-h-[80px] resize-none`} 
                           value={formData.notes || ''} 
                           onChange={e => setFormData({...formData, notes: e.target.value})} 
                        />
                     </div>
                  </form>
               </div>

               <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <button type="button" onClick={closeModal} className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                  <button form="expense-form" type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-100 transition-all flex items-center gap-2 text-sm">
                     <Save className="h-4 w-4" /> Save Record
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ExpensesManager;
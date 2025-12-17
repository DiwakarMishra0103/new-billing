import React, { useState, useMemo } from 'react';
import { Client, Expense, AgencyProfile } from '../types';
import { formatCurrency } from '../constants';
import { TrendingUp, AlertCircle, Users, Wallet, CalendarClock, MessageCircle, X, Bell, Download, FileDown, Receipt, PiggyBank, BarChart3, LineChart, BellRing, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { generateClientMessage } from '../services/geminiService';

interface DashboardProps {
  clients: Client[];
  expenses: Expense[];
  agencyProfile: AgencyProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ clients, expenses, agencyProfile }) => {
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chartMode, setChartMode] = useState<'TREND' | 'CLIENTS'>('TREND');

  const totalRevenue = clients.reduce((sum, c) => sum + c.dealAmount, 0);
  const totalCollected = clients.reduce((sum, c) => 
    sum + c.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  
  const totalDue = totalRevenue - totalCollected;
  const activeClients = clients.filter(c => c.status === 'ACTIVE').length;

  // --- Chart Data Logic ---
  const clientChartData = useMemo(() => {
    return clients.slice(0, 10).map(client => {
      const paid = client.payments.reduce((s, p) => s + p.amount, 0);
      return {
        name: client.businessName.length > 15 ? client.businessName.substring(0, 15) + '...' : client.businessName,
        full_name: client.businessName,
        Paid: paid,
        Due: client.dealAmount - paid,
      };
    });
  }, [clients]);

  const trendChartData = useMemo(() => {
    // Generate last 6 months keys
    const months: string[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }

    const data: Record<string, { name: string, Revenue: number, Expenses: number, Profit: number }> = {};
    
    // Initialize map
    months.forEach(m => {
        data[m] = { name: m, Revenue: 0, Expenses: 0, Profit: 0 };
    });

    // Aggregate Revenue
    clients.forEach(c => {
        c.payments.forEach(p => {
            const d = new Date(p.date);
            // Only consider if within reasonable range (simple check, can be robust)
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (data[key]) {
                data[key].Revenue += p.amount;
            }
        });
    });

    // Aggregate Expenses
    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (data[key]) {
            data[key].Expenses += e.amount;
        }
    });

    // Calculate Profit
    Object.keys(data).forEach(key => {
        data[key].Profit = data[key].Revenue - data[key].Expenses;
    });

    return Object.values(data);
  }, [clients, expenses]);

  // --- CSV Export Logic ---
  const downloadReport = (period: 'WEEK' | 'MONTH' | 'YEAR' | 'ALL') => {
    const now = new Date();
    let startDate = new Date();
    let filenamePrefix = 'revenue_report';

    if (period === 'WEEK') {
      startDate.setDate(now.getDate() - 7);
      filenamePrefix += '_weekly';
    } else if (period === 'MONTH') {
      startDate.setMonth(now.getMonth() - 1);
      filenamePrefix += '_monthly';
    } else if (period === 'YEAR') {
      startDate.setFullYear(now.getFullYear() - 1);
      filenamePrefix += '_yearly';
    } else {
      startDate = new Date(0); // All time (Epoch)
      filenamePrefix += '_all_time';
    }

    const csvRows = [['Date', 'Business Name', 'Client Name', 'Services', 'Amount (INR)']];
    let count = 0;

    clients.forEach(client => {
      if (client.payments) {
        client.payments.forEach(payment => {
          const paymentDate = new Date(payment.date);
          // Compare dates
          if (paymentDate >= startDate && paymentDate <= now) {
            csvRows.push([
              paymentDate.toLocaleDateString('en-IN'),
              `"${client.businessName}"`,
              `"${client.name}"`,
              `"${client.services.join(', ')}"`,
              payment.amount.toString()
            ]);
            count++;
          }
        });
      }
    });

    if (count === 0) {
      alert("No revenue data found for the selected period.");
      setShowExportMenu(false);
      return;
    }

    const dataRows = csvRows.slice(1);
    const finalCsvContent = [csvRows[0], ...dataRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${now.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  // --- Monthly Reminder Logic ---
  const getNextBillingDate = (startDateStr: string) => {
    const start = new Date(startDateStr);
    const today = new Date();
    const billingDay = start.getDate();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    
    // If billing day for this month passed, go to next month
    if (nextDate.getTime() < today.getTime() - (24 * 60 * 60 * 1000)) { // Small buffer for "today"
        nextDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
    }
    return nextDate;
  };

  const upcomingRenewals = clients
    .filter(c => c.status === 'ACTIVE')
    .map(c => {
      const nextDate = getNextBillingDate(c.startDate);
      const diffTime = nextDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return { ...c, nextBillingDate: nextDate, daysUntil: diffDays };
    })
    .filter(item => item.daysUntil <= 7 && item.daysUntil >= -5)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Filter for the "2 Days Before" Alert
  const remindersDueInTwoDays = upcomingRenewals.filter(c => c.daysUntil === 2 || c.daysUntil === 1);

  const handleReminderClick = async (client: Client) => {
    setIsGenerating(true);
    const msg = await generateClientMessage(client, 'MONTHLY_PAYMENT_REMINDER', 0);
    setGeneratedMessage(msg);
    setIsGenerating(false);
  };

  const notifyOwner = (channel: 'WHATSAPP' | 'EMAIL') => {
    if (remindersDueInTwoDays.length === 0) return;

    const names = remindersDueInTwoDays.map(c => `${c.businessName} (${formatCurrency(c.dealAmount)})`).join(', ');
    const message = `🔔 AgencyFlow Alert: The following payments are due in ~2 days:\n\n${names}\n\nPlease follow up with these clients regarding their monthly renewals.`;

    if (channel === 'WHATSAPP') {
       const url = `https://wa.me/${agencyProfile.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
       window.open(url, '_blank');
    } else {
       const url = `mailto:${agencyProfile.email}?subject=Payment Reminders (Due in 2 Days)&body=${encodeURIComponent(message)}`;
       window.location.href = url;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Actions for Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">Financial Overview</h2>
            <p className="text-slate-500">Track your agency's revenue, profit, and pending dues.</p>
         </div>
         <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-all"
            >
              <Download className="h-4 w-4" /> Export Data
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                 <div className="p-2 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">
                    Select Period
                 </div>
                 <button onClick={() => downloadReport('WEEK')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
                    <CalendarClock className="h-4 w-4 opacity-50" /> Last 7 Days (Weekly)
                 </button>
                 <button onClick={() => downloadReport('MONTH')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
                    <CalendarClock className="h-4 w-4 opacity-50" /> Last 30 Days (Monthly)
                 </button>
                 <button onClick={() => downloadReport('YEAR')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
                    <CalendarClock className="h-4 w-4 opacity-50" /> Last Year (Yearly)
                 </button>
                 <div className="border-t border-slate-100 my-1"></div>
                 <button onClick={() => downloadReport('ALL')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
                    <FileDown className="h-4 w-4 opacity-50" /> All Time Report
                 </button>
              </div>
            )}
         </div>
      </div>

      {/* ALERT BANNER for 2-Day Reminders */}
      {remindersDueInTwoDays.length > 0 && (
         <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-top-4">
            <div className="flex items-start gap-4">
               <div className="bg-white/20 p-3 rounded-full animate-pulse">
                  <BellRing className="h-6 w-6 text-white" />
               </div>
               <div>
                  <h3 className="font-bold text-lg">Action Required: {remindersDueInTwoDays.length} Payments Due in ~2 Days</h3>
                  <p className="text-indigo-200 text-sm mt-1">
                     Clients: {remindersDueInTwoDays.map(c => c.businessName).join(', ')}.
                  </p>
                  <p className="text-xs text-indigo-300 mt-2">Send a reminder to yourself now to ensure collection.</p>
               </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <button 
                  onClick={() => notifyOwner('WHATSAPP')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-md transition-colors whitespace-nowrap"
               >
                  <MessageCircle className="h-4 w-4" /> Notify Me (WhatsApp)
               </button>
               <button 
                  onClick={() => notifyOwner('EMAIL')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
               >
                  <Mail className="h-4 w-4" /> Notify Me (Email)
               </button>
            </div>
         </div>
      )}

      {/* Reminder Modal */}
      {generatedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-0 shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800">Monthly Reminder Draft</h3>
               <button onClick={() => setGeneratedMessage(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
               </button>
            </div>
            <div className="p-6">
               <textarea 
                 readOnly 
                 className="w-full h-40 p-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none resize-none font-medium custom-scrollbar"
                 value={generatedMessage}
               />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(generatedMessage)}`, '_blank');
                }}
                className="px-5 py-2 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm bg-green-600 hover:bg-green-700"
              >
               <MessageCircle className="h-4 w-4" /> Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard 
          title="Total Collected" 
          value={formatCurrency(totalCollected)} 
          icon={<Wallet className="text-green-600" />} 
          bg="bg-green-50"
        />
         <StatsCard 
          title="Total Expenses" 
          value={formatCurrency(totalExpenses)} 
          icon={<Receipt className="text-red-600" />} 
          bg="bg-red-50"
        />
        <StatsCard 
          title="Net Profit" 
          value={formatCurrency(netProfit)} 
          icon={<PiggyBank className={netProfit >= 0 ? "text-emerald-600" : "text-red-600"} />} 
          bg={netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}
          highlight={netProfit < 0}
        />
        <StatsCard 
          title="Total Pending" 
          value={formatCurrency(totalDue)} 
          icon={<AlertCircle className="text-orange-600" />} 
          bg="bg-orange-50"
          highlight={totalDue > 0}
        />
        <StatsCard 
          title="Active Clients" 
          value={activeClients.toString()} 
          icon={<Users className="text-indigo-600" />} 
          bg="bg-indigo-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Reminders Section */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
             <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
               <CalendarClock className="h-5 w-5" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-800">Monthly Renewals</h3>
               <p className="text-xs text-slate-500">Upcoming payments (next 7 days)</p>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar space-y-3">
            {upcomingRenewals.length > 0 ? (
              upcomingRenewals.map(item => (
                <div key={item.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm hover:border-indigo-100 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{item.businessName}</h4>
                      <p className="text-xs text-slate-500">Joined: {new Date(item.startDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.daysUntil <= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.daysUntil === 0 ? 'Due Today' : item.daysUntil < 0 ? `${Math.abs(item.daysUntil)} Days Overdue` : `In ${item.daysUntil} Days`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                     <p className="text-xs font-semibold text-slate-600">Due: {item.nextBillingDate.toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</p>
                     <button 
                       onClick={() => handleReminderClick(item)}
                       disabled={isGenerating}
                       className="flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-700 px-2 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                     >
                        <Bell className="h-3 w-3" /> Remind Client
                     </button>
                  </div>
                </div>
              ))
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg">
                  <CalendarClock className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No upcoming renewals.</p>
                  <p className="text-xs text-slate-400">You're all caught up for the week!</p>
               </div>
            )}
          </div>
        </div>

        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">
               {chartMode === 'TREND' ? 'Financial Trend (Last 6 Months)' : 'Client Revenue Breakdown'}
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setChartMode('TREND')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${chartMode === 'TREND' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LineChart className="h-3.5 w-3.5" /> Trend
              </button>
              <button 
                onClick={() => setChartMode('CLIENTS')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${chartMode === 'CLIENTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Clients
              </button>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'CLIENTS' ? (
                <BarChart data={clientChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{paddingTop: '10px'}} />
                  <Bar name="Paid" dataKey="Paid" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} barSize={32} />
                  <Bar name="Due" dataKey="Due" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              ) : (
                <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{paddingTop: '10px'}} />
                  <Area type="monotone" name="Revenue" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" name="Expenses" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, bg, highlight }: any) => (
  <div className={`p-4 xl:p-6 rounded-xl border ${highlight ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100'} bg-white shadow-sm flex items-center space-x-3 xl:space-x-4`}>
    <div className={`p-2 xl:p-3 rounded-lg ${bg}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs xl:text-sm text-slate-500 font-medium whitespace-nowrap">{title}</p>
      <h3 className={`text-lg xl:text-2xl font-bold ${highlight ? 'text-red-600' : 'text-slate-800'}`}>{value}</h3>
    </div>
  </div>
);

export default Dashboard;
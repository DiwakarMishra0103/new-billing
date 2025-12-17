import React, { useState, useEffect, useMemo } from 'react';
import { Client, ServiceDefinition, Expense, AgencyProfile } from './types';
import { NAV_ITEMS, DEFAULT_SERVICES, AGENCY_DETAILS, formatCurrency } from './constants';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import InvoiceGenerator from './components/InvoiceGenerator';
import ServiceManager from './components/ServiceManager';
import ExpensesManager from './components/ExpensesManager';
import AIChatWidget from './components/AIChatWidget';
import { Menu, Layout, Bell, BellRing, X, MessageCircle, Mail, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile>(AGENCY_DETAILS);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<Client | null>(null);
  
  // Notification State
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);

  // Load Data from local storage
  useEffect(() => {
    const savedClients = localStorage.getItem('agency_clients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    } else {
        // Seed dummy data for first time view
        setClients([{
            id: '1',
            name: 'Rahul Sharma',
            businessName: 'Sharma Electronics',
            email: 'rahul@example.com',
            phone: '9876543210',
            services: ['Meta Ads (FB/Insta)', 'SEO Standard'],
            dealAmount: 50000,
            startDate: '2023-10-01',
            payments: [{id: 'p1', amount: 20000, date: '2023-10-02'}],
            status: 'ACTIVE',
            address: 'MG Road, Bangalore',
            gstIn: '29AAAAA0000A1Z5'
        }]);
    }

    const savedServices = localStorage.getItem('agency_services');
    if (savedServices) {
      setServices(JSON.parse(savedServices));
    } else {
      setServices(DEFAULT_SERVICES);
    }

    const savedExpenses = localStorage.getItem('agency_expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }

    const savedProfile = localStorage.getItem('agency_profile');
    if (savedProfile) {
      setAgencyProfile(JSON.parse(savedProfile));
    }
  }, []);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('agency_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('agency_services', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('agency_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('agency_profile', JSON.stringify(agencyProfile)); }, [agencyProfile]);

  // --- Notification Logic ---
  const remindersDueInTwoDays = useMemo(() => {
    const getNextBillingDate = (startDateStr: string) => {
      const start = new Date(startDateStr);
      const today = new Date();
      const billingDay = start.getDate();
      let nextDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
      
      if (nextDate.getTime() < today.getTime() - (24 * 60 * 60 * 1000)) { 
          nextDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
      }
      return nextDate;
    };

    return clients
      .filter(c => c.status === 'ACTIVE')
      .map(c => {
        const nextDate = getNextBillingDate(c.startDate);
        const diffTime = nextDate.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return { ...c, nextBillingDate: nextDate, daysUntil: diffDays };
      })
      .filter(c => c.daysUntil === 2 || c.daysUntil === 1);
  }, [clients]);

  // Auto-open notification panel if alerts exist and haven't been viewed this session
  useEffect(() => {
    if (remindersDueInTwoDays.length > 0 && !hasViewedNotifications) {
      const timer = setTimeout(() => {
        setShowNotificationPanel(true);
        setHasViewedNotifications(true);
      }, 1000); // Small delay for better UX on load
      return () => clearTimeout(timer);
    }
  }, [remindersDueInTwoDays, hasViewedNotifications]);

  const notifyOwner = (channel: 'WHATSAPP' | 'EMAIL') => {
    if (remindersDueInTwoDays.length === 0) return;

    const names = remindersDueInTwoDays.map(c => `${c.businessName} (${formatCurrency(c.dealAmount)})`).join(', ');
    const message = `🔔 AgencyFlow Auto-Alert: The following payments are due in ~2 days:\n\n${names}\n\nPlease follow up with these clients regarding their monthly renewals.`;

    if (channel === 'WHATSAPP') {
       const url = `https://wa.me/${agencyProfile.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
       window.open(url, '_blank');
    } else {
       const url = `mailto:${agencyProfile.email}?subject=Payment Reminders (Due in 2 Days)&body=${encodeURIComponent(message)}`;
       window.location.href = url;
    }
  };

  const handleInvoiceRequest = (client: Client) => {
    setSelectedClientForInvoice(client);
  };

  if (selectedClientForInvoice) {
    return (
      <InvoiceGenerator 
        client={selectedClientForInvoice} 
        agencyProfile={agencyProfile}
        setAgencyProfile={setAgencyProfile}
        onBack={() => setSelectedClientForInvoice(null)} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Position */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 print:hidden
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
             <Layout className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">AgencyFlow</span>
        </div>
        
        <nav className="p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
           <p className="text-xs text-slate-500">© 2024 AgencyFlow Inc.</p>
        </div>
      </aside>

      {/* Main Content - Added lg:ml-64 to account for fixed sidebar */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative lg:ml-64 transition-all duration-300 print:ml-0 print:overflow-visible print:h-auto print:block">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-slate-600"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">
              {NAV_ITEMS.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-6">
             {/* Notification Bell */}
             <div className="relative">
               <button 
                 onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                 className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
               >
                 {remindersDueInTwoDays.length > 0 ? (
                    <BellRing className="h-6 w-6 text-indigo-600 animate-pulse" />
                 ) : (
                    <Bell className="h-6 w-6" />
                 )}
                 {remindersDueInTwoDays.length > 0 && (
                   <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border border-white"></span>
                 )}
               </button>

               {/* Notification Panel Dropdown */}
               {showNotificationPanel && (
                 <div className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                       <h3 className="font-bold flex items-center gap-2">
                         <BellRing className="h-4 w-4" /> Notifications
                       </h3>
                       <button onClick={() => setShowNotificationPanel(false)} className="text-indigo-100 hover:text-white">
                         <X className="h-5 w-5" />
                       </button>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto p-2 bg-slate-50">
                       {remindersDueInTwoDays.length > 0 ? (
                         <div className="space-y-2">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-2">
                               <h4 className="font-bold text-indigo-900 text-sm mb-1">Automatic Alert: Payment Reminders</h4>
                               <p className="text-xs text-indigo-700 mb-3">
                                 The following clients are due for payment in ~2 days. Send a reminder to yourself now.
                               </p>
                               <div className="flex gap-2">
                                  <button onClick={() => notifyOwner('WHATSAPP')} className="flex-1 bg-[#25D366] text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:brightness-95">
                                    <MessageCircle className="h-3.5 w-3.5" /> My WhatsApp
                                  </button>
                                  <button onClick={() => notifyOwner('EMAIL')} className="flex-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-indigo-50">
                                    <Mail className="h-3.5 w-3.5" /> My Email
                                  </button>
                               </div>
                            </div>
                            
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Details</p>
                            {remindersDueInTwoDays.map(client => (
                               <div key={client.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                  <div>
                                     <p className="font-bold text-sm text-slate-800">{client.businessName}</p>
                                     <p className="text-xs text-slate-500">Amount: {formatCurrency(client.dealAmount)}</p>
                                  </div>
                                  <div className="text-right">
                                     <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Due Soon</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm font-medium">All caught up!</p>
                            <p className="text-xs">No pending alerts for today.</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}
             </div>

             <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200">
                {agencyProfile.logoUrl ? (
                  <img src={agencyProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-700 font-bold text-xs">AG</span>
                )}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
            {activeTab === 'dashboard' && <Dashboard clients={clients} expenses={expenses} agencyProfile={agencyProfile} />}
            {activeTab === 'clients' && (
              <ClientManager 
                clients={clients} 
                services={services}
                setClients={setClients} 
                onGenerateInvoice={handleInvoiceRequest} 
              />
            )}
            {activeTab === 'services' && (
              <ServiceManager 
                services={services}
                setServices={setServices}
              />
            )}
            {activeTab === 'expenses' && (
              <ExpensesManager
                expenses={expenses}
                setExpenses={setExpenses}
              />
            )}
            {activeTab === 'billing' && (
              <div className="text-center py-20">
                <p className="text-slate-500">Go to the "Clients" tab to select a client and generate an invoice.</p>
                <button 
                  onClick={() => setActiveTab('clients')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  View Clients
                </button>
              </div>
            )}
            {activeTab === 'analytics' && (
               <div className="text-center py-20 text-slate-500">
                 Analytics module coming soon. Check Dashboard for current stats.
               </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Chat Widget moved to root for better stacking context */}
      <div className="print:hidden">
        <AIChatWidget clients={clients} expenses={expenses} />
      </div>
    </div>
  );
};

export default App;
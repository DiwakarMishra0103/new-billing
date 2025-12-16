import React, { useState, useEffect } from 'react';
import { Client, ServiceDefinition, Expense, AgencyProfile } from './types';
import { NAV_ITEMS, DEFAULT_SERVICES, AGENCY_DETAILS } from './constants';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import InvoiceGenerator from './components/InvoiceGenerator';
import ServiceManager from './components/ServiceManager';
import ExpensesManager from './components/ExpensesManager';
import AIChatWidget from './components/AIChatWidget';
import { Menu, Layout } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile>(AGENCY_DETAILS);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<Client | null>(null);

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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
          <button 
            className="lg:hidden text-slate-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {NAV_ITEMS.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-4">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard clients={clients} expenses={expenses} />}
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
      <AIChatWidget clients={clients} expenses={expenses} />
    </div>
  );
};

export default App;
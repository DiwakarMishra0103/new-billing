import React, { useState } from 'react';
import { Client, ServiceDefinition, ClientStatus } from '../types';
import { formatCurrency } from '../constants';
import { Plus, Search, Calendar, CheckCircle2, MessageCircle, Mail, X, Pencil, Wand2, FileText, History, Trash2, PauseCircle, StopCircle, PlayCircle, AlertCircle, Filter } from 'lucide-react';
import { generateClientMessage } from '../services/geminiService';

interface ClientManagerProps {
  clients: Client[];
  services: ServiceDefinition[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  onGenerateInvoice: (client: Client) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, services, setClients, onGenerateInvoice }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<{text: string, type: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({
    services: [],
    status: 'ACTIVE'
  });

  const handleServiceToggle = (serviceName: string) => {
    const currentServices = formData.services || [];
    if (currentServices.includes(serviceName)) {
      setFormData({ ...formData, services: currentServices.filter(s => s !== serviceName) });
    } else {
      setFormData({ ...formData, services: [...currentServices, serviceName] });
    }
  };

  const applyStandardPricing = () => {
    if (!formData.services) return;
    const total = formData.services.reduce((sum, serviceName) => {
      const def = services.find(s => s.name === serviceName);
      return sum + (def ? def.price : 0);
    }, 0);
    setFormData({ ...formData, dealAmount: total });
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.businessName) return;

    if (editingClientId) {
      // Edit existing client
      setClients(clients.map(c => {
        if (c.id === editingClientId) {
          return {
            ...c,
            ...formData,
            dealAmount: Number(formData.dealAmount) || 0,
          } as Client;
        }
        return c;
      }));
    } else {
      // Add new client
      const newClient: Client = {
        id: Date.now().toString(),
        name: formData.name!,
        businessName: formData.businessName!,
        phone: formData.phone || '',
        email: formData.email || '',
        gstIn: formData.gstIn || '',
        address: formData.address || '',
        services: formData.services || [],
        dealAmount: Number(formData.dealAmount) || 0,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate,
        payments: [],
        status: formData.status || 'ACTIVE',
      };
      setClients([newClient, ...clients]);
    }

    handleCloseForm();
  };

  const handleEditClick = (client: Client) => {
    setEditingClientId(client.id);
    setFormData({
      name: client.name,
      businessName: client.businessName,
      phone: client.phone,
      email: client.email,
      gstIn: client.gstIn,
      address: client.address,
      services: client.services,
      dealAmount: client.dealAmount,
      startDate: client.startDate,
      endDate: client.endDate,
      status: client.status,
    });
    setShowForm(true);
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      setClients(clients.filter(c => c.id !== clientId));
    }
  };

  const handleStatusChange = (clientId: string, newStatus: ClientStatus) => {
    setClients(clients.map(c => 
      c.id === clientId ? { ...c, status: newStatus } : c
    ));
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClientId(null);
    setFormData({ services: [], status: 'ACTIVE' });
  };

  const handleRecordPayment = () => {
    if (!showPaymentModal || !paymentAmount || isNaN(Number(paymentAmount))) return;
    const amount = Number(paymentAmount);
    
    setClients(clients.map(c => {
      if (c.id === showPaymentModal) {
        return {
          ...c,
          payments: [...c.payments, { id: Date.now().toString(), amount, date: new Date().toISOString() }]
        };
      }
      return c;
    }));
    
    setShowPaymentModal(null);
    setPaymentAmount('');
  };

  const handleMessageGeneration = async (client: Client, type: 'PAYMENT_REMINDER' | 'WELCOME') => {
    setIsGenerating(true);
    const paid = client.payments.reduce((sum, p) => sum + p.amount, 0);
    const due = client.dealAmount - paid;
    const msg = await generateClientMessage(client, type, due);
    setGeneratedMessage({ text: msg, type: type === 'PAYMENT_REMINDER' ? 'WhatsApp' : 'Email' });
    setIsGenerating(false);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (showDueOnly) {
      const paid = c.payments.reduce((sum, p) => sum + p.amount, 0);
      const due = c.dealAmount - paid;
      return due > 0;
    }

    return true;
  });

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm placeholder-slate-400";

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'bg-green-100', text: 'text-green-700', icon: PlayCircle, label: 'Ongoing' };
      case 'PAUSED': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: PauseCircle, label: 'Paused' };
      case 'STOPPED': return { bg: 'bg-red-100', text: 'text-red-700', icon: StopCircle, label: 'Stopped' };
      case 'CLOSED': return { bg: 'bg-slate-100', text: 'text-slate-700', icon: CheckCircle2, label: 'Closed' };
      default: return { bg: 'bg-blue-100', text: 'text-blue-700', icon: AlertCircle, label: 'Lead' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by name or business..." 
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowDueOnly(!showDueOnly)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors shadow-sm ${
              showDueOnly 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            {showDueOnly ? 'Dues Only' : 'Filter Due'}
          </button>
        </div>
        
        <button 
          onClick={() => {
            setEditingClientId(null);
            setFormData({ services: [], status: 'ACTIVE' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm w-full xl:w-auto justify-center font-medium"
        >
          <Plus className="h-5 w-5" /> Add New Client
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Record Payment</h3>
            <p className="text-sm text-slate-500 mb-4">Enter the amount received from the client.</p>
            <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
               <input 
                 type="number" 
                 autoFocus
                 className={`${inputClass} pl-8`} 
                 placeholder="0.00" 
                 value={paymentAmount}
                 onChange={(e) => setPaymentAmount(e.target.value)}
               />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => { setShowPaymentModal(null); setPaymentAmount(''); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleRecordPayment}
                className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {generatedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-0 shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800">Draft {generatedMessage.type} Message</h3>
               <button onClick={() => setGeneratedMessage(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
               </button>
            </div>
            <div className="p-6">
               <textarea 
                 readOnly 
                 className="w-full h-48 p-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none resize-none font-medium custom-scrollbar"
                 value={generatedMessage.text}
               />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setGeneratedMessage(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  if(generatedMessage.type === 'WhatsApp') {
                    window.open(`https://wa.me/${formData.phone ? formData.phone : ''}?text=${encodeURIComponent(generatedMessage.text)}`, '_blank');
                  } else {
                    window.location.href = `mailto:?body=${encodeURIComponent(generatedMessage.text)}`;
                  }
                }}
                className={`px-5 py-2 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm ${generatedMessage.type === 'WhatsApp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
               {generatedMessage.type === 'WhatsApp' ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
               Share via {generatedMessage.type}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Client Form */}
      {showForm && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-lg animate-in slide-in-from-top-4 relative">
          <button onClick={handleCloseForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
             <Plus className="h-6 w-6 rotate-45" />
          </button>
          <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              {editingClientId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            {editingClientId ? 'Edit Client Details' : 'New Client Onboarding'}
          </h3>
          <form onSubmit={handleSaveClient} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name</label>
                <input required type="text" value={formData.businessName || ''} placeholder="e.g. Acme Marketing" className={inputClass} onChange={e => setFormData({...formData, businessName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Person</label>
                <input required type="text" value={formData.name || ''} placeholder="e.g. John Doe" className={inputClass} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input type="tel" value={formData.phone || ''} placeholder="e.g. 9876543210" className={inputClass} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input type="email" value={formData.email || ''} placeholder="e.g. billing@acme.com" className={inputClass} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Billing Address</label>
                <input type="text" value={formData.address || ''} placeholder="Full address for invoice" className={inputClass} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">GSTIN (Optional)</label>
                <input type="text" value={formData.gstIn || ''} className={inputClass} placeholder="29ABCDE1234F1Z5" onChange={e => setFormData({...formData, gstIn: e.target.value})} />
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                  Deal Value (₹)
                  <button type="button" onClick={applyStandardPricing} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <Wand2 className="h-3 w-3" /> Apply Standard
                  </button>
                </label>
                <input required type="number" value={formData.dealAmount || ''} placeholder="0.00" className={inputClass} onChange={e => setFormData({...formData, dealAmount: Number(e.target.value)})} />
              </div>
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                    <input type="date" required value={formData.startDate || ''} className={inputClass} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                    <input type="date" value={formData.endDate || ''} className={inputClass} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                    <select 
                      value={formData.status || 'ACTIVE'} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                      className={inputClass}
                    >
                      <option value="LEAD">Lead</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="STOPPED">Stopped</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                 </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-3">Select Services (Click to toggle)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {services.map(service => {
                  const isSelected = formData.services?.includes(service.name);
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleServiceToggle(service.name)}
                      className={`cursor-pointer p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                         <span className={`font-medium text-sm ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>{service.name}</span>
                         {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{formatCurrency(service.price)}</p>
                      {service.description && (
                         <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{service.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={handleCloseForm} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
              <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md transition-all hover:shadow-lg">
                {editingClientId ? 'Save Changes' : 'Onboard Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredClients.map(client => {
          const paid = client.payments.reduce((sum, p) => sum + p.amount, 0);
          const due = client.dealAmount - paid;
          const progress = Math.min((paid / client.dealAmount) * 100, 100);
          const statusBadge = getStatusBadge(client.status);
          const StatusIcon = statusBadge.icon;

          return (
            <div key={client.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                
                {/* Info Section */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-800">{client.businessName}</h3>
                    
                    {/* Status Dropdown */}
                    <div className="relative group">
                       <button className={`px-2.5 py-1 ${statusBadge.bg} ${statusBadge.text} text-xs font-bold rounded-full border border-opacity-20 flex items-center gap-1.5`}>
                          <StatusIcon className="h-3.5 w-3.5" /> {statusBadge.label}
                       </button>
                       <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                          {['ACTIVE', 'PAUSED', 'STOPPED', 'CLOSED'].map((s) => (
                             <button
                                key={s}
                                onClick={() => handleStatusChange(client.id, s as ClientStatus)}
                                className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 ${client.status === s ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                             >
                                {s.charAt(0) + s.slice(1).toLowerCase()}
                             </button>
                          ))}
                       </div>
                    </div>

                    {due > 0 && client.status !== 'CLOSED' && (
                       <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">Due: {formatCurrency(due)}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                     <p className="font-medium text-slate-700">{client.name}</p>
                     <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> 
                      {new Date(client.startDate).toLocaleDateString('en-IN')} 
                      {client.endDate ? ` — ${new Date(client.endDate).toLocaleDateString('en-IN')}` : ' — Ongoing'}
                     </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {client.services.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium rounded-md">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Financial Section */}
                <div className="w-full lg:w-80 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col gap-4">
                  
                  {/* Progress Visual */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Progress</span>
                      <span className={`text-sm font-bold ${paid >= client.dealAmount ? 'text-green-600' : 'text-indigo-600'}`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 mb-2 overflow-hidden">
                       <div className={`h-full transition-all duration-700 ease-out ${paid >= client.dealAmount ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                       <div className="flex flex-col">
                          <span className="text-xs text-slate-500">Paid</span>
                          <span className="font-bold text-slate-700">{formatCurrency(paid)}</span>
                       </div>
                       <div className="h-8 w-px bg-slate-200 mx-2"></div>
                       <div className="flex flex-col items-end">
                          <span className="text-xs text-slate-500">Total Deal</span>
                          <span className="font-bold text-slate-700">{formatCurrency(client.dealAmount)}</span>
                       </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="flex-1 min-h-[80px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <History className="h-3 w-3" />
                        <span className="text-[10px] font-semibold uppercase">History</span>
                      </div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    {client.payments.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {client.payments.slice().reverse().map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100 shadow-sm">
                             <span className="text-slate-500 font-medium">{new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit'})}</span>
                             <span className="text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">+{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-400 italic bg-white rounded border border-dashed border-slate-200">
                        No payments recorded yet.
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2 mt-auto border-t border-slate-200">
                     <button 
                       onClick={() => setShowPaymentModal(client.id)}
                       className="flex items-center justify-center gap-1.5 text-xs bg-white text-green-700 hover:bg-green-50 hover:border-green-300 py-2.5 rounded-lg border border-green-200 font-bold transition-all shadow-sm active:scale-95"
                     >
                       <Plus className="h-3.5 w-3.5" /> Record Pay
                     </button>
                     <button 
                       onClick={() => onGenerateInvoice(client)}
                       className="flex items-center justify-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 py-2.5 rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                     >
                       <FileText className="h-3.5 w-3.5" /> Invoice
                     </button>
                  </div>

                </div>

                {/* Actions Section */}
                <div className="flex lg:flex-col gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
                  <button 
                    disabled={isGenerating}
                    onClick={() => handleMessageGeneration(client, 'PAYMENT_REMINDER')}
                    className="p-2.5 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg tooltip relative group transition-colors border border-green-100"
                    title="Send WhatsApp Payment Reminder"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                  <button 
                    disabled={isGenerating}
                    onClick={() => handleMessageGeneration(client, 'WELCOME')}
                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors border border-blue-100"
                    title="Draft Welcome Message"
                  >
                    <Mail className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleEditClick(client)}
                    className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors border border-slate-100"
                    title="Edit Client Details"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-100"
                    title="Delete Client"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No clients found matching your search.</p>
            <p className="text-sm text-slate-400 mt-1">
              {showDueOnly ? 'Try turning off the "Dues Only" filter.' : 'Add a new client to get started.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientManager;
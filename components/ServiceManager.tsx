import React, { useState, useMemo } from 'react';
import { ServiceDefinition } from '../types';
import { formatCurrency } from '../constants';
import { 
  Plus, Edit2, Trash2, X, Save, Layers, Search, 
  LayoutGrid, LayoutList, Copy, Check, BarChart3,
  Zap, Globe, PenTool, Search as SearchIcon, Megaphone
} from 'lucide-react';

interface ServiceManagerProps {
  services: ServiceDefinition[];
  setServices: React.Dispatch<React.SetStateAction<ServiceDefinition[]>>;
}

const ServiceManager: React.FC<ServiceManagerProps> = ({ services, setServices }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<ServiceDefinition>>({});
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Helpers ---
  
  // Deterministic icon/color based on service name keywords
  const getServiceVisuals = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('seo') || n.includes('search')) return { icon: SearchIcon, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    if (n.includes('ad') || n.includes('meta') || n.includes('google')) return { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (n.includes('web') || n.includes('dev')) return { icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' };
    if (n.includes('content') || n.includes('blog') || n.includes('write')) return { icon: PenTool, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' };
    return { icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  };

  const handleEdit = (service: ServiceDefinition) => {
    setCurrentService(service);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentService({});
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service? It will not affect existing client invoices.')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleCopy = (service: ServiceDefinition) => {
    const text = `${service.name} - ${formatCurrency(service.price)}\n${service.description}`;
    navigator.clipboard.writeText(text);
    setCopiedId(service.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentService.name || !currentService.price) return;

    if (currentService.id) {
      // Update
      setServices(services.map(s => s.id === currentService.id ? { ...s, ...currentService } as ServiceDefinition : s));
    } else {
      // Create
      const newService: ServiceDefinition = {
        id: Date.now().toString(),
        name: currentService.name!,
        price: Number(currentService.price),
        description: currentService.description || '',
        notes: currentService.notes || ''
      };
      setServices([...services, newService]);
    }
    setIsEditing(false);
    setCurrentService({});
  };

  // --- Filtering & Stats ---

  const filteredServices = useMemo(() => {
    return services.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  const stats = useMemo(() => {
    const total = services.length;
    const avgPrice = total > 0 ? services.reduce((acc, s) => acc + s.price, 0) / total : 0;
    const maxPrice = total > 0 ? Math.max(...services.map(s => s.price)) : 0;
    return { total, avgPrice, maxPrice };
  }, [services]);

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm placeholder-slate-400";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Services Catalog</h2>
          <p className="text-slate-500 text-sm">Manage your agency's offerings and standard pricing tiers.</p>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
          >
            <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Add Service</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
               <Layers className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Services</p>
               <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
               <BarChart3 className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Ticket Size</p>
               <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.avgPrice)}</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
               <Zap className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Highest Value</p>
               <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.maxPrice)}</p>
            </div>
         </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
           <input 
             type="text" 
             placeholder="Search services..." 
             className="w-full pl-10 pr-4 py-2 text-sm border-none focus:ring-0 bg-transparent text-slate-800 placeholder-slate-400"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
           <button 
             onClick={() => setViewMode('GRID')}
             className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <LayoutGrid className="h-4 w-4" />
           </button>
           <button 
             onClick={() => setViewMode('LIST')}
             className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <LayoutList className="h-4 w-4" />
           </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
           <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-slate-300" />
           </div>
           <h3 className="text-lg font-medium text-slate-900">No services found</h3>
           <p className="text-slate-500 mt-1">Try adjusting your search or add a new service.</p>
        </div>
      ) : (
        <>
          {viewMode === 'GRID' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map(service => {
                const visuals = getServiceVisuals(service.name);
                const VisualIcon = visuals.icon;
                return (
                  <div key={service.id} className={`bg-white rounded-xl border ${visuals.border} shadow-sm hover:shadow-md transition-all group flex flex-col overflow-hidden`}>
                    <div className={`p-5 border-b border-slate-50 flex items-start justify-between ${visuals.bg}`}>
                       <div className="flex items-center gap-3">
                          <div className={`p-2.5 bg-white rounded-lg shadow-sm ${visuals.color}`}>
                             <VisualIcon className="h-5 w-5" />
                          </div>
                          <div>
                             <h3 className="font-bold text-slate-800 leading-tight">{service.name}</h3>
                             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Service</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                       <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed flex-1">
                          {service.description || 'No detailed description available.'}
                       </p>
                       
                       <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100">
                          <div>
                             <p className="text-xs text-slate-400 font-medium mb-1">Standard Rate</p>
                             <p className="text-xl font-bold text-slate-900">{formatCurrency(service.price)}</p>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleCopy(service)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors tooltip"
                              title="Copy details"
                            >
                              {copiedId === service.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button onClick={() => handleEdit(service)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(service.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                       </div>
                    </div>
                    {service.notes && (
                      <div className="bg-slate-50 px-5 py-2 border-t border-slate-100">
                         <p className="text-xs text-slate-400 italic truncate"><span className="font-semibold">Note:</span> {service.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'LIST' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                     <tr>
                       <th className="px-6 py-4">Service Name</th>
                       <th className="px-6 py-4">Description</th>
                       <th className="px-6 py-4 text-right">Price</th>
                       <th className="px-6 py-4 text-center">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredServices.map(service => {
                        const visuals = getServiceVisuals(service.name);
                        const VisualIcon = visuals.icon;
                        return (
                         <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className={`p-2 bg-slate-100 rounded-lg ${visuals.color}`}>
                                   <VisualIcon className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-slate-800">{service.name}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 max-w-xs truncate text-slate-500">
                             {service.description}
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-slate-700">
                             {formatCurrency(service.price)}
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleEdit(service)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(service.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-600" />
                    {currentService.id ? 'Edit Service Details' : 'Create New Service'}
                 </h3>
                 <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="h-5 w-5" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="service-form" onSubmit={handleSave} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Service Name</label>
                      <input required type="text" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} className={inputClass} placeholder="e.g. SEO Optimization" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Standard Price (₹)</label>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                         <input required type="number" value={currentService.price || ''} onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})} className={`${inputClass} pl-8`} placeholder="0.00" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                      <textarea value={currentService.description || ''} onChange={e => setCurrentService({...currentService, description: e.target.value})} className={`${inputClass} h-28 resize-none`} placeholder="Describe deliverables, timelines, and scope..." />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internal Notes (Optional)</label>
                      <input type="text" value={currentService.notes || ''} onChange={e => setCurrentService({...currentService, notes: e.target.value})} className={inputClass} placeholder="e.g. Outsourced to vendor X" />
                      <p className="text-[10px] text-slate-400 mt-1">These notes are for your team only and won't appear on basic invoices.</p>
                    </div>
                </form>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                 <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                 <button form="service-form" type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-100 transition-all flex items-center gap-2 text-sm">
                    <Save className="h-4 w-4" /> Save Service
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManager;

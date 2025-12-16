import React, { useState } from 'react';
import { ServiceDefinition } from '../types';
import { formatCurrency } from '../constants';
import { Plus, Edit2, Trash2, X, Save, Layers } from 'lucide-react';

interface ServiceManagerProps {
  services: ServiceDefinition[];
  setServices: React.Dispatch<React.SetStateAction<ServiceDefinition[]>>;
}

const ServiceManager: React.FC<ServiceManagerProps> = ({ services, setServices }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<ServiceDefinition>>({});

  const handleEdit = (service: ServiceDefinition) => {
    setCurrentService(service);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentService({});
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      setServices(services.filter(s => s.id !== id));
    }
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

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm placeholder-slate-400";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Services Catalog</h2>
          <p className="text-slate-500">Define your agency's offerings and standard pricing.</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus className="h-5 w-5" /> Add New Service
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg relative animate-in slide-in-from-top-4">
           <button 
             onClick={() => setIsEditing(false)}
             className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
           >
             <X className="h-5 w-5" />
           </button>
           <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Layers className="h-5 w-5 text-indigo-600" />
             {currentService.id ? 'Edit Service' : 'New Service'}
           </h3>
           <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service Name</label>
                <input required type="text" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} className={inputClass} placeholder="e.g. SEO Optimization" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Standard Price (₹)</label>
                <input required type="number" value={currentService.price || ''} onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Notes</label>
                <input type="text" value={currentService.notes || ''} onChange={e => setCurrentService({...currentService, notes: e.target.value})} className={inputClass} placeholder="e.g. Outsourced to partner" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea value={currentService.description || ''} onChange={e => setCurrentService({...currentService, description: e.target.value})} className={`${inputClass} h-24 resize-none`} placeholder="Describe deliverables..." />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2">
                  <Save className="h-4 w-4" /> Save Service
                </button>
              </div>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(service => (
          <div key={service.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-slate-800">{service.name}</h3>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(service)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(service.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-2">{formatCurrency(service.price)}</p>
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{service.description || 'No description provided.'}</p>
            {service.notes && (
              <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                <span className="font-semibold">Note:</span> {service.notes}
              </div>
            )}
          </div>
        ))}
        {services.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            No services defined yet. Click "Add New Service" to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceManager;
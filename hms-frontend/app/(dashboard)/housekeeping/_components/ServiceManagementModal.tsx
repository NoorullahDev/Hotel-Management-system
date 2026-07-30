import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ServiceManagementModal({ onClose, category = 'Laundry' }: { onClose: () => void, category?: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['housekeepingServices', category],
    queryFn: async () => {
      const res = await api.get<any>(`/api/housekeeping/services?category=${category}`);
      return Array.isArray(res) ? res : res.data || [];
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['hotelSettings'],
    queryFn: async () => await api.get<any>('/api/settings')
  });

  const currency = settings?.currency || 'PKR';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return alert('Name and Price are required');

    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/api/housekeeping/services/${editingId}`, { name, price: Number(price) });
      } else {
        await api.post('/api/housekeeping/services', { category, name, price: Number(price), isActive: true });
      }
      queryClient.invalidateQueries({ queryKey: ['housekeepingServices', category] });
      setName('');
      setPrice('');
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/housekeeping/services/${id}`, { isActive: !currentStatus });
      queryClient.invalidateQueries({ queryKey: ['housekeepingServices', category] });
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.delete(`/api/housekeeping/services/${id}`);
      queryClient.invalidateQueries({ queryKey: ['housekeepingServices', category] });
    } catch (err: any) {
      alert(err.message || 'Failed to delete service');
    }
  };

  const startEdit = (service: any) => {
    setEditingId(service.id);
    setName(service.name);
    setPrice(String(service.price));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setPrice('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl max-h-[90vh] overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-theme-border">
          <h2 className="text-xl font-bold text-theme-text">{category} Management</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-[500px]">
          
          {/* List Section */}
          <div className="flex-1 border-r border-theme-border p-6 overflow-y-auto">
            <h3 className="text-lg font-bold text-theme-text mb-4">Current Services</h3>
            
            {isLoading ? (
              <div className="text-theme-muted">Loading...</div>
            ) : services.length === 0 ? (
              <div className="text-theme-muted text-center py-8">No services found. Add one on the right.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {services.map((svc: any) => (
                  <div key={svc.id} className="bg-theme-main border border-theme-border p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-theme-text">{svc.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${svc.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {svc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span className="text-primary font-bold">{currency} {Number(svc.price).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleToggleStatus(svc.id, svc.isActive)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${svc.isActive ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-green-500/30 text-green-500 hover:bg-green-500/10'}`}
                      >
                        {svc.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        onClick={() => startEdit(svc)}
                        className="p-2 text-theme-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(svc.id)}
                        className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="w-80 p-6 bg-theme-main flex flex-col">
            <h3 className="text-lg font-bold text-theme-text mb-4">
              {editingId ? 'Edit Service' : 'Add New Service'}
            </h3>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">{category} Item Name *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-theme-card border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                  placeholder={category === 'Laundry' ? "e.g. Shirt Wash" : category === 'Pantry' ? "e.g. Mineral Water" : category === 'Amenities' ? "e.g. Extra Pillow" : category === 'Other Services' ? "e.g. Airport Pickup" : `e.g. ${category} Item`}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Price ({currency}) *</label>
                <input 
                  type="text" 
                  value={price}
                  onChange={e => {
                    // Only allow numbers and decimal point
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setPrice(val);
                  }}
                  className="bg-theme-card border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                  placeholder="e.g. 250"
                  required
                />
              </div>

              <div className="mt-4 flex gap-2">
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="flex-1 px-4 py-3 bg-theme-card border border-theme-border text-theme-muted-light rounded-xl font-medium active:scale-95 transition-all">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-medium text-sm active:scale-95 shadow-md flex items-center justify-center gap-2">
                  <Plus size={18} /> {editingId ? 'Update' : 'Add Service'}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

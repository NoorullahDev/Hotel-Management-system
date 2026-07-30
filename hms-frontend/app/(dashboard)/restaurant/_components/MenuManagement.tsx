"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Image as ImageIcon, UploadCloud, Clock, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function MenuManagement({ currency }: { currency: string }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('All Items');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    preparationTime: '',
    isAvailable: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: async () => {
      try {
        const data = await api.get<any>('/api/restaurant/categories');
        return [{ id: 'all', name: 'All Items' }, ...data];
      } catch {
        return [{ id: 'all', name: 'All Items' }];
      }
    }
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      try {
        return await api.get<any>('/api/restaurant/menu');
      } catch {
        return [];
      }
    }
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      let imageUrl = '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadData = await api.post<any>('/api/upload', formData);
        imageUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}` + uploadData.imageUrl;
      }

      const payload = {
        name: newItem.name,
        category: newItem.category,
        price: parseFloat(newItem.price),
        description: newItem.description || undefined,
        preparationTime: newItem.preparationTime ? parseInt(newItem.preparationTime, 10) : undefined,
        isAvailable: newItem.isAvailable,
        imageUrl: imageUrl || undefined,
      };

      if (editingId) {
        await api.put(`/api/restaurant/menu/${editingId}`, payload);
      } else {
        await api.post('/api/restaurant/menu', payload);
      }
      
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setIsAdding(false);
      setEditingId(null);
      setNewItem({ name: '', category: categories[1]?.name || '', price: '', description: '', preparationTime: '', isAvailable: true });
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (item: any) => {
    setNewItem({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description || '',
      preparationTime: item.preparationTime != null ? String(item.preparationTime) : '',
      isAvailable: item.isAvailable !== false,
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.delete(`/api/restaurant/menu/${id}`);
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await api.post('/api/restaurant/categories', { name: newCategoryName });
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      setNewCategoryName('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.delete(`/api/restaurant/categories/${id}`);
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredItems = activeTab === 'All Items' ? menuItems : menuItems.filter((i: any) => i.category === activeTab);

  return (
    <div className="mt-8 border-t border-theme-border pt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-theme-text mb-1">Menu Management</h2>
          <div className="flex gap-2 mt-4 flex-wrap">
            {categories.map((c: any) => (
              <button 
                key={c.id}
                onClick={() => setActiveTab(c.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === c.name ? 'bg-theme-hover text-theme-text' : 'text-theme-muted hover:text-theme-text hover:bg-theme-card'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsManagingCategories(true)}
            className="bg-theme-card shadow-soft border border-theme-border text-theme-muted-light hover:text-theme-text px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
          >
            Manage Categories
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewItem(prev => ({ ...prev, name: '', price: '', description: '', preparationTime: '', isAvailable: true, category: activeTab !== 'All Items' ? activeTab : (categories[1]?.name || '') }));
              setIsAdding(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white border border-primary/50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm active:scale-95 shadow-md"
          >
            <Plus size={18} /> Add New Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {filteredItems.map((item: any) => (
          <div key={item.id} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-4 flex gap-4 group hover:border-[#3b82f6] transition-colors relative overflow-hidden">
            <div className="w-16 h-16 rounded-xl bg-theme-main flex items-center justify-center shrink-0 overflow-hidden border border-theme-border">
              {item.imageUrl ? (
                <img loading="lazy" decoding="async" src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={24} className="text-theme-muted" />
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h4 className="text-sm font-bold text-theme-text line-clamp-1">{item.name}</h4>
              <p className="text-xs text-theme-muted">{item.category}</p>
              {item.description && (
                <p className="text-xs text-theme-muted-light line-clamp-1 mt-0.5">{item.description}</p>
              )}
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-400">{currency} {Number(item.price).toFixed(2)}</span>
                  {item.preparationTime && (
                    <span className="flex items-center gap-1 text-[10px] text-theme-muted-light">
                      <Clock size={10} /> {item.preparationTime}m
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.isAvailable !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {item.isAvailable !== false ? '● Available' : '● Out of Stock'}
                  </span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditClick(item)} className="text-theme-muted hover:text-blue-400"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-theme-muted hover:text-red-400"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && !isAdding && (
          <div className="col-span-4 text-center py-12 text-theme-muted-light">
            No items in this category.
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddItem} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-lg flex flex-col shadow-2xl p-6 gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold text-theme-text">{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
            
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Item Name *</label>
              <input type="text" className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required placeholder="e.g. Grilled Chicken" />
            </div>
            
            {/* Category */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Category *</label>
              <select className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} required>
                <option value="" disabled>Select Category</option>
                {categories.filter((c:any) => c.name !== 'All Items').map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            
            {/* Price */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Price ({currency}) *</label>
              <input type="number" step="0.01" min="0" className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required placeholder="0.00" />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Description <span className="text-theme-muted text-xs">(Optional)</span></label>
              <textarea className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary resize-none h-20 text-sm" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Brief description of the item..." />
            </div>

            {/* Preparation Time */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Preparation Time <span className="text-theme-muted text-xs">(Optional — minutes)</span></label>
              <input type="number" min="1" className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary" value={newItem.preparationTime} onChange={e => setNewItem({...newItem, preparationTime: e.target.value})} placeholder="e.g. 15" />
            </div>

            {/* Availability */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Availability</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, isAvailable: true})}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-colors ${newItem.isAvailable ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-theme-main border-theme-border text-theme-muted hover:bg-theme-hover'}`}
                >
                  <CheckCircle size={16} /> Available
                </button>
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, isAvailable: false})}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-colors ${!newItem.isAvailable ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-theme-main border-theme-border text-theme-muted hover:bg-theme-hover'}`}
                >
                  <XCircle size={16} /> Out of Stock
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Dish Image <span className="text-theme-muted text-xs">(Optional)</span></label>
              <label className="border-2 border-dashed border-theme-border hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-theme-main">
                <UploadCloud size={24} className="text-theme-muted" />
                <span className="text-sm text-theme-muted">{selectedFile ? selectedFile.name : 'Click to upload image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); setSelectedFile(null); }} className="px-5 py-2.5 rounded-xl text-theme-muted-light hover:bg-theme-hover">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50 active:scale-95 shadow-md">
                {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Item')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isManagingCategories && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-md flex flex-col shadow-2xl p-6 gap-5">
            <h3 className="text-xl font-bold text-theme-text">Manage Categories</h3>
            
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
              {categories.filter((c:any) => c.name !== 'All Items').map((c: any) => (
                <div key={c.id} className="flex justify-between items-center bg-theme-main p-3 rounded-xl border border-theme-border">
                  <span className="text-sm font-medium text-theme-text">{c.name}</span>
                  <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2 mt-2">
              <input 
                type="text" 
                placeholder="New Category Name" 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none flex-1 text-sm focus:border-primary" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                required 
              />
              <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-medium text-sm active:scale-95 shadow-md">
                Add
              </button>
            </form>
            
            <div className="flex justify-end mt-2">
              <button type="button" onClick={() => setIsManagingCategories(false)} className="px-5 py-2.5 rounded-xl bg-theme-hover text-theme-text hover:bg-theme-hover">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

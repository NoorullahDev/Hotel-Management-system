'use client';
import React, { useState, useEffect } from 'react';
import { User, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AccountTab({ setHasUnsavedChanges }: { setHasUnsavedChanges?: (val: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['accountSettings'],
    queryFn: async () => {
      try {
        return await api.get<any>('/api/settings/account');
      } catch {
        return null;
      }
    }
  });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const data = await api.post<any>('/api/upload', formData);
      if (data.imageUrl) {
        setProfilePhoto(data.imageUrl);
        setHasUnsavedChanges?.(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const updatedUser = await api.patch<any>('/api/settings/account', { name, phone, profilePhoto });
      
      const currentStorageStr = localStorage.getItem('hms_user');
      if (currentStorageStr) {
        try {
          const currentStorage = JSON.parse(currentStorageStr);
          localStorage.setItem('hms_user', JSON.stringify({ 
            ...currentStorage, 
            name: updatedUser.name, 
            profilePhoto: updatedUser.profilePhoto,
            avatar: updatedUser.profilePhoto
          }));
        } catch (e) {}
      }
      
      setSuccess('Profile updated successfully');
      setHasUnsavedChanges?.(false);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-theme-muted p-6 flex items-center"><Loader2 className="animate-spin mr-2" /> Loading profile...</div>;

  return (
    <div className="max-w-2xl">
      <div className="bg-theme-secondary border border-theme-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-primary">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-theme-text font-medium">Profile Settings</h3>
            <p className="text-sm text-theme-muted">Update your personal information and avatar</p>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl">{error}</div>}
        {success && <div className="mb-4 flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-xl"><CheckCircle size={16} />{success}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <img loading="lazy" decoding="async" 
              src={profilePhoto ? (profilePhoto.startsWith('http') ? profilePhoto : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${profilePhoto}`) : 'https://i.pravatar.cc/150'} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full object-cover border-2 border-theme-border" 
            />
            <div>
              <label className="bg-theme-main hover:bg-theme-card shadow-soft border border-theme-border text-theme-text px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors inline-block">
                {isUploading ? 'Uploading...' : 'Change Avatar'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
              </label>
              <p className="text-xs text-theme-muted-light mt-2">JPG, GIF or PNG. Max size of 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setHasUnsavedChanges?.(true); }} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Phone Number</label>
              <input type="text" value={phone} onChange={e => { setPhone(e.target.value); setHasUnsavedChanges?.(true); }} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
            </div>
          </div>
          
          <button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-primary/90 text-white font-medium p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center active:scale-95 shadow-md">
            {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}

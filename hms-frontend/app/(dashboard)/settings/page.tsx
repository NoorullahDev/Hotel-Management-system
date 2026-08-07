'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Building,
  Users,
  Shield,
  User,
  Loader2,
  Database
} from 'lucide-react';
import UserManagementTab from './_components/UserManagementTab';
import SecurityTab from './_components/SecurityTab';
import AccountTab from './_components/AccountTab';
import GeneralSettingsTab from './_components/GeneralSettingsTab';
import HotelSettingsTab from './_components/HotelSettingsTab';
import BackupRestoreTab from './_components/BackupRestoreTab';
import TaxTab from './_components/TaxTab';
import CurrencyTab from './_components/CurrencyTab';
import RolesTab from './_components/RolesTab';
import PermissionsTab from './_components/PermissionsTab';
import AuditLogsTab from './_components/AuditLogsTab';
import LicenseTab from './_components/LicenseTab';
import { DollarSign, Percent, KeySquare, ScrollText, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = [
  { id: 'general', name: 'General Settings', icon: SettingsIcon },
  { id: 'hotel', name: 'Hotel Settings', icon: Building },
  { id: 'tax', name: 'Tax', icon: Percent },
  { id: 'currency', name: 'Currency', icon: DollarSign },
  { id: 'account', name: 'My Profile', icon: User },
  { id: 'users', name: 'User Management', icon: Users },
  { id: 'roles', name: 'Roles', icon: Shield },
  { id: 'permissions', name: 'Permissions', icon: KeySquare },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'backup', name: 'Backup & Restore', icon: Database },
  { id: 'audit', name: 'Audit Logs', icon: ScrollText },
  { id: 'license', name: 'License', icon: ShieldCheck },
];

function SettingsContent() {
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('hms_user');
    let role = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        role = user.role;
        setUserRole(role);
      } catch (e) {}
    }
    
    // Default active tab based on role if no tab in URL
    const defaultTab = role === 'Admin' ? 'general' : 'account';
    const tab = searchParams.get('tab') || defaultTab;
    
    const allowedCategories = CATEGORIES.filter(c => role === 'Admin' || ['account', 'security', 'license'].includes(c.id));
    if (tab && allowedCategories.some(c => c.id === tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab(defaultTab);
    }

    if (role === 'Admin' || role === 'Manager') {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    try {
      const data = await api.get<any>('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (category: string, key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value
      }
    }));
  };

  const handleSaveCategory = async (category: string) => {
    try {
      await api.patch('/api/settings', {
        category,
        updates: settings[category] || {}
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const renderActiveForm = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsTab settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveCategory} setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'hotel':
        return <HotelSettingsTab settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveCategory} setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'tax':
        return <TaxTab settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveCategory} setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'currency':
        return <CurrencyTab settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveCategory} setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'account':
        return <AccountTab setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'users':
        return <UserManagementTab />;
      case 'roles':
        return <RolesTab />;
      case 'permissions':
        return <PermissionsTab />;
      case 'security':
        return <SecurityTab setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'backup':
        return <BackupRestoreTab />;
      case 'audit':
        return <AuditLogsTab />;
      case 'license':
        return <LicenseTab />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-144px)] items-center justify-center text-theme-muted">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-144px)] overflow-hidden rounded-2xl border border-theme-border bg-theme-main">
      {/* Sidebar */}
      <div className="w-64 bg-theme-secondary border-r border-theme-border overflow-y-auto hidden md:block hide-scrollbar">
        <div className="p-4 border-b border-theme-border sticky top-0 bg-theme-secondary/90 backdrop-blur z-10">
          <h2 className="text-theme-text font-semibold">Settings Modules</h2>
          <p className="text-xs text-theme-muted mt-1">Manage system configurations</p>
        </div>
        <div className="p-2 space-y-1">
          {CATEGORIES.filter(c => userRole === 'Admin' || ['account', 'security', 'license'].includes(c.id)).map(category => (
            <button
              key={category.id}
              onClick={(e) => {
                if (activeTab === category.id) return;
                if (hasUnsavedChanges) {
                  if (!window.confirm('You have unsaved changes. Are you sure you want to leave this tab? Your changes will be lost.')) {
                    e.preventDefault();
                    return;
                  }
                  setHasUnsavedChanges(false);
                }
                setActiveTab(category.id);
                router.push(`/settings?tab=${category.id}`);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === category.id 
                ? 'bg-blue-600/10 text-blue-500' 
                : 'text-theme-muted hover:bg-theme-hover hover:text-theme-text'
              }`}
            >
              <category.icon size={18} className={activeTab === category.id ? 'text-blue-500' : 'text-theme-muted-light'} />
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-theme-main overflow-hidden">
        <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-secondary">
          <div>
            <h1 className="text-2xl font-bold text-theme-text flex items-center gap-2">
              {(() => {
                const activeCategory = CATEGORIES.find(c => c.id === activeTab);
                return activeCategory ? <activeCategory.icon size={24} className="text-primary" /> : null;
              })()}
              {CATEGORIES.find(c => c.id === activeTab)?.name}
            </h1>
            <p className="text-theme-muted text-sm mt-1">Configure parameters and options for this module.</p>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-theme-border bg-theme-secondary/50">
          {CATEGORIES.filter(c => userRole === 'Admin' || ['account', 'security', 'license'].includes(c.id)).map(category => (
            <button
              key={category.id}
              onClick={(e) => {
                if (activeTab === category.id) return;
                if (hasUnsavedChanges) {
                  if (!window.confirm('You have unsaved changes. Are you sure you want to leave this tab? Your changes will be lost.')) {
                    e.preventDefault();
                    return;
                  }
                  setHasUnsavedChanges(false);
                }
                setActiveTab(category.id);
                router.push(`/settings?tab=${category.id}`);
              }}
              className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === category.id ? 'border-b-2 border-primary text-primary' : 'text-theme-muted hover:text-theme-text'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="max-w-4xl mx-auto pb-24">
            {renderActiveForm()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-144px)] items-center justify-center text-theme-muted"><Loader2 className="animate-spin w-8 h-8 mr-2" />Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

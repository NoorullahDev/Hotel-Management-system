'use client';
import React, { useState, useEffect } from 'react';
import { ScrollText, Loader2, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  userId: string;
  user: { name: string; email: string };
  action: string;
  module: string;
  details: string;
  createdAt: string;
}

export default function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  
  useEffect(() => {
    fetchLogs();
  }, [page, moduleFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (moduleFilter) params.set('module', moduleFilter);
      
      const data = await api.get<any>(`/api/audit-logs?${params}`);
      setLogs(data.data);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-theme-text font-semibold flex items-center gap-2">
            <ScrollText size={20} className="text-primary" />
            System Audit Logs
          </h3>
          <p className="text-sm text-theme-muted">Track all significant system events and user actions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" />
            <select
              value={moduleFilter}
              onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
              className="pl-9 pr-8 py-2.5 bg-theme-main border border-theme-border rounded-xl text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="">All Modules</option>
              <option value="Auth">Auth</option>
              <option value="Booking">Booking</option>
              <option value="Settings">Settings</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Room Management">Room Management</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-theme-secondary border border-theme-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-theme-border bg-theme-main">
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Date & Time</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">User</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Action</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Module</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-theme-muted-light"><Loader2 className="animate-spin inline mr-2" size={18} />Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-theme-muted-light">No audit logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="border-b border-theme-border/50 hover:bg-theme-hover/20 transition-colors">
                  <td className="p-4 whitespace-nowrap text-sm text-theme-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-theme-text font-medium">
                    {log.user?.name || 'System'}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-theme-main border border-theme-border rounded-md text-xs font-medium text-theme-muted-light">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-theme-muted">{log.module}</td>
                  <td className="p-4 text-sm text-theme-muted-light max-w-md truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-theme-border bg-theme-main flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-theme-secondary border border-theme-border rounded-lg text-sm font-medium text-theme-text disabled:opacity-50 transition-colors hover:bg-theme-hover"
            >
              Previous
            </button>
            <span className="text-sm text-theme-muted">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-theme-secondary border border-theme-border rounded-lg text-sm font-medium text-theme-text disabled:opacity-50 transition-colors hover:bg-theme-hover"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

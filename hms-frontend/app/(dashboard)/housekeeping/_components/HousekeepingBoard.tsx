'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskCard from './TaskCard';
import { Trash2, Loader, CheckSquare, Eye, Users, Search } from 'lucide-react';
import AssignStaffModal from './AssignStaffModal';
import TaskDetailsSidebar from './TaskDetailsSidebar';
import { api } from '@/lib/api';

export default function HousekeepingBoard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['housekeepingTasks'],
    queryFn: async () => {
      const data = await api.get<any>('/api/housekeeping/tasks');
      return data;
    }
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => {
      const data = await api.get<any>('/api/housekeeping/staff');
      return data;
    }
  });

  const handleStatusChange = async (taskId: string, status: string, staffId?: string) => {
    try {
      const body: any = { status };
      if (staffId !== undefined) body.staffId = staffId;

      const updated = await api.patch<any>(`/api/housekeeping/tasks/${taskId}`, body);
      queryClient.invalidateQueries({ queryKey: ['housekeepingTasks'] });
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: updated.status, staffId: updated.staffId || selectedTask.staffId, staff: updated.staff || selectedTask.staff });
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update task');
    }
  };

  const handleAssignNewTask = async (data: any) => {
    try {
      await api.post('/api/housekeeping/tasks', data);
      queryClient.invalidateQueries({ queryKey: ['housekeepingTasks'] });
      setShowAssignModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to assign task');
    }
  };


  // Filter tasks based on search
  const filteredTasks = (tasks || []).filter((t: any) => {
    const q = searchQuery.toLowerCase();
    return String(t.room?.number).toLowerCase().includes(q) || (t.staff && t.staff.user.name.toLowerCase().includes(q));
  });

  const assignedTasks = filteredTasks.filter((t: any) => t.status === 'ASSIGNED');
  const inProgressTasks = filteredTasks.filter((t: any) => t.status === 'IN_PROGRESS');
  const completedTasks = filteredTasks.filter((t: any) => t.status === 'COMPLETED');
  const inspectedTasks = filteredTasks.filter((t: any) => t.status === 'INSPECTED');

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Header controls moved from page.tsx */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Housekeeping Management</h1>
          <p className="text-theme-muted text-sm">Manage room cleaning tasks, staff assignments and inspections</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={16} />
            <input 
              type="text" 
              placeholder="Search room number or staff..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-theme-card shadow-soft border border-theme-border text-theme-text text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none w-64 focus:border-primary transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowAssignModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors active:scale-95 shadow-md"
          >
            Assign Staff
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-theme-card shadow-soft border border-red-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500">
            <Trash2 size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-theme-text">{assignedTasks.length}</h3>
            <p className="text-theme-muted text-xs">Rooms Pending Cleaning</p>
          </div>
        </div>
        <div className="bg-theme-card shadow-soft border border-orange-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-500">
            <Loader size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-theme-text">{inProgressTasks.length}</h3>
            <p className="text-theme-muted text-xs">In Progress</p>
          </div>
        </div>
        <div className="bg-theme-card shadow-soft border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 text-green-500">
            <CheckSquare size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-theme-text">{completedTasks.length}</h3>
            <p className="text-theme-muted text-xs">Completed Today</p>
          </div>
        </div>
        <div className="bg-theme-card shadow-soft border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-primary">
            <Eye size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-theme-text">{inspectedTasks.length}</h3>
            <p className="text-theme-muted text-xs">Inspected Today</p>
          </div>
        </div>
        <div className="bg-theme-card shadow-soft border border-purple-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-theme-text">{staffData?.length || 0}</h3>
            <p className="text-theme-muted text-xs">Staff On Duty</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-6">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <h3 className="text-theme-text font-bold text-sm">Assigned</h3>
            </div>
            <span className="text-theme-muted-light text-xs font-bold">{assignedTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4">
            {assignedTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} staffList={staffData} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <h3 className="text-theme-text font-bold text-sm">In Progress</h3>
            </div>
            <span className="text-theme-muted-light text-xs font-bold">{inProgressTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4">
            {inProgressTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} staffList={staffData} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <h3 className="text-theme-text font-bold text-sm">Completed</h3>
            </div>
            <span className="text-theme-muted-light text-xs font-bold">{completedTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4">
            {completedTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} staffList={staffData} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </div>

        {/* Column 4 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h3 className="text-theme-text font-bold text-sm">Inspected</h3>
            </div>
            <span className="text-theme-muted-light text-xs font-bold">{inspectedTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4">
            {inspectedTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} staffList={staffData} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignStaffModal 
          onClose={() => setShowAssignModal(false)} 
          staffList={staffData} 
          onAssign={handleAssignNewTask} 
        />
      )}

      {selectedTask && (
        <TaskDetailsSidebar 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onStatusChange={handleStatusChange}
          staffList={staffData}
        />
      )}
    </div>
  );
}

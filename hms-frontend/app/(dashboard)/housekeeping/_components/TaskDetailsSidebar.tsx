import React from 'react';
import { X, Clock, User, Info, CheckCircle2, Calendar, FileText, MapPin } from 'lucide-react';

export default function TaskDetailsSidebar({ task, onClose, onStatusChange, staffList }: any) {
  if (!task) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-theme-card shadow-soft border-l border-theme-border shadow-2xl z-40 flex flex-col transform transition-transform translate-x-0">
      <div className="flex justify-between items-center p-6 border-b border-theme-border">
        <div>
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
            {task.room ? (
              `Room ${task.room.number}`
            ) : (
              <><MapPin size={20} className="text-blue-400" /> {task.area}</>
            )}
          </h2>
          <p className="text-sm text-theme-muted">{task.taskType} Task Details</p>
        </div>
        <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* Urgent Warning */}
        {task.priority === 'Urgent' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <Info size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-400">Urgent Priority</h3>
              <p className="text-xs text-red-300/80 mt-1">This task requires immediate attention and should be prioritized over others.</p>
            </div>
          </div>
        )}

        {/* Status & Priority */}
        <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-theme-muted">Current Status</span>
            <span className="text-sm font-bold text-theme-text px-2 py-1 rounded bg-theme-hover uppercase">{task.status.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-theme-muted">Priority</span>
            <span className={`text-sm font-bold px-2 py-1 rounded uppercase ${task.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' : 'bg-theme-hover text-white'}`}>
              {task.priority}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-theme-muted">Task Type</span>
            <span className="text-sm font-bold text-theme-text px-2 py-1 rounded bg-theme-hover uppercase">{task.taskType}</span>
          </div>
        </div>

        {/* Notes */}
        {task.notes && (
          <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-theme-text flex items-center gap-2 mb-1">
              <FileText size={16} className="text-amber-500" /> Special Instructions
            </h3>
            <p className="text-sm text-amber-200/80 leading-relaxed bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
              {task.notes}
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-theme-text flex items-center gap-2 mb-1">
            <Clock size={16} className="text-primary" /> Time Tracking
          </h3>
          
          {task.scheduledDate ? (
            <div className="flex justify-between items-center bg-blue-500/5 p-2 rounded-lg border border-primary/10">
              <span className="text-xs text-theme-muted flex items-center gap-1.5"><Calendar size={14}/> Scheduled For</span>
              <span className="text-xs text-theme-text font-medium">{new Date(task.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Estimated Time</span>
              <span className="text-xs text-theme-text font-medium">{task.estimatedTime} mins</span>
            </div>
          )}

          {task.startedAt && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-theme-muted">Started</span>
              <span className="text-xs text-theme-text font-medium">{new Date(task.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </div>
          )}
          {task.completedAt && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Completed</span>
              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} />
                {new Date(task.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            </div>
          )}
        </div>

        {/* Staff details */}
        <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-theme-text flex items-center gap-2 mb-1">
            <User size={16} className="text-purple-500" /> Housekeeping Staff On Duty
          </h3>
          {task.staff ? (
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-theme-hover flex items-center justify-center text-theme-text font-bold">
                {task.staff.user.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-theme-text">{task.staff.user.name}</p>
                <p className="text-xs text-theme-muted">{task.staff.user.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-theme-muted-light italic mt-2">No staff assigned</p>
          )}

          <div className="mt-4 pt-4 border-t border-theme-border">
            <label className="text-xs text-theme-muted mb-2 block">Change Assigned Staff</label>
            <select 
              className="bg-theme-card shadow-soft border border-theme-border w-full text-theme-muted-light text-sm rounded-lg py-2 px-3 outline-none focus:border-primary"
              value={task.staffId || ''}
              onChange={(e) => onStatusChange(task.id, task.status, e.target.value)}
            >
              <option value="">-- Assign Staff --</option>
              {(staffList || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.user?.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-4">
          {task.status === 'ASSIGNED' && (
            <button 
              onClick={() => { onStatusChange(task.id, 'IN_PROGRESS'); onClose(); }}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors active:scale-95 shadow-md"
            >
              Start Task
            </button>
          )}
          {task.status === 'IN_PROGRESS' && (
            <button 
              onClick={() => { onStatusChange(task.id, 'COMPLETED'); onClose(); }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Mark Complete
            </button>
          )}
          {task.status === 'COMPLETED' && (
            <button 
              onClick={() => { onStatusChange(task.id, 'INSPECTED'); onClose(); }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-theme-text font-medium py-3 rounded-xl transition-colors"
            >
              Mark Inspected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

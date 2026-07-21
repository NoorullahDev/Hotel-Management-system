import React from 'react';
import { Clock, CheckCircle2, User, MapPin, Calendar, FileText } from 'lucide-react';

export default function TaskCard({ task, onStatusChange, staffList, onClick }: any) {
  const getPriorityColor = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'urgent': return 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50';
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-orange-500/20 text-orange-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-theme-hover text-theme-muted';
    }
  };

  const getPriorityBorder = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'urgent': return 'border-red-500/50';
      case 'high': return 'border-red-500/30';
      case 'medium': return 'border-orange-500/30';
      case 'low': return 'border-green-500/30';
      default: return 'border-theme-border';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-theme-card border ${getPriorityBorder(task.priority)} rounded-xl p-4 flex flex-col gap-3 hover:bg-theme-hover/80 transition-colors cursor-pointer relative overflow-hidden`}
    >
      {task.priority === 'Urgent' && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="bg-red-500 text-white text-[10px] font-bold uppercase py-1 shadow-sm transform rotate-45 translate-x-4 translate-y-2 text-center w-24">
            Urgent
          </div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-theme-text flex items-center gap-1.5">
            {task.room ? (
              <>Room {task.room.number}</>
            ) : (
              <><MapPin size={16} className="text-blue-400" /> {task.area}</>
            )}
          </h3>
          <p className="text-xs text-theme-muted">
            {task.room ? task.room.roomType?.name : task.taskType}
          </p>
        </div>
        {task.priority !== 'Urgent' && (
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
            {task.priority || 'Medium'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <div className="flex items-center gap-2 text-xs text-theme-muted-light">
          <User size={14} className="text-theme-muted-light" />
          <span className="truncate flex-1">{task.staff ? task.staff.user.name : 'Unassigned'}</span>
        </div>

        {task.scheduledDate ? (
          <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded w-fit">
            <Calendar size={14} />
            <span>{new Date(task.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-theme-muted-light">
            <Clock size={14} className="text-theme-muted-light" />
            <span>Est. Time: {task.estimatedTime} min</span>
          </div>
        )}

        {task.notes && (
          <div className="flex items-start gap-2 text-xs text-amber-200/80 bg-amber-500/10 px-2 py-1.5 rounded mt-1">
            <FileText size={14} className="shrink-0 mt-0.5" />
            <span className="line-clamp-2">{task.notes}</span>
          </div>
        )}
      </div>

      {task.startedAt && !task.completedAt && (
        <div className="flex items-center gap-2 text-xs text-theme-muted mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          Started: {new Date(task.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </div>
      )}

      {task.completedAt && (
        <div className="flex items-center gap-2 text-xs text-green-400 mt-1">
          <CheckCircle2 size={14} />
          Completed: {new Date(task.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </div>
      )}

      <div className="mt-2 flex justify-between items-center gap-2 border-t border-theme-border pt-3">
        {task.status === 'ASSIGNED' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'IN_PROGRESS'); }}
            className="flex-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs py-1.5 rounded-lg transition-colors font-medium"
          >
            Start Task
          </button>
        )}
        {task.status === 'IN_PROGRESS' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'COMPLETED'); }}
            className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs py-1.5 rounded-lg transition-colors font-medium"
          >
            Complete
          </button>
        )}
        {task.status === 'COMPLETED' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'INSPECTED'); }}
            className="flex-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs py-1.5 rounded-lg transition-colors font-medium"
          >
            Inspect
          </button>
        )}
        {task.status === 'INSPECTED' && (
          <span className="flex-1 text-center text-theme-muted-light text-xs font-medium border border-theme-border/50 rounded-lg py-1.5 bg-theme-main">Approved</span>
        )}

        <select 
          className="bg-theme-main border border-theme-border text-theme-muted-light text-xs rounded-lg py-1.5 px-2 outline-none w-28"
          value={task.staffId || ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(task.id, task.status, e.target.value)}
        >
          <option value="">Assign Staff</option>
          {(staffList || []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.user?.name?.split(' ')[0]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

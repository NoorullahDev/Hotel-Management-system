import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AssignStaffModal({ onClose, staffList, onAssign }: any) {
  const [taskType, setTaskType] = useState('Room');
  const [roomId, setRoomId] = useState('');
  const [area, setArea] = useState('');
  const [staffId, setStaffId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const data = await api.get<any>('/api/rooms');
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskType === 'Room' && !roomId) return alert('Please select a room');
    if (taskType !== 'Room' && !area) return alert('Please enter an area name');

    setLoading(true);
    let finalDate = undefined;
    if (scheduledDate && scheduledTime) {
      finalDate = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    await onAssign({ 
      roomId: taskType === 'Room' ? roomId : undefined, 
      area: taskType !== 'Room' ? area : undefined,
      taskType,
      staffId: staffId || undefined, 
      priority,
      scheduledDate: finalDate,
      notes: notes || undefined
    });
    setLoading(false);
  };

  const taskTypes = ['Room', 'Bathroom', 'Corridor', 'Lobby', 'Swimming Pool', 'Gym', 'Restaurant', 'Spa', 'Laundry', 'Pantry', 'Amenities', 'Other Services'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-theme-border">
          <h2 className="text-xl font-bold text-theme-text">Assign Housekeeping Task</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Task Type *</label>
              <select 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={taskType}
                onChange={e => {
                  setTaskType(e.target.value);
                  if (e.target.value !== 'Room') {
                    setArea(e.target.value);
                  } else {
                    setArea('');
                  }
                }}
                required
              >
                {taskTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {taskType === 'Room' ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Select Room *</label>
                <select 
                  className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Room --</option>
                  {(rooms?.data?.data ? rooms.data.data : rooms?.data ? rooms.data : Array.isArray(rooms) ? rooms : []).map((r: any) => (
                    <option key={r.id} value={r.id}>Room {r.number} ({r.status})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Area Name *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted-light" size={18} />
                  <input 
                    type="text"
                    className="bg-theme-main w-full border border-theme-border rounded-xl pl-11 pr-4 py-3 text-theme-text outline-none focus:border-primary"
                    placeholder="e.g. Main Lobby"
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Assign Staff (Optional)</label>
                <select 
                  className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {(staffList?.data?.data ? staffList.data.data : staffList?.data ? staffList.data : Array.isArray(staffList) ? staffList : [])
                    .filter((s: any) => s.status === 'Active')
                    .map((s: any) => (
                    <option key={s.id} value={s.id}>{s.user?.name} - {s.role}</option>
                  ))}
                </select>
              </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Priority</label>
              <select 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Scheduled Date (Optional)</label>
              <input 
                type="date"
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Scheduled Time (Optional)</label>
              <input 
                type="time"
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-theme-muted-light">Notes / Special Instructions</label>
            <textarea 
              className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary resize-none h-24"
              placeholder="e.g. VIP guest arrival, requires extra towels..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2 border-t border-theme-border pt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-theme-muted-light hover:bg-theme-hover transition-colors font-medium">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors font-medium active:scale-95 shadow-md">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

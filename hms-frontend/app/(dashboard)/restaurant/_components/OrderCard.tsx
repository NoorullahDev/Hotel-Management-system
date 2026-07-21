import React from 'react';

export default function OrderCard({ order, onClick, currency }: any) {
  // Determine color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-red-500 bg-red-500/10';
      case 'Preparing': return 'text-orange-500 bg-orange-500/10';
      case 'Ready': return 'text-green-500 bg-green-500/10';
      case 'Served': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-theme-muted-light bg-theme-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-red-400';
      case 'Preparing': return 'text-orange-400';
      case 'Ready': return 'text-green-400';
      case 'Served': return 'text-blue-400';
      default: return 'text-theme-muted';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-4 flex flex-col gap-3 hover:border-[#3b82f6] transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`text-sm font-bold ${getStatusText(order.status)}`}>{order.orderNumber?.split('-')[0] + '-' + order.orderNumber?.split('-')[1]?.substring(0,4)?.toUpperCase() || 'ORD-NEW'}</h4>
          <p className="text-xs font-medium text-theme-text mt-0.5">Room {order.booking?.room?.number}</p>
          <p className="text-xs text-theme-muted">{order.booking?.guest?.name}</p>
        </div>
        <span className="text-[10px] text-theme-muted-light">
          {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mt-2">
        {order.items?.slice(0, 2).map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center text-xs">
            <span className="text-theme-muted-light line-clamp-1">{item.itemName}</span>
            <span className="text-theme-muted-light shrink-0 ml-2">x{item.quantity}</span>
          </div>
        ))}
        {order.items?.length > 2 && (
          <div className="text-[10px] text-theme-muted-light mt-1 italic">+{order.items.length - 2} more items</div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 pt-3 border-t border-theme-border">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-theme-muted-light">Wait Time:</span>
          <span className="text-[10px] font-medium text-theme-muted-light">
            {Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000)} min
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(order.status)}`}>
          {order.status === 'Pending' ? 'New' : order.status}
        </span>
      </div>
    </div>
  );
}

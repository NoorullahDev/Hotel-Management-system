import React from 'react';
import { X, Clock } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';

export default function OrderDetailsSidebar({ order, onClose, onStatusChange }: any) {
  const { currency, currencySymbol, taxRate, taxName } = useGlobalSettings();

  if (!order) return null;

  const shortId = order.orderNumber?.split('-')[0] + '-' + order.orderNumber?.split('-')[1]?.substring(0,4)?.toUpperCase() || 'ORD-NEW';

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateSubtotal = () => {
    return order.items.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0);
  };

  const subtotal = calculateSubtotal();
  const taxPct = taxRate !== undefined ? Number(taxRate) : 10;
  const taxes = subtotal * (taxPct / 100);
  const total = subtotal + taxes;

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-theme-card shadow-soft border-l border-theme-border shadow-2xl z-40 flex flex-col transform transition-transform translate-x-0">
      <div className="flex justify-between items-center p-6 border-b border-theme-border">
        <h2 className="text-xl font-bold text-theme-text">Order Details</h2>
        <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
        
        {/* Header Info */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-red-400 font-bold text-lg">{shortId}</h3>
            <div className="flex items-center gap-2 text-xs text-theme-muted mt-1">
              <Clock size={12} /> {formatTime(order.createdAt)} &bull; {formatDate(order.createdAt)}
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase bg-theme-hover text-theme-text`}>
            {order.status}
          </span>
        </div>

        {/* Guest Information */}
        <div>
          <h4 className="text-sm font-bold text-theme-text mb-3">Guest Information</h4>
          <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-theme-muted">Name</span>
              <span className="text-theme-text">{order.booking?.guest?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-theme-muted">Room Number</span>
              <span className="text-theme-text">{order.booking?.room?.number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-theme-muted">Phone</span>
              <span className="text-theme-text">{order.booking?.guest?.phone || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-theme-muted">Guests</span>
              <span className="text-theme-text">{order.booking?.guestCount || 1} Adults</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h4 className="text-sm font-bold text-theme-text mb-3 flex justify-between">
            <span>Order Items</span>
          </h4>
          <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-12 text-xs font-bold text-theme-muted-light pb-2 border-b border-theme-border">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            
            {order.items?.map((item: any) => (
              <div key={item.id} className="grid grid-cols-12 text-sm text-theme-text items-center">
                <div className="col-span-6 pr-2 line-clamp-2">{item.itemName}</div>
                <div className="col-span-2 text-center">{item.quantity}</div>
                <div className="col-span-2 text-right text-theme-muted">{currencySymbol || currency} {Number(item.price).toFixed(2)}</div>
                <div className="col-span-2 text-right font-medium">{currencySymbol || currency} {(Number(item.price) * item.quantity).toFixed(2)}</div>
              </div>
            ))}

            <div className="mt-2 pt-3 border-t border-theme-border flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-theme-muted">
                <span>Subtotal</span>
                <span>{currencySymbol || currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-theme-muted">
                <span>{taxName || 'Taxes'} ({taxPct}%)</span>
                <span>{currencySymbol || currency} {taxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-theme-text font-bold text-base pt-1">
                <span>Total Amount</span>
                <span>{currencySymbol || currency} {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kitchen Notes */}
        {order.notes && (
          <div>
            <h4 className="text-sm font-bold text-theme-text mb-2">Kitchen Notes</h4>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-sm text-amber-200/80">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Order Timeline */}
        <div>
          <h4 className="text-sm font-bold text-theme-text mb-3">Order Timeline</h4>
          <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-4 relative">
            <div className="absolute left-[21px] top-6 bottom-6 w-0.5 bg-theme-hover"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-3 h-3 rounded-full ${order.createdAt ? 'bg-green-500 ring-4 ring-theme-main' : 'bg-theme-hover'}`}></div>
              <div className="flex-1 flex justify-between text-sm">
                <span className={order.createdAt ? 'text-theme-text' : 'text-theme-muted-light'}>Order Placed</span>
                <span className="text-theme-muted">{formatTime(order.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-3 h-3 rounded-full ${order.acceptedAt || order.status !== 'Pending' ? 'bg-green-500 ring-4 ring-theme-main' : 'bg-theme-hover'}`}></div>
              <div className="flex-1 flex justify-between text-sm">
                <span className={order.acceptedAt || order.status !== 'Pending' ? 'text-theme-text' : 'text-theme-muted-light'}>Accepted</span>
                <span className="text-theme-muted">{formatTime(order.acceptedAt || (order.status !== 'Pending' ? order.createdAt : null))}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-3 h-3 rounded-full ${order.preparingAt || order.status === 'Ready' || order.status === 'Served' ? 'bg-green-500 ring-4 ring-theme-main' : 'bg-theme-hover'}`}></div>
              <div className="flex-1 flex justify-between text-sm">
                <span className={order.preparingAt || order.status === 'Ready' || order.status === 'Served' ? 'text-theme-text' : 'text-theme-muted-light'}>Started Cooking</span>
                <span className="text-theme-muted">{formatTime(order.preparingAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-3 h-3 rounded-full ${order.readyAt || order.status === 'Served' ? 'bg-green-500 ring-4 ring-theme-main' : 'bg-theme-hover'}`}></div>
              <div className="flex-1 flex justify-between text-sm">
                <span className={order.readyAt || order.status === 'Served' ? 'text-theme-text' : 'text-theme-muted-light'}>Ready</span>
                <span className="text-theme-muted">{formatTime(order.readyAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-3 h-3 rounded-full ${order.servedAt ? 'bg-green-500 ring-4 ring-theme-main' : 'bg-theme-hover'}`}></div>
              <div className="flex-1 flex justify-between text-sm">
                <span className={order.servedAt ? 'text-theme-text' : 'text-theme-muted-light'}>Served</span>
                <span className="text-theme-muted">{formatTime(order.servedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-2">
          {order.status !== 'Served' && order.status !== 'Cancelled' && (
            <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-3">
              <span className="text-sm font-bold text-theme-text mb-1">Update Status</span>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { onStatusChange(order.id, 'Pending'); onClose(); }}
                  className={`py-2.5 rounded-lg font-bold text-sm transition-colors border ${order.status === 'Pending' ? 'bg-red-600/20 text-red-500 border-red-500/50' : 'bg-theme-card text-theme-muted border-theme-border hover:bg-theme-hover'}`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => { onStatusChange(order.id, 'Preparing'); onClose(); }}
                  className={`py-2.5 rounded-lg font-bold text-sm transition-colors border ${order.status === 'Preparing' ? 'bg-orange-600/20 text-orange-500 border-orange-500/50' : 'bg-theme-card text-theme-muted border-theme-border hover:bg-theme-hover'}`}
                >
                  Start Cooking
                </button>
                <button 
                  onClick={() => { onStatusChange(order.id, 'Ready'); onClose(); }}
                  className={`py-2.5 rounded-lg font-bold text-sm transition-colors border ${order.status === 'Ready' ? 'bg-green-600/20 text-green-500 border-green-500/50' : 'bg-theme-card text-theme-muted border-theme-border hover:bg-theme-hover'}`}
                >
                  Mark Ready
                </button>
                <button 
                  onClick={() => { onStatusChange(order.id, 'Served'); onClose(); }}
                  className={`py-2.5 rounded-lg font-bold text-sm transition-colors border ${order.status === 'Served' ? 'bg-blue-600/20 text-blue-500 border-blue-500/50' : 'bg-theme-card text-theme-muted border-theme-border hover:bg-theme-hover'}`}
                >
                  Serve Order
                </button>
              </div>
            </div>
          )}
          {order.status !== 'Served' && order.status !== 'Cancelled' && (
            <button 
              onClick={() => { onStatusChange(order.id, 'Cancelled'); onClose(); }}
              className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold py-3 rounded-xl transition-colors mt-2"
            >
              Cancel Order
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

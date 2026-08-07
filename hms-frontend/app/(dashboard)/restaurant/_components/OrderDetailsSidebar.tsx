import React from 'react';
import { X, Clock } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export default function OrderDetailsSidebar({ order, onClose, currency }: any) {
  const { currencySymbol, taxRate, taxName } = useGlobalSettings();
  const queryClient = useQueryClient();

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

  const handleCancelOrder = async () => {
    if (confirm("Are you sure you want to cancel this order? This will remove the charge from the guest's folio.")) {
      try {
        await api.patch(`/api/restaurant/orders/${order.id}/status`, { status: 'Cancelled' });
        queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
        onClose();
      } catch (error) {
        console.error('Failed to cancel order', error);
      }
    }
  };

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
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            {order.status === 'Cancelled' ? 'Cancelled' : 'Recorded'}
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

        {/* Notes */}
        {order.notes && (
          <div>
            <h4 className="text-sm font-bold text-theme-text mb-2">Notes</h4>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-sm text-amber-200/80">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-2">
          {order.status !== 'Cancelled' && (
            <button 
              onClick={handleCancelOrder}
              className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold py-3 rounded-xl transition-colors mt-2"
            >
              Cancel Order (Remove Charge)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

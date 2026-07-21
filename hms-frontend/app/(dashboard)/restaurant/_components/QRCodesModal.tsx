import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer } from 'lucide-react';
import { api } from '@/lib/api';

export default function QRCodesModal({ onClose }: { onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      try {
        const json = await api.get<any>('/api/rooms?limit=1000');
        return json.data || [];
      } catch {
        return [];
      }
    }
  });

  const handlePrint = () => {
    if (printRef.current) {
      const content = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print QR Codes</title>
              <style>
                body { font-family: sans-serif; padding: 20px; text-align: center; }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 30px; }
                .card { border: 1px dashed #ccc; padding: 20px; border-radius: 10px; page-break-inside: avoid; }
                .room { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .instruction { font-size: 12px; color: #666; margin-top: 10px; }
              </style>
            </head>
            <body>
              <h2>Hotel Room Menus</h2>
              <div class="grid">${content}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-theme-border">
          <h3 className="text-xl font-bold text-theme-text">Room QR Codes (Guest Menu)</h3>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors active:scale-95 shadow-md">
              <Printer size={18} /> Print All
            </button>
            <button onClick={onClose} className="text-theme-muted hover:text-theme-text p-2">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="text-center text-theme-muted py-10">Loading rooms...</div>
          ) : (
            <div className="grid grid-cols-4 gap-6" ref={printRef}>
              {rooms.map((room: any) => (
                <div key={room.id} className="card bg-theme-main border border-theme-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="room text-xl font-bold text-theme-text mb-4">Room {room.number}</div>
                  <div className="bg-theme-card p-2 rounded-lg mb-3">
                    <QRCodeSVG 
                      value={`${window.location.origin}/guest?room=${room.number}`}
                      size={120}
                      level={"L"}
                      includeMargin={false}
                    />
                  </div>
                  <div className="instruction text-xs text-theme-muted">Scan to view menu & order</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

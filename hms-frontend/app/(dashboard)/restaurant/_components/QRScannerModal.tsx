import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function QRScannerModal({ onClose, onScan }: { onClose: () => void, onScan: (result: string) => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: {width: 250, height: 250} },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Ignored. Errors are continuous when a QR is not in view.
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex justify-between items-center p-6 border-b border-theme-border">
          <h3 className="text-xl font-bold text-theme-text flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 text-primary rounded-xl flex items-center justify-center">
              <Camera size={20} />
            </div>
            Scan Menu QR
          </h3>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text p-2 bg-theme-main hover:bg-theme-hover rounded-xl border border-theme-border transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="bg-theme-main rounded-2xl overflow-hidden border border-theme-border p-2">
            <div id="qr-reader" className="w-full rounded-xl overflow-hidden [&>div]:!border-none [&_video]:!rounded-xl"></div>
          </div>
          <p className="text-center text-sm text-theme-muted mt-6 font-medium">
            Point your camera at a room's QR code to instantly view the digital menu.
          </p>
        </div>
      </div>
    </div>
  );
}

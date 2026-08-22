'use client';
import { CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  saving: boolean;
  success: boolean;
  onSave: () => void;
}

/**
 * Shared "Saved Successfully" indicator + Save Changes button used by every
 * settings tab. Markup is intentionally identical across tabs.
 */
export default function SettingsSaveBar({ saving, success, onSave }: Props) {
  return (
    <div className="flex items-center justify-end gap-4 pt-2">
      {success && (
        <span className="flex items-center gap-1.5 text-green-500 text-sm font-medium animate-in fade-in">
          <CheckCircle size={16} /> Saved Successfully
        </span>
      )}
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-md"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : null}
        Save Changes
      </button>
    </div>
  );
}

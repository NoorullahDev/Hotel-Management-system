'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SaveFn {
  (category: string): Promise<void>;
}

/**
 * Shared save state machine for settings tabs: tracks saving/success flags,
 * shows an alert on failure, and auto-hides the success indicator after 3s.
 *
 * Returns `save(category, errorMessage)` which resolves to true when the
 * save succeeded (callers clear their unsaved-changes flag on true only).
 */
export function useSettingsSave(onSave: SaveFn) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(async (category: string, errorMessage = 'Failed to save changes.') => {
    setSaving(true);
    try {
      await onSave(category);
      setSuccess(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSuccess(false), 3000);
      return true;
    } catch (err) {
      alert(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  return { saving, success, save };
}

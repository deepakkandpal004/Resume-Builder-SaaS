"use client";
import { useEffect, useState } from 'react';

/**
 * Custom hook to track unsaved changes and warn user before leaving
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param message - Warning message to display
 */
const useUnsavedChangesWarning = (
  hasUnsavedChanges: boolean,
  message: string = "You have unsaved changes. Are you sure you want to leave?"
) => {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Warn before page unload (browser native)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  const confirmNavigation = (): void => {
    setShowWarning(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const cancelNavigation = (): void => {
    setShowWarning(false);
    setPendingNavigation(null);
  };

  const checkUnsavedChanges = (callback: () => void): boolean => {
    if (hasUnsavedChanges) {
      setShowWarning(true);
      setPendingNavigation(() => callback);
      return false; // Block navigation
    }
    callback();
    return true; // Allow navigation
  };

  return {
    showWarning,
    confirmNavigation,
    cancelNavigation,
    checkUnsavedChanges,
  };
};

export default useUnsavedChangesWarning;

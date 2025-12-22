import { useEffect, useCallback } from "react";
import { toast } from "react-toastify";

interface ShortcutActions {
  onAddProduct?: () => void;
  onQuickAdjust?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onSearch?: () => void;
  onClearFilters?: () => void;
  onStoreView?: () => void;
  onToggleSelect?: () => void;
}

interface UseInventoryShortcutsOptions {
  enabled?: boolean;
  showToast?: boolean;
}

/**
 * Custom hook for inventory keyboard shortcuts
 * 
 * Shortcuts:
 * - Ctrl/Cmd + N: Add new product
 * - Ctrl/Cmd + Q: Quick stock adjustment
 * - Ctrl/Cmd + E: Export inventory
 * - Ctrl/Cmd + R: Refresh data
 * - Ctrl/Cmd + K or /: Focus search
 * - Ctrl/Cmd + Shift + C: Clear filters
 * - Ctrl/Cmd + S: Store inventory view
 * - Escape: Clear selection / Close dialogs
 */
export function useInventoryShortcuts(
  actions: ShortcutActions,
  options: UseInventoryShortcutsOptions = {}
) {
  const { enabled = true, showToast = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape in inputs
        if (event.key !== "Escape") return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + N: Add new product
      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        actions.onAddProduct?.();
        if (showToast) toast.info("📦 Add Product (Ctrl+N)");
        return;
      }

      // Ctrl/Cmd + Q: Quick stock adjustment
      if (modifier && event.key.toLowerCase() === "q") {
        event.preventDefault();
        actions.onQuickAdjust?.();
        if (showToast) toast.info("⚡ Quick Adjust (Ctrl+Q)");
        return;
      }

      // Ctrl/Cmd + E: Export
      if (modifier && event.key.toLowerCase() === "e") {
        event.preventDefault();
        actions.onExport?.();
        return;
      }

      // Ctrl/Cmd + R: Refresh (prevent browser refresh)
      if (modifier && event.key.toLowerCase() === "r" && !event.shiftKey) {
        event.preventDefault();
        actions.onRefresh?.();
        if (showToast) toast.info("🔄 Refreshing...");
        return;
      }

      // Ctrl/Cmd + K or /: Focus search
      if ((modifier && event.key.toLowerCase() === "k") || event.key === "/") {
        event.preventDefault();
        actions.onSearch?.();
        return;
      }

      // Ctrl/Cmd + Shift + C: Clear filters
      if (modifier && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        actions.onClearFilters?.();
        if (showToast) toast.info("🧹 Filters cleared");
        return;
      }

      // Ctrl/Cmd + S: Store view (prevent browser save)
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        actions.onStoreView?.();
        return;
      }

      // Escape: Clear selection
      if (event.key === "Escape") {
        actions.onToggleSelect?.();
        return;
      }
    },
    [actions, enabled, showToast]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Return shortcut info for display
  return {
    shortcuts: [
      { key: "Ctrl+N", action: "Add Product", icon: "📦" },
      { key: "Ctrl+Q", action: "Quick Adjust", icon: "⚡" },
      { key: "Ctrl+E", action: "Export", icon: "📤" },
      { key: "Ctrl+R", action: "Refresh", icon: "🔄" },
      { key: "Ctrl+K", action: "Search", icon: "🔍" },
      { key: "Ctrl+Shift+C", action: "Clear Filters", icon: "🧹" },
      { key: "Ctrl+S", action: "Store View", icon: "🏪" },
      { key: "Esc", action: "Clear Selection", icon: "✖️" },
    ],
  };
}

export default useInventoryShortcuts;

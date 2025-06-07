"use client";

import { useMemo } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { useSelection } from "~/contexts/selection-context";
import { cn } from "~/lib/utils";

interface SelectAllCheckboxProps {
  /** Array of all available item IDs that can be selected */
  availableItems: string[];
  /** Label text for the checkbox */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show count of selected items */
  showCount?: boolean;
}

export function SelectAllCheckbox({
  availableItems,
  label = "Select all",
  className,
  showCount = true,
}: SelectAllCheckboxProps) {
  const { selectedItems, selectAllItems, clearSelection } = useSelection();

  // Calculate selection state
  const selectionState = useMemo(() => {
    const selectedCount = availableItems.filter((id) =>
      selectedItems.has(id),
    ).length;
    const totalCount = availableItems.length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === totalCount) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [availableItems, selectedItems]);

  const handleSelectAll = () => {
    if (selectionState.checked) {
      // All are selected, so deselect all
      clearSelection();
    } else {
      // Some or none are selected, so select all
      selectAllItems(availableItems);
    }
  };

  if (availableItems.length === 0) {
    return null;
  }

  const selectedCount = availableItems.filter((id) =>
    selectedItems.has(id),
  ).length;

  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3",
        "dark:border-blue-800 dark:bg-blue-950/50",
        className,
      )}
    >
      <Checkbox
        checked={selectionState.checked}
        // @ts-expect-error - Radix UI checkbox supports indeterminate but TypeScript doesn't know about it
        indeterminate={selectionState.indeterminate}
        onCheckedChange={handleSelectAll}
        className="h-5 w-5"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {label}
        </span>
        {showCount && (
          <span className="text-sm text-blue-700 dark:text-blue-300">
            ({selectedCount} of {availableItems.length} selected)
          </span>
        )}
      </div>
    </div>
  );
}

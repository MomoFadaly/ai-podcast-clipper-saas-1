"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface SelectionContextType {
  isSelectionMode: boolean;
  selectedItems: Set<string>;
  toggleSelectionMode: () => void;
  toggleItemSelection: (id: string) => void;
  selectAllItems: (ids: string[]) => void;
  clearSelection: () => void;
  isItemSelected: (id: string) => boolean;
  getSelectedCount: () => number;
}

const SelectionContext = createContext<SelectionContextType | undefined>(
  undefined,
);

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}

interface SelectionProviderProps {
  children: React.ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode, clear all selections
        setSelectedItems(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllItems = useCallback((ids: string[]) => {
    setSelectedItems(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isItemSelected = useCallback(
    (id: string) => {
      return selectedItems.has(id);
    },
    [selectedItems],
  );

  const getSelectedCount = useCallback(() => {
    return selectedItems.size;
  }, [selectedItems]);

  const value: SelectionContextType = {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    isItemSelected,
    getSelectedCount,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

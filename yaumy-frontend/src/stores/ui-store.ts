/**
 * UI Store
 * Global UI state management using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  data?: any;
}

export interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Modals
  modals: Map<string, ModalState>;
  
  // Toasts
  toasts: Toast[];
  
  // Loading
  globalLoading: boolean;
  loadingTasks: Map<string, string>;
  
  // Theme
  theme: 'light' | 'dark';
  
  // Layout
  layoutMode: 'default' | 'compact' | 'spacious';
  panelSizes: Map<string, number>;
}

export interface UIActions {
  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Modals
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId: string) => void;
  updateModalData: (modalId: string, data: any) => void;
  isModalOpen: (modalId: string) => boolean;
  getModalData: (modalId: string) => any;
  
  // Toasts
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Loading
  setGlobalLoading: (loading: boolean) => void;
  startLoadingTask: (taskId: string, message: string) => void;
  finishLoadingTask: (taskId: string) => void;
  isAnyLoading: () => boolean;
  
  // Theme
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Layout
  setLayoutMode: (mode: UIState['layoutMode']) => void;
  savePanelSize: (panelId: string, size: number) => void;
  getPanelSize: (panelId: string, defaultSize: number) => number;
  resetLayout: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        sidebarOpen: true,
        sidebarCollapsed: false,
        modals: new Map(),
        toasts: [],
        globalLoading: false,
        loadingTasks: new Map(),
        theme: 'light',
        layoutMode: 'default',
        panelSizes: new Map(),

        // Sidebar actions
        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },

        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        toggleSidebarCollapsed: () => {
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          });
        },

        setSidebarCollapsed: (collapsed) => {
          set((state) => {
            state.sidebarCollapsed = collapsed;
          });
        },

        // Modal actions
        openModal: (modalId, data) => {
          set((state) => {
            state.modals.set(modalId, { isOpen: true, data });
          });
        },

        closeModal: (modalId) => {
          set((state) => {
            state.modals.delete(modalId);
          });
        },

        updateModalData: (modalId, data) => {
          set((state) => {
            const modal = state.modals.get(modalId);
            if (modal) {
              state.modals.set(modalId, { ...modal, data });
            }
          });
        },

        isModalOpen: (modalId) => {
          return get().modals.get(modalId)?.isOpen ?? false;
        },

        getModalData: (modalId) => {
          return get().modals.get(modalId)?.data;
        },

        // Toast actions
        addToast: (toast) => {
          const id = `toast-${Date.now()}-${Math.random()}`;
          set((state) => {
            state.toasts.push({ ...toast, id });
          });
          
          // Auto-remove after duration
          if (toast.duration !== 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, toast.duration ?? 5000);
          }
        },

        removeToast: (id) => {
          set((state) => {
            state.toasts = state.toasts.filter(t => t.id !== id);
          });
        },

        clearToasts: () => {
          set((state) => {
            state.toasts = [];
          });
        },

        // Loading actions
        setGlobalLoading: (loading) => {
          set((state) => {
            state.globalLoading = loading;
          });
        },

        startLoadingTask: (taskId, message) => {
          set((state) => {
            state.loadingTasks.set(taskId, message);
          });
        },

        finishLoadingTask: (taskId) => {
          set((state) => {
            state.loadingTasks.delete(taskId);
          });
        },

        isAnyLoading: () => {
          const state = get();
          return state.globalLoading || state.loadingTasks.size > 0;
        },

        // Theme actions
        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
          
          // Apply theme to document
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', theme === 'dark');
          }
        },

        toggleTheme: () => {
          const newTheme = get().theme === 'light' ? 'dark' : 'light';
          get().setTheme(newTheme);
        },

        // Layout actions
        setLayoutMode: (mode) => {
          set((state) => {
            state.layoutMode = mode;
          });
        },

        savePanelSize: (panelId, size) => {
          set((state) => {
            state.panelSizes.set(panelId, size);
          });
        },

        getPanelSize: (panelId, defaultSize) => {
          return get().panelSizes.get(panelId) ?? defaultSize;
        },

        resetLayout: () => {
          set((state) => {
            state.panelSizes.clear();
            state.layoutMode = 'default';
          });
        },
      })),
      {
        name: 'ui-store',
        // Only persist certain UI states
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          layoutMode: state.layoutMode,
          panelSizes: Array.from(state.panelSizes.entries()),
        }),
        // Custom merge to handle Maps
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          panelSizes: new Map(persistedState.panelSizes || []),
        }),
      }
    )
  )
);
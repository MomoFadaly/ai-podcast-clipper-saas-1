/**
 * UI Store Tests
 * Tests for UI state management with Zustand
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUIStore } from '../../stores/ui-store';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      // Sidebar state
      sidebarOpen: true,
      sidebarCollapsed: false,
      
      // Modal state
      modals: new Map(),
      
      // Toast/Notification state
      toasts: [],
      
      // Loading states
      globalLoading: false,
      loadingTasks: new Map(),
      
      // Theme
      theme: 'light',
      
      // Layout
      layoutMode: 'default',
      panelSizes: new Map(),
    });
  });

  describe('Sidebar Management', () => {
    it('should toggle sidebar open state', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.sidebarOpen).toBe(false);
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should set sidebar open state', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setSidebarOpen(false);
      });
      
      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar collapsed state', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.toggleSidebarCollapsed();
      });
      
      expect(result.current.sidebarCollapsed).toBe(true);
    });
  });

  describe('Modal Management', () => {
    it('should open a modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('test-modal', { title: 'Test Modal' });
      });
      
      expect(result.current.modals.has('test-modal')).toBe(true);
      expect(result.current.modals.get('test-modal')).toEqual({
        isOpen: true,
        data: { title: 'Test Modal' },
      });
    });

    it('should close a modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('test-modal', { title: 'Test Modal' });
        result.current.closeModal('test-modal');
      });
      
      expect(result.current.modals.has('test-modal')).toBe(false);
    });

    it('should update modal data', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('test-modal', { title: 'Test Modal' });
        result.current.updateModalData('test-modal', { title: 'Updated Modal' });
      });
      
      expect(result.current.modals.get('test-modal')?.data).toEqual({
        title: 'Updated Modal',
      });
    });

    it('should check if modal is open', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('test-modal');
      });
      
      expect(result.current.isModalOpen('test-modal')).toBe(true);
      expect(result.current.isModalOpen('other-modal')).toBe(false);
    });

    it('should get modal data', () => {
      const { result } = renderHook(() => useUIStore());
      
      const modalData = { title: 'Test', content: 'Content' };
      
      act(() => {
        result.current.openModal('test-modal', modalData);
      });
      
      expect(result.current.getModalData('test-modal')).toEqual(modalData);
      expect(result.current.getModalData('non-existent')).toBeUndefined();
    });
  });

  describe('Toast Notifications', () => {
    it('should add a toast', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addToast({
          title: 'Success',
          message: 'Operation completed',
          type: 'success',
        });
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Success',
        message: 'Operation completed',
        type: 'success',
      });
      expect(result.current.toasts[0].id).toBeDefined();
    });

    it('should add multiple toasts', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addToast({ title: 'Toast 1', type: 'info' });
        result.current.addToast({ title: 'Toast 2', type: 'warning' });
        result.current.addToast({ title: 'Toast 3', type: 'error' });
      });
      
      expect(result.current.toasts).toHaveLength(3);
    });

    it('should remove a toast', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addToast({ title: 'Test Toast', type: 'info' });
      });
      
      const toastId = result.current.toasts[0].id;
      
      act(() => {
        result.current.removeToast(toastId);
      });
      
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should clear all toasts', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addToast({ title: 'Toast 1', type: 'info' });
        result.current.addToast({ title: 'Toast 2', type: 'warning' });
        result.current.clearToasts();
      });
      
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Loading States', () => {
    it('should set global loading state', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setGlobalLoading(true);
      });
      
      expect(result.current.globalLoading).toBe(true);
      
      act(() => {
        result.current.setGlobalLoading(false);
      });
      
      expect(result.current.globalLoading).toBe(false);
    });

    it('should start a loading task', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.startLoadingTask('upload', 'Uploading file...');
      });
      
      expect(result.current.loadingTasks.has('upload')).toBe(true);
      expect(result.current.loadingTasks.get('upload')).toBe('Uploading file...');
    });

    it('should finish a loading task', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.startLoadingTask('upload', 'Uploading file...');
        result.current.finishLoadingTask('upload');
      });
      
      expect(result.current.loadingTasks.has('upload')).toBe(false);
    });

    it('should check if any loading task is active', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.isAnyLoading()).toBe(false);
      
      act(() => {
        result.current.startLoadingTask('task1', 'Loading...');
      });
      
      expect(result.current.isAnyLoading()).toBe(true);
      
      act(() => {
        result.current.setGlobalLoading(true);
        result.current.finishLoadingTask('task1');
      });
      
      expect(result.current.isAnyLoading()).toBe(true); // Due to global loading
    });
  });

  describe('Theme Management', () => {
    it('should set theme', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(result.current.theme).toBe('dark');
    });

    it('should toggle theme', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('dark');
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('light');
    });
  });

  describe('Layout Management', () => {
    it('should set layout mode', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setLayoutMode('compact');
      });
      
      expect(result.current.layoutMode).toBe('compact');
    });

    it('should save panel size', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.savePanelSize('sidebar', 250);
      });
      
      expect(result.current.panelSizes.get('sidebar')).toBe(250);
    });

    it('should get panel size with default', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.getPanelSize('sidebar', 300)).toBe(300);
      
      act(() => {
        result.current.savePanelSize('sidebar', 250);
      });
      
      expect(result.current.getPanelSize('sidebar', 300)).toBe(250);
    });

    it('should reset layout', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.savePanelSize('sidebar', 250);
        result.current.savePanelSize('panel1', 400);
        result.current.setLayoutMode('compact');
        result.current.resetLayout();
      });
      
      expect(result.current.panelSizes.size).toBe(0);
      expect(result.current.layoutMode).toBe('default');
    });
  });
});
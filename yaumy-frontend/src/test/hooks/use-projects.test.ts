/**
 * useProjects Hook Tests
 * Tests for the projects React Query hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject } from '../../hooks/use-projects';

// Mock fetch
global.fetch = vi.fn();

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useProjects Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        { id: '1', displayName: 'Project 1', userId: 'user1' },
        { id: '2', displayName: 'Project 2', userId: 'user1' },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith('/api/projects', expect.any(Object));
    });

    it('should handle fetch error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should apply filters', async () => {
      const mockProjects = [
        { id: '1', displayName: 'Video Project', contentType: 'video' },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      });

      const { result } = renderHook(
        () => useProjects({ contentType: 'video', search: 'test' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('contentType=video'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      );
    });
  });

  describe('useProject', () => {
    it('should fetch single project', async () => {
      const mockProject = {
        id: '1',
        displayName: 'Test Project',
        userId: 'user1',
        clips: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      });

      const { result } = renderHook(() => useProject('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProject);
      expect(fetch).toHaveBeenCalledWith('/api/projects/1', expect.any(Object));
    });

    it('should not fetch if id is undefined', () => {
      const { result } = renderHook(() => useProject(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.data).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('useCreateProject', () => {
    it('should create project successfully', async () => {
      const newProject = {
        id: '3',
        displayName: 'New Project',
        userId: 'user1',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => newProject,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        displayName: 'New Project',
        file: new File([''], 'test.mp4'),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newProject);
      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        body: expect.any(FormData),
        credentials: 'include',
      });
    });

    it('should handle creation error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        displayName: 'New Project',
        file: new File([''], 'test.mp4'),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdateProject', () => {
    it('should update project successfully', async () => {
      const updatedProject = {
        id: '1',
        displayName: 'Updated Project',
        userId: 'user1',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedProject,
      });

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: '1',
        updates: { displayName: 'Updated Project' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedProject);
      expect(fetch).toHaveBeenCalledWith('/api/projects/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Updated Project' }),
        credentials: 'include',
      });
    });
  });

  describe('useDeleteProject', () => {
    it('should delete project successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('/api/projects/1', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('should handle deletion error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      });

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Forbidden');
    });
  });
});
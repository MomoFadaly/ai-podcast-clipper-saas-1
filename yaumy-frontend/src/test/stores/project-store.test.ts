/**
 * Project Store Tests
 * Tests for Zustand project state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProjectStore } from '../../stores/project-store';

describe('Project Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useProjectStore.setState({
      projects: new Map(),
      selectedProjectId: null,
      filters: {
        search: '',
        contentType: null,
        dateRange: null,
        tags: [],
      },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      isLoading: false,
      error: null,
    });
  });

  describe('Project Management', () => {
    it('should add a project', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const newProject = {
        id: 'project1',
        displayName: 'Test Project',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addProject(newProject);
      });

      expect(result.current.projects.size).toBe(1);
      expect(result.current.projects.get('project1')).toEqual(newProject);
    });

    it('should update a project', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const project = {
        id: 'project1',
        displayName: 'Test Project',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addProject(project);
        result.current.updateProject('project1', { displayName: 'Updated Project' });
      });

      expect(result.current.projects.get('project1')?.displayName).toBe('Updated Project');
    });

    it('should remove a project', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.addProject({
          id: 'project1',
          displayName: 'Test Project',
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        result.current.removeProject('project1');
      });

      expect(result.current.projects.size).toBe(0);
    });

    it('should set multiple projects', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const projects = [
        {
          id: 'project1',
          displayName: 'Project 1',
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project2',
          displayName: 'Project 2',
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      act(() => {
        result.current.setProjects(projects);
      });

      expect(result.current.projects.size).toBe(2);
      expect(result.current.projects.get('project1')?.displayName).toBe('Project 1');
      expect(result.current.projects.get('project2')?.displayName).toBe('Project 2');
    });
  });

  describe('Selection', () => {
    it('should select a project', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.addProject({
          id: 'project1',
          displayName: 'Test Project',
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        result.current.selectProject('project1');
      });

      expect(result.current.selectedProjectId).toBe('project1');
    });

    it('should get selected project', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const project = {
        id: 'project1',
        displayName: 'Test Project',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.addProject(project);
        result.current.selectProject('project1');
      });

      expect(result.current.getSelectedProject()).toEqual(project);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.selectProject('project1');
        result.current.clearSelection();
      });

      expect(result.current.selectedProjectId).toBeNull();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setProjects([
          {
            id: 'project1',
            displayName: 'Video Project',
            userId: 'user1',
            contentType: 'video',
            tags: ['tutorial', 'react'],
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date(),
          },
          {
            id: 'project2',
            displayName: 'Audio Podcast',
            userId: 'user1',
            contentType: 'audio',
            tags: ['podcast', 'tech'],
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date(),
          },
          {
            id: 'project3',
            displayName: 'Text Document',
            userId: 'user1',
            contentType: 'text',
            tags: ['documentation'],
            createdAt: new Date('2024-03-01'),
            updatedAt: new Date(),
          },
        ]);
      });
    });

    it('should filter by search term', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter('search', 'video');
      });

      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toBe('Video Project');
    });

    it('should filter by content type', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter('contentType', 'audio');
      });

      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toBe('Audio Podcast');
    });

    it('should filter by tags', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter('tags', ['tutorial']);
      });

      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toBe('Video Project');
    });

    it('should apply multiple filters', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter('search', 'project');
        result.current.setFilter('tags', ['tech']);
      });

      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(0); // No project matches both filters
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter('search', 'video');
        result.current.clearFilters();
      });

      expect(result.current.filters.search).toBe('');
      expect(result.current.getFilteredProjects()).toHaveLength(3);
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setProjects([
          {
            id: 'project1',
            displayName: 'A Project',
            userId: 'user1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date(),
          },
          {
            id: 'project2',
            displayName: 'Z Project',
            userId: 'user1',
            createdAt: new Date('2024-03-01'),
            updatedAt: new Date(),
          },
          {
            id: 'project3',
            displayName: 'M Project',
            userId: 'user1',
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date(),
          },
        ]);
      });
    });

    it('should sort by name', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setSortBy('name');
        result.current.setSortOrder('asc');
      });

      const sorted = result.current.getFilteredProjects();
      expect(sorted[0].displayName).toBe('A Project');
      expect(sorted[1].displayName).toBe('M Project');
      expect(sorted[2].displayName).toBe('Z Project');
    });

    it('should sort by creation date', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setSortBy('createdAt');
        result.current.setSortOrder('asc');
      });

      const sorted = result.current.getFilteredProjects();
      expect(sorted[0].id).toBe('project1');
      expect(sorted[1].id).toBe('project3');
      expect(sorted[2].id).toBe('project2');
    });

    it('should toggle sort order', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setSortBy('name');
        result.current.toggleSortOrder();
      });

      expect(result.current.sortOrder).toBe('asc');
      
      const sorted = result.current.getFilteredProjects();
      expect(sorted[0].displayName).toBe('A Project');
    });
  });

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setError('Error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Persistence', () => {
    it('should persist state', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.addProject({
          id: 'project1',
          displayName: 'Persisted Project',
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // Simulate page reload
      const { result: newResult } = renderHook(() => useProjectStore());
      
      // State should be persisted
      expect(newResult.current.projects.size).toBe(1);
      expect(newResult.current.projects.get('project1')?.displayName).toBe('Persisted Project');
    });
  });
});
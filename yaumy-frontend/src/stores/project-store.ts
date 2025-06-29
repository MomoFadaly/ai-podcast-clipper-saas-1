/**
 * Project Store
 * Manages project state using Zustand with persistence
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Project {
  id: string;
  displayName: string;
  userId: string;
  contentType?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Add other properties as needed
}

export interface ProjectFilters {
  search: string;
  contentType: string | null;
  dateRange: { start: Date; end: Date } | null;
  tags: string[];
}

export interface ProjectState {
  // State
  projects: Map<string, Project>;
  selectedProjectId: string | null;
  filters: ProjectFilters;
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
}

export interface ProjectActions {
  // Project CRUD
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setProjects: (projects: Project[]) => void;
  
  // Selection
  selectProject: (id: string | null) => void;
  clearSelection: () => void;
  getSelectedProject: () => Project | undefined;
  
  // Filtering
  setFilter: <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => void;
  clearFilters: () => void;
  getFilteredProjects: () => Project[];
  
  // Sorting
  setSortBy: (sortBy: ProjectState['sortBy']) => void;
  setSortOrder: (order: ProjectState['sortOrder']) => void;
  toggleSortOrder: () => void;
  
  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
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

        // Actions
        addProject: (project) => {
          set((state) => {
            state.projects.set(project.id, project);
          });
        },

        updateProject: (id, updates) => {
          set((state) => {
            const project = state.projects.get(id);
            if (project) {
              state.projects.set(id, { ...project, ...updates, updatedAt: new Date() });
            }
          });
        },

        removeProject: (id) => {
          set((state) => {
            state.projects.delete(id);
            if (state.selectedProjectId === id) {
              state.selectedProjectId = null;
            }
          });
        },

        setProjects: (projects) => {
          set((state) => {
            state.projects = new Map(projects.map(p => [p.id, p]));
          });
        },

        selectProject: (id) => {
          set((state) => {
            state.selectedProjectId = id;
          });
        },

        clearSelection: () => {
          set((state) => {
            state.selectedProjectId = null;
          });
        },

        getSelectedProject: () => {
          const state = get();
          return state.selectedProjectId ? state.projects.get(state.selectedProjectId) : undefined;
        },

        setFilter: (key, value) => {
          set((state) => {
            state.filters[key] = value as any;
          });
        },

        clearFilters: () => {
          set((state) => {
            state.filters = {
              search: '',
              contentType: null,
              dateRange: null,
              tags: [],
            };
          });
        },

        getFilteredProjects: () => {
          const state = get();
          let projects = Array.from(state.projects.values());

          // Apply search filter
          if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            projects = projects.filter(p => 
              p.displayName.toLowerCase().includes(search)
            );
          }

          // Apply content type filter
          if (state.filters.contentType) {
            projects = projects.filter(p => p.contentType === state.filters.contentType);
          }

          // Apply tag filter
          if (state.filters.tags.length > 0) {
            projects = projects.filter(p => 
              state.filters.tags.some(tag => p.tags?.includes(tag))
            );
          }

          // Apply date range filter
          if (state.filters.dateRange) {
            projects = projects.filter(p => 
              p.createdAt >= state.filters.dateRange!.start &&
              p.createdAt <= state.filters.dateRange!.end
            );
          }

          // Apply sorting
          projects.sort((a, b) => {
            let comparison = 0;
            
            switch (state.sortBy) {
              case 'name':
                comparison = a.displayName.localeCompare(b.displayName);
                break;
              case 'createdAt':
                comparison = a.createdAt.getTime() - b.createdAt.getTime();
                break;
              case 'updatedAt':
                comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
                break;
            }

            return state.sortOrder === 'asc' ? comparison : -comparison;
          });

          return projects;
        },

        setSortBy: (sortBy) => {
          set((state) => {
            state.sortBy = sortBy;
          });
        },

        setSortOrder: (order) => {
          set((state) => {
            state.sortOrder = order;
          });
        },

        toggleSortOrder: () => {
          set((state) => {
            state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
          });
        },

        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },
      })),
      {
        name: 'project-store',
        // Custom serialization to handle Map
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const { state } = JSON.parse(str);
            return {
              state: {
                ...state,
                projects: new Map(state.projects),
              },
            };
          },
          setItem: (name, value) => {
            const { state } = value as any;
            const str = JSON.stringify({
              state: {
                ...state,
                projects: Array.from(state.projects.entries()),
              },
            });
            localStorage.setItem(name, str);
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    )
  )
);
/**
 * Project Hooks
 * React Query hooks for project data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project } from '../stores/project-store';

// Query keys factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

interface ProjectFilters {
  contentType?: string;
  search?: string;
  tags?: string[];
  userId?: string;
}

interface CreateProjectInput {
  displayName: string;
  file: File;
  contentType?: string;
  tags?: string[];
}

interface UpdateProjectInput {
  id: string;
  updates: Partial<Project>;
}

// API functions
async function fetchProjects(filters?: ProjectFilters): Promise<Project[]> {
  const params = new URLSearchParams();
  
  if (filters?.contentType) params.append('contentType', filters.contentType);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
  if (filters?.userId) params.append('userId', filters.userId);
  
  const response = await fetch(`/api/projects${params.toString() ? `?${params}` : ''}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.projects;
}

async function fetchProject(id: string): Promise<Project & { clips?: any[] }> {
  const response = await fetch(`/api/projects/${id}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`);
  }
  
  return response.json();
}

async function createProject(input: CreateProjectInput): Promise<Project> {
  const formData = new FormData();
  formData.append('displayName', input.displayName);
  formData.append('file', input.file);
  
  if (input.contentType) formData.append('contentType', input.contentType);
  if (input.tags) input.tags.forEach(tag => formData.append('tags', tag));
  
  const response = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }
  
  return response.json();
}

async function updateProject({ id, updates }: UpdateProjectInput): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update project: ${response.statusText}`);
  }
  
  return response.json();
}

async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }
}

// Hooks
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => fetchProjects(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? projectKeys.detail(id) : [],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      // Invalidate and refetch project lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      // Optionally add the new project to the cache immediately
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProject,
    onSuccess: (updatedProject) => {
      // Update the specific project in cache
      queryClient.setQueryData(projectKeys.detail(updatedProject.id), updatedProject);
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Prefetch utilities
export function usePrefetchProject() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(id),
      queryFn: () => fetchProject(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}
/**
 * Access Control Tests
 * Tests for permission and access management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkAccess, getUserAccessibleProjects, getHighestPermission } from '../../lib/access-control';
import { db } from '../../server/db';
import { auth } from '../../server/auth';

// Mock dependencies
vi.mock('../../server/db', () => ({
  db: {
    uploadedFile: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    track: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    projectShare: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    trackShare: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../server/auth', () => ({
  auth: vi.fn(),
}));

describe('Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHighestPermission', () => {
    it('should return COLLABORATE when it exists in permissions', () => {
      const permissions = ['VIEW', 'COPY', 'COLLABORATE'] as any;
      expect(getHighestPermission(permissions)).toBe('COLLABORATE');
    });

    it('should return COPY when COLLABORATE is not present', () => {
      const permissions = ['VIEW', 'COPY'] as any;
      expect(getHighestPermission(permissions)).toBe('COPY');
    });

    it('should return VIEW when only VIEW is present', () => {
      const permissions = ['VIEW'] as any;
      expect(getHighestPermission(permissions)).toBe('VIEW');
    });

    it('should return VIEW for empty array', () => {
      const permissions = [] as any;
      expect(getHighestPermission(permissions)).toBe('VIEW');
    });

    it('should handle invalid permissions', () => {
      const permissions = ['INVALID', 'UNKNOWN'] as any;
      expect(getHighestPermission(permissions)).toBe('VIEW');
    });
  });

  describe('checkAccess', () => {
    it('should grant full access to content owner', async () => {
      vi.mocked(db.uploadedFile.findFirst).mockResolvedValueOnce({
        id: 'project1',
        displayName: 'Test Project',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await checkAccess('project', 'project1', 'user1');

      expect(result).toEqual({
        hasAccess: true,
        permission: 'COLLABORATE',
        accessLevel: 'PRIVATE',
        isOwner: true,
      });
    });

    it('should deny access when no share exists', async () => {
      vi.mocked(db.uploadedFile.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.projectShare.findFirst).mockResolvedValueOnce(null);

      const result = await checkAccess('project', 'project1', 'user2');

      expect(result).toEqual({
        hasAccess: false,
        isOwner: false,
        reason: 'No access granted to this content',
      });
    });

    it('should grant access based on share permissions', async () => {
      vi.mocked(db.uploadedFile.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.projectShare.findFirst).mockResolvedValueOnce({
        id: 'share1',
        projectId: 'project1',
        ownerId: 'user1',
        permissions: ['VIEW', 'COPY'],
        accessLevel: 'EMAIL_SHARED',
        isActive: true,
        createdAt: new Date(),
      } as any);

      const result = await checkAccess('project', 'project1', 'user2', 'VIEW');

      expect(result).toEqual({
        hasAccess: true,
        permission: 'COPY',
        accessLevel: 'EMAIL_SHARED',
        isOwner: false,
      });
    });

    it('should deny access for insufficient permissions', async () => {
      vi.mocked(db.uploadedFile.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.projectShare.findFirst).mockResolvedValueOnce({
        id: 'share1',
        projectId: 'project1',
        ownerId: 'user1',
        permissions: ['VIEW'],
        accessLevel: 'EMAIL_SHARED',
        isActive: true,
        createdAt: new Date(),
      } as any);

      const result = await checkAccess('project', 'project1', 'user2', 'COLLABORATE');

      expect(result).toEqual({
        hasAccess: false,
        isOwner: false,
        reason: 'Insufficient permissions. Required: COLLABORATE, granted: VIEW',
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(db.uploadedFile.findFirst).mockRejectedValueOnce(new Error('Database error'));

      const result = await checkAccess('project', 'project1', 'user1');

      expect(result).toEqual({
        hasAccess: false,
        isOwner: false,
        reason: 'An error occurred while checking access',
      });
    });
  });

  describe('getUserAccessibleProjects', () => {
    it('should return owned and shared projects', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user1' } } as any);
      
      vi.mocked(db.uploadedFile.findMany).mockResolvedValueOnce([
        {
          id: 'project1',
          displayName: 'My Project',
          userId: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      vi.mocked(db.projectShare.findMany).mockResolvedValueOnce([
        {
          id: 'share1',
          projectId: 'project2',
          permissions: ['VIEW', 'COPY'],
          accessLevel: 'EMAIL_SHARED',
          project: {
            id: 'project2',
            displayName: 'Shared Project',
            createdAt: new Date(),
          },
          owner: {
            id: 'user2',
            email: 'owner@example.com',
            name: 'Project Owner',
          },
          createdAt: new Date(),
        },
      ] as any);

      const result = await getUserAccessibleProjects();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'project1',
        name: 'My Project',
        contentType: 'project',
        isOwner: true,
        permission: 'COLLABORATE',
      });
      expect(result[1]).toMatchObject({
        id: 'project2',
        name: 'Shared Project',
        contentType: 'project',
        isOwner: false,
        permission: 'COPY',
      });
    });

    it('should handle unauthenticated users', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const result = await getUserAccessibleProjects();

      expect(result).toEqual([]);
    });
  });
});
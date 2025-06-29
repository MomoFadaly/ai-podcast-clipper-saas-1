/**
 * Utility functions for handling metadata
 */

import type { JsonValue } from "@prisma/client/runtime/library";
import type { TrackMetadata, ConversationMetadata, ProjectMetadata } from "~/types/metadata";

/**
 * Safely converts JsonValue to TrackMetadata
 */
export function safeParseTrackMetadata(metadata: JsonValue | null): TrackMetadata | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  
  try {
    return metadata as TrackMetadata;
  } catch {
    return null;
  }
}

/**
 * Safely converts JsonValue to ConversationMetadata
 */
export function safeParseConversationMetadata(metadata: JsonValue | null): ConversationMetadata | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  
  try {
    return metadata as ConversationMetadata;
  } catch {
    return null;
  }
}

/**
 * Safely converts JsonValue to ProjectMetadata
 */
export function safeParseProjectMetadata(metadata: JsonValue | null): ProjectMetadata | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  
  try {
    return metadata as ProjectMetadata;
  } catch {
    return null;
  }
}

/**
 * Validates if a value is a valid TrackMetadata object
 */
export function isValidTrackMetadata(value: unknown): value is TrackMetadata {
  if (!value || typeof value !== 'object') return false;
  
  const metadata = value as Record<string, unknown>;
  
  // Check optional fields with correct types
  return (
    (metadata.aiGeneratedReason === undefined || typeof metadata.aiGeneratedReason === 'string') &&
    (metadata.sourceConversationId === undefined || typeof metadata.sourceConversationId === 'string') &&
    (metadata.generatedAt === undefined || typeof metadata.generatedAt === 'string') &&
    (metadata.resources === undefined || Array.isArray(metadata.resources)) &&
    (metadata.externalResources === undefined || Array.isArray(metadata.externalResources))
  );
}
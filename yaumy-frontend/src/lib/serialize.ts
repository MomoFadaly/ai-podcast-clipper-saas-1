import { Decimal } from "@prisma/client/runtime/library";

/**
 * Convert Prisma Decimal to number for client-side serialization
 */
export function serializeDecimal(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return value.toNumber();
}

/**
 * Deep serialize an object to ensure it's safe for client components
 * Handles Decimal, Date, BigInt, and removes functions/symbols
 */
export function serializeDecimals<T extends Record<string, any>>(obj: T): T {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Use JSON parse/stringify as a base to remove functions and symbols
  const jsonSafe = JSON.parse(JSON.stringify(obj, (key, value) => {
    // Handle Decimal
    if (value instanceof Decimal || (value && typeof value === 'object' && value.constructor?.name === 'Decimal')) {
      return value.toNumber();
    }
    
    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }
    
    // Handle Date
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Handle undefined (JSON.stringify removes undefined values)
    if (value === undefined) {
      return null;
    }
    
    return value;
  }));

  return jsonSafe as T;
}

/**
 * Ensure data is serializable for Next.js client components
 */
export function ensureSerializable<T>(data: T): T {
  try {
    // This will throw if the data contains non-serializable values
    JSON.stringify(data);
    return data;
  } catch (error) {
    // If it fails, use our deep serialization
    return serializeDecimals(data as any) as T;
  }
}
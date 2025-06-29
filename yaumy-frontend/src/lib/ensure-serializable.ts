/**
 * Ensure data is serializable for passing from Server to Client components
 * This removes functions, symbols, undefined values, and converts special types
 */
export function ensureSerializable<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Convert BigInt to string
    if (typeof value === 'bigint') {
      return value.toString();
    }
    // Convert undefined to null
    if (value === undefined) {
      return null;
    }
    // Let JSON.stringify handle other conversions (Date -> string, etc)
    return value;
  }));
}
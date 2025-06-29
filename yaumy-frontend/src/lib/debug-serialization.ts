/**
 * Debug utility to find non-serializable properties in an object
 */
export function findNonSerializableProps(obj: any, path = ''): string[] {
  const issues: string[] = [];
  
  if (obj === null || obj === undefined) {
    return issues;
  }
  
  // Check if the object itself is non-serializable
  try {
    JSON.stringify(obj);
  } catch (error) {
    issues.push(`${path || 'root'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return issues;
  }
  
  // Recursively check properties
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        
        // Check for functions
        if (typeof value === 'function') {
          issues.push(`${currentPath}: function`);
        }
        // Check for symbols
        else if (typeof value === 'symbol') {
          issues.push(`${currentPath}: symbol`);
        }
        // Check for undefined (which gets stripped by JSON.stringify)
        else if (value === undefined) {
          issues.push(`${currentPath}: undefined (will be removed)`);
        }
        // Recursively check objects and arrays
        else if (value && typeof value === 'object') {
          // Check if it's a class instance (not plain object or array)
          const constructor = value.constructor;
          if (constructor && constructor !== Object && constructor !== Array && constructor !== Date) {
            issues.push(`${currentPath}: ${constructor.name} instance`);
          }
          
          // Recurse into the object
          const nestedIssues = findNonSerializableProps(value, currentPath);
          issues.push(...nestedIssues);
        }
      }
    }
  }
  
  return issues;
}

/**
 * Log non-serializable properties for debugging
 */
export function debugSerialization(label: string, obj: any) {
  if (process.env.NODE_ENV === 'development') {
    const issues = findNonSerializableProps(obj);
    if (issues.length > 0) {
      console.warn(`[${label}] Non-serializable properties found:`, issues);
    } else {
      console.log(`[${label}] All properties are serializable`);
    }
  }
}
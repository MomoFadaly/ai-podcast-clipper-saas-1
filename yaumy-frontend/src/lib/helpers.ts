export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex that rejects consecutive dots
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Check for consecutive dots
  if (email.includes('..')) return false;
  
  // Check for leading/trailing dots in local part
  const [localPart] = email.split('@');
  if (localPart?.startsWith('.') || localPart?.endsWith('.')) return false;
  
  return emailRegex.test(email.trim());
}

export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove non-word characters except hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Remove leading hyphens
    .replace(/-+$/, '');            // Remove trailing hyphens
}
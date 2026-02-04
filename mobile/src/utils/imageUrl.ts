import { config } from '../config';

/**
 * Helper to format image URL
 * Handles:
 * - Relative URLs from backend (e.g., /uploads/...)
 * - Localhost URLs that need to be replaced with actual server IP
 * - Full URLs (returned as-is)
 */
export const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  
  // Get the server base URL (without /api)
  const baseUrl = config.apiUrl.replace(/\/api\/?$/, '');
  
  // If URL starts with http/https, check if it uses localhost and fix it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Replace localhost or 127.0.0.1 with actual server IP
    const fixedUrl = url
      .replace(/^https?:\/\/localhost(:\d+)?/, baseUrl)
      .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, baseUrl);
    return fixedUrl;
  }
  
  // Handle file:// URLs as-is
  if (url.startsWith('file:')) return url;
  
  // Prepend server base URL for relative paths
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

/**
 * Get an array of formatted image URLs
 */
export const getImageUrls = (urls?: string[] | null): string[] => {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(url => getImageUrl(url)).filter((url): url is string => url !== null);
};

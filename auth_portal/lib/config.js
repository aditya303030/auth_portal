const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();

export function getApiUrl(path = '') {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

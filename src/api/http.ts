const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export interface ApiError {
  response: {
    status: number;
    data: { message?: string };
  };
}

export async function http<T>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let data: { message?: string } = {};
    try {
      data = await response.json();
    } catch {
      // non-JSON error body
    }
    const error: ApiError = { response: { status: response.status, data } };
    throw error;
  }

  const data = await response.json();
  return { data };
}

export default http;

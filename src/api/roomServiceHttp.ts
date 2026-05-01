import { getAuthToken } from './http';

export type { ApiError } from './http';

// NestJS room-operations service
const ROOM_SERVICE_BASE_URL =
  process.env.EXPO_PUBLIC_ROOM_SERVICE_BASE_URL ?? 'http://localhost:5001/api/v1';

export async function roomServiceHttp<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T }> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${ROOM_SERVICE_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let data: { message?: string } = {};
    try {
      data = await response.json();
    } catch {
      // non-JSON error body
    }
    const error = { response: { status: response.status, data } };
    throw error;
  }

  const data = await response.json();
  return { data };
}

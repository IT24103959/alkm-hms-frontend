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

  // Handle empty bodies (e.g. 204 No Content for DELETE responses)
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  const hasBody = response.status !== 204 && contentLength !== '0' && contentType?.includes('application/json');
  if (!hasBody) {
    return { data: undefined as T };
  }

  const json = await response.json();
  // Spring Boot wraps responses: { status: "success", message: "...", data: <payload> }
  // Detect the envelope and unwrap so callers always get the inner payload.
  const isEnvelope = (
    json !== null &&
    typeof json === 'object' &&
    typeof (json as Record<string, unknown>).status === 'string' &&
    typeof (json as Record<string, unknown>).message === 'string' &&
    'data' in (json as Record<string, unknown>)
  );
  const data: T = isEnvelope ? (json as { data: T }).data : (json as T);
  return { data };
}

export default http;

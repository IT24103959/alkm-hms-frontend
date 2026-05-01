import http from './http';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  data: {
    user: {
      username: string;
      fullName: string;
      role: string;
      permissions: string[];
    };
  }
}

export const loginApi = (payload: LoginPayload) =>
  http<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

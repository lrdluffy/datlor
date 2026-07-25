import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthResponse } from '../types/auth';
import { tokenStorage } from './tokenStorage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`, { refreshToken });
  tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data.accessToken;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        refreshInFlight = refreshInFlight ?? refreshAccessToken();
        const newAccessToken = await refreshInFlight;
        refreshInFlight = null;

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        refreshInFlight = null;
        tokenStorage.clear();
        window.location.assign('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

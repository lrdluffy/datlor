import { axiosClient } from './axiosClient';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';

export const authApi = {
  register: async (payload: RegisterRequest): Promise<AuthResponse> => {
    const { data } = await axiosClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await axiosClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await axiosClient.post('/auth/logout', { refreshToken });
  },
};

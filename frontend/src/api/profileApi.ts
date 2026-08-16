import { axiosClient } from './axiosClient';
import { ProfileResponse, PublicProfileResponse, UpdatePrivacyRequest, UpdateProfileRequest } from '../types/profile';

export const profileApi = {
  getMyProfile: async (): Promise<ProfileResponse> => {
    const { data } = await axiosClient.get<ProfileResponse>('/profiles/me');
    return data;
  },

  /** US-15: Edit user profile. */
  updateMyProfile: async (payload: UpdateProfileRequest): Promise<ProfileResponse> => {
    const { data } = await axiosClient.patch<ProfileResponse>('/profiles/me', payload);
    return data;
  },

  /** US-17: Privacy setting - allow direct group add toggle. */
  updateMyPrivacy: async (payload: UpdatePrivacyRequest): Promise<ProfileResponse> => {
    const { data } = await axiosClient.patch<ProfileResponse>('/profiles/me/privacy', payload);
    return data;
  },

  /** view ANY user's profile, not just your own. */
  getProfile: async (userId: string): Promise<PublicProfileResponse> => {
    const { data } = await axiosClient.get<PublicProfileResponse>(`/profiles/${userId}`);
    return data;
  },
};

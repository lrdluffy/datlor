import { axiosClient } from './axiosClient';
import { MediaFileResponse } from '../types/media';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const mediaApi = {
  /** Uploads a file and returns its mediaId (fileUrl is also included for immediate preview). */
  upload: async (file: File, onProgress?: (percent: number) => void): Promise<MediaFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await axiosClient.post<MediaFileResponse>('/media', formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return data;
  },

  getMetadata: async (mediaId: string): Promise<MediaFileResponse> => {
    const { data } = await axiosClient.get<MediaFileResponse>(`/media/${mediaId}`);
    return data;
  },

  /** The URL to use directly in an <img src> / <a href> - content download is public (see media-service SecurityConfig). */
  contentUrl: (mediaId: string): string => `${BASE_URL}/media/${mediaId}/content`,
};

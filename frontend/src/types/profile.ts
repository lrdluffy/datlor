export interface ProfileResponse {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarMediaId: string | null;
  allowDirectGroupAdd: boolean;
}

export interface UpdateProfileRequest {
  displayName: string;
  bio?: string;
  avatarMediaId?: string;
}

export interface UpdatePrivacyRequest {
  allowDirectGroupAdd: boolean;
}

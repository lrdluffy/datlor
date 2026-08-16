export interface ProfileResponse {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarMediaId: string | null;
  allowDirectGroupAdd: boolean;
}

/**
 * what GET /profiles/{userId} returns
 * when viewing someone else's profile - deliberately has no
 * allowDirectGroupAdd field (that's a privacy preference, not profile
 * content - see the backend's PublicProfileResponse javadoc).
 */
export interface PublicProfileResponse {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarMediaId: string | null;
}


export interface UpdateProfileRequest {
  displayName: string;
  bio?: string;
  avatarMediaId?: string;
}

export interface UpdatePrivacyRequest {
  allowDirectGroupAdd: boolean;
}

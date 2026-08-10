package com.strawhats.identity.service;

import com.strawhats.identity.dto.request.UpdatePrivacyRequest;
import com.strawhats.identity.dto.request.UpdateProfileRequest;
import com.strawhats.identity.dto.response.PrivacyProfileResponse;
import com.strawhats.identity.dto.response.ProfileResponse;

import java.util.UUID;

public interface ProfileService {

    ProfileResponse getProfile(UUID userId);

    /** US-15: Edit user profile (name, bio, avatar). */
    ProfileResponse updateProfile(UUID userId, UpdateProfileRequest request);

    /** US-17: Privacy setting - allow direct group add toggle. */
    ProfileResponse updatePrivacy(UUID userId, UpdatePrivacyRequest request);

    /** Used by core-service (via the /internal/** surface) to check US-17 before a direct group add. */
    PrivacyProfileResponse getPrivacyProfile(UUID userId);
}

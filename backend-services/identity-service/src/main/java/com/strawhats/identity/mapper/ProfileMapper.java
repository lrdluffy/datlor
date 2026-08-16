package com.strawhats.identity.mapper;

import com.strawhats.identity.dto.response.PrivacyProfileResponse;
import com.strawhats.identity.dto.response.ProfileResponse;
import com.strawhats.identity.dto.response.PublicProfileResponse;
import com.strawhats.identity.entity.Profile;
import org.springframework.stereotype.Component;

@Component
public class ProfileMapper {

    public ProfileResponse toProfileResponse(Profile profile) {
        return new ProfileResponse(
                profile.getUserId(),
                profile.getDisplayName(),
                profile.getBio(),
                profile.getAvatarMediaId(),
                profile.isAllowDirectGroupAdd()
        );
    }

    public PrivacyProfileResponse toPrivacyResponse(Profile profile) {
        return new PrivacyProfileResponse(profile.getUserId(), profile.isAllowDirectGroupAdd());
    }

    public PublicProfileResponse toPublicProfileResponse(Profile profile) {
        return new PublicProfileResponse(
                profile.getUserId(),
                profile.getDisplayName(),
                profile.getBio(),
                profile.getAvatarMediaId()
        );
    }
}

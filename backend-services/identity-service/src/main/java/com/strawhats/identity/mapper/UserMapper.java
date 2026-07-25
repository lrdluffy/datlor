package com.strawhats.identity.mapper;

import com.strawhats.identity.dto.response.UserResponse;
import com.strawhats.identity.entity.Profile;
import com.strawhats.identity.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toUserResponse(User user, Profile profile) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                profile != null ? profile.getDisplayName() : null,
                profile != null ? profile.getAvatarUrl() : null,
                user.getCreatedAt()
        );
    }
}

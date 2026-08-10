package com.strawhats.identity.service.impl;

import com.strawhats.identity.dto.request.UpdatePrivacyRequest;
import com.strawhats.identity.dto.request.UpdateProfileRequest;
import com.strawhats.identity.dto.response.PrivacyProfileResponse;
import com.strawhats.identity.dto.response.ProfileResponse;
import com.strawhats.identity.entity.Profile;
import com.strawhats.identity.exception.ResourceNotFoundException;
import com.strawhats.identity.mapper.ProfileMapper;
import com.strawhats.identity.repository.ProfileRepository;
import com.strawhats.identity.service.ProfileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ProfileServiceImpl implements ProfileService {

    private final ProfileRepository profileRepository;
    private final ProfileMapper profileMapper;

    public ProfileServiceImpl(ProfileRepository profileRepository, ProfileMapper profileMapper) {
        this.profileRepository = profileRepository;
        this.profileMapper = profileMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId) {
        return profileMapper.toProfileResponse(findOrThrow(userId));
    }

    @Override
    @Transactional
    public ProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        Profile profile = findOrThrow(userId);

        profile.setDisplayName(request.displayName().trim());
        profile.setBio(request.bio() == null ? null : request.bio().trim());
        profile.setAvatarMediaId(request.avatarMediaId());

        profile = profileRepository.save(profile);
        return profileMapper.toProfileResponse(profile);
    }

    @Override
    @Transactional
    public ProfileResponse updatePrivacy(UUID userId, UpdatePrivacyRequest request) {
        Profile profile = findOrThrow(userId);
        profile.setAllowDirectGroupAdd(request.allowDirectGroupAdd());
        profile = profileRepository.save(profile);
        return profileMapper.toProfileResponse(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public PrivacyProfileResponse getPrivacyProfile(UUID userId) {
        return profileMapper.toPrivacyResponse(findOrThrow(userId));
    }

    private Profile findOrThrow(UUID userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile for user " + userId + " was not found"));
    }
}

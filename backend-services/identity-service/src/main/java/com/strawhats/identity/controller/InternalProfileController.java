package com.strawhats.identity.controller;

import com.strawhats.identity.dto.response.PrivacyProfileResponse;
import com.strawhats.identity.service.ProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service only (guarded by InternalApiKeyFilter, see
 * SecurityConfig) - core-service calls this before adding a user to a
 * group without an invite (US-17), instead of ever reaching into
 * identity-service's database directly. This is the ONLY sanctioned way
 * another service learns a user's privacy preference.
 */
@RestController
@RequestMapping("/internal/profiles")
public class InternalProfileController {

    private final ProfileService profileService;

    public InternalProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{userId}/privacy")
    public PrivacyProfileResponse getPrivacy(@PathVariable UUID userId) {
        return profileService.getPrivacyProfile(userId);
    }
}

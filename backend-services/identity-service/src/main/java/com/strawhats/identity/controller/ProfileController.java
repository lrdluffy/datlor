package com.strawhats.identity.controller;

import com.strawhats.identity.dto.request.UpdatePrivacyRequest;
import com.strawhats.identity.dto.request.UpdateProfileRequest;
import com.strawhats.identity.dto.response.ProfileResponse;
import com.strawhats.identity.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(profileService.getProfile(currentUserId(authentication)));
    }

    /** US-15: Edit user profile (name, bio, avatar mediaId). */
    @PatchMapping("/me")
    public ResponseEntity<ProfileResponse> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request,
                                                            Authentication authentication) {
        return ResponseEntity.ok(profileService.updateProfile(currentUserId(authentication), request));
    }

    /** US-17: Privacy setting - allow direct group add toggle. */
    @PatchMapping("/me/privacy")
    public ResponseEntity<ProfileResponse> updateMyPrivacy(@Valid @RequestBody UpdatePrivacyRequest request,
                                                            Authentication authentication) {
        return ResponseEntity.ok(profileService.updatePrivacy(currentUserId(authentication), request));
    }

    private UUID currentUserId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }
}

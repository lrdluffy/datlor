package com.strawhats.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * US-15: Edit user profile. `avatarMediaId` is a logical reference to a
 * file already uploaded to media-service (via its own upload endpoint) -
 * this request only ever carries the id, never any file bytes.
 */
public record UpdateProfileRequest(

        @NotBlank(message = "displayName is required")
        @Size(max = 80, message = "displayName must be at most 80 characters")
        String displayName,

        @Size(max = 500, message = "bio must be at most 500 characters")
        String bio,

        UUID avatarMediaId
) {
}

package com.strawhats.identity.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(

        @NotBlank(message = "refreshToken is required")
        String refreshToken
) {
}

package com.strawhats.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * US-01: User registration (email + password).
 * displayName is optional in the wireframe (page 1 only shows email/password);
 * when omitted, the service derives one from the email's local part.
 */
public record RegisterRequest(

        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid email address")
        @Size(max = 255, message = "email must be at most 255 characters")
        String email,

        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "password must contain at least one letter and one digit"
        )
        String password,

        @Size(max = 80, message = "displayName must be at most 80 characters")
        String displayName
) {
}

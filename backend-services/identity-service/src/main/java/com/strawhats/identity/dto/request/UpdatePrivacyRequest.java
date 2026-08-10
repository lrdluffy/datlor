package com.strawhats.identity.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * US-17: Privacy setting - allow direct group add toggle.
 * true  -> core-service may add this user to a group without an invite.
 * false -> core-service MUST go through the invite/accept flow instead.
 */
public record UpdatePrivacyRequest(

        @NotNull(message = "allowDirectGroupAdd is required")
        Boolean allowDirectGroupAdd
) {
}

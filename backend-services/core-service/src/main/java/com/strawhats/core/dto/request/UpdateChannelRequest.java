package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * edit an existing channel's name/
 * description. Sent as the body of a PATCH request to /api/channels/{id} -
 * a one-off administrative action, not a live multi-party event stream,
 * same reasoning ChannelRestController's class javadoc already gives for
 * why channel deletion is REST rather than STOMP.
 *
 * Full-replace semantics, mirroring CreateChannelRequest and identity-
 * service's UpdateProfileRequest exactly: `name` is required even though
 * this is an "edit", and `description` is always overwritten (omit/null
 * clears it) rather than only patching whichever fields were sent.
 */
public record UpdateChannelRequest(

        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must be at most 100 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description
) {
}

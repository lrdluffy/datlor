package com.strawhats.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * edit an existing group's name/
 * description. Sent as the body of a PATCH request to /api/groups/{id} -
 * a one-off action, not a live multi-party event stream, same reasoning
 * channel edit/delete already use for being REST rather than STOMP.
 *
 * Full-replace semantics, mirroring UpdateChannelRequest exactly: `name`
 * is required even though this is an "edit", and `description` is always
 * overwritten (omit/null clears it).
 */
public record UpdateGroupRequest(

        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must be at most 100 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description
) {
}

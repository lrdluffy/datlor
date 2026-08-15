package com.strawhats.core.service;

import com.strawhats.core.dto.request.DeleteGroupMessageRequest;
import com.strawhats.core.dto.request.EditGroupMessageRequest;
import com.strawhats.core.dto.request.GroupMessageRequest;
import com.strawhats.core.dto.response.MessageResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Deliberately separate from {@link MessageService} even though both
 * ultimately persist through {@link com.strawhats.core.service.impl.MessagePersistenceHelper} -
 * group membership/permission checks (ACTIVE GroupMember, no
 * RESTRICTED/BLOCKED tier, no topics) are entirely different from channel
 * membership, per "Groups ≠ Channels".
 */
public interface GroupMessageService {

    /** Immediate or scheduled (US-19), with optional media (US-18) - never over REST. */
    MessageResponse sendMessage(UUID senderId, GroupMessageRequest request);

    /** Only the original sender may edit their own message. Broadcasts MESSAGE_UPDATED - never over REST. */
    MessageResponse editMessage(UUID actingUserId, EditGroupMessageRequest request);

    /** Allowed for the sender or a group ADMIN (soft delete). Broadcasts MESSAGE_DELETED - never over REST. */
    MessageResponse deleteMessage(UUID actingUserId, DeleteGroupMessageRequest request);


    List<MessageResponse> getHistory(UUID groupId, UUID requestingUserId, LocalDateTime before, int limit);
}

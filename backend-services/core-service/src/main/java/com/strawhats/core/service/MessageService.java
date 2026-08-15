package com.strawhats.core.service;

import com.strawhats.core.dto.request.DeleteMessageRequest;
import com.strawhats.core.dto.request.EditMessageRequest;
import com.strawhats.core.dto.request.SendMessageRequest;
import com.strawhats.core.dto.response.MessageResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MessageService {

    /**
     * US-04: Send message in a public channel. Persists the message and a
     * matching search_outbox row in one transaction, then returns the DTO
     * to broadcast on /topic/channels/{channelId}. Never exposed over REST.
     */
    MessageResponse sendMessage(UUID senderId, SendMessageRequest request);

    /**
     * Edit a previously sent channel message. Only the original sender may
     * edit their own message. Real-time, multi-party event (broadcasts
     * MESSAGE_UPDATED) - never exposed over REST, same as sendMessage.
     */
    MessageResponse editMessage(UUID actingUserId, EditMessageRequest request);

    /**
     * Delete a previously sent channel message (soft delete). Allowed for
     * the message's own sender OR a channel admin/moderator (MODERATOR and
     * above - the same threshold US-12 uses for block/restrict). Broadcasts
     * MESSAGE_DELETED - never exposed over REST.
     */
    MessageResponse deleteMessage(UUID actingUserId, DeleteMessageRequest request);

    /**
     * US-05: View channel messages in real time - this loads the initial
     * history page over REST; new messages after that arrive via the WS
     * subscription instead of further REST calls. Unfiltered by topic -
     * returns every message in the channel regardless of topic.
     */
    List<MessageResponse> getHistory(UUID channelId, UUID requestingUserId, LocalDateTime before, int limit);

    /**
     * Topic-aware history: scoped to one specific topic (`topicId` non-null)
     * or to the channel's no-topic messages (`topicId` null). Paginated
     * independently of {@link #getHistory} and of every other topic.
     */
    List<MessageResponse> getTopicHistory(UUID channelId, UUID requestingUserId, UUID topicId,
                                           LocalDateTime before, int limit);

    /**
     * filter the channel's messages down to ones
     * containing `query` (case-insensitive, required/non-blank). Same
     * cursor-pagination shape as {@link #getHistory}. Any member may
     * search, including RESTRICTED ones (search is a read, same permission
     * tier as getHistory - not gated by the ACTIVE-only threshold sending a
     * message requires).
     */
    List<MessageResponse> searchMessages(UUID channelId, UUID requestingUserId, String query,
                                         LocalDateTime before, int limit);
}

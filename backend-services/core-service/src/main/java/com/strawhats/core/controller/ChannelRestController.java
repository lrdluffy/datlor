package com.strawhats.core.controller;

import com.strawhats.core.dto.response.ChannelDetailResponse;
import com.strawhats.core.dto.response.ChannelMemberResponse;
import com.strawhats.core.dto.response.ChannelResponse;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.service.ChannelService;
import com.strawhats.core.service.MessageService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Everything here is intentionally non-realtime: channel/member listing and
 * message history are plain request/response reads. Sending messages,
 * creating channels, and changing roles/status all go through the STOMP
 * handlers in {@link ChannelWebSocketController} instead - see the class
 * javadoc there for why.
 */
@RestController
@RequestMapping("/api/channels")
public class ChannelRestController {

    private final ChannelService channelService;
    private final MessageService messageService;

    public ChannelRestController(ChannelService channelService,
                                  MessageService messageService) {
        this.channelService = channelService;
        this.messageService = messageService;
    }

    /** Channels the current user belongs to - powers ChannelListPage. */
    @GetMapping
    public ResponseEntity<List<ChannelResponse>> listMyChannels(Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(channelService.listChannelsForUser(userId));
    }

    /**
     * Search all channels by name, regardless of membership - `q` may be
     * blank/omitted to browse recent channels. Each result's `viewerRole`
     * is null for channels the caller hasn't joined yet, so the frontend
     * can show "Join" vs "Open" without a second request.
     */
    @GetMapping("/search")
    public ResponseEntity<List<ChannelResponse>> searchChannels(@RequestParam(required = false) String q,
                                                                 Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(channelService.searchChannels(q, userId));
    }

    /**
     * Self-service join found via search - no invite needed (channels have
     * no private/invite-based tier, unlike groups). Broadcasts
     * MEMBER_JOINED to /topic/channels/{channelId}/members.
     */
    @PostMapping("/{channelId}/join")
    public ResponseEntity<ChannelMemberResponse> joinChannel(@PathVariable UUID channelId,
                                                              Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(channelService.joinChannel(channelId, userId));
    }

    /** Full channel detail (members + topics) - powers ChannelViewPage / settings. */
    @GetMapping("/{channelId}")
    public ResponseEntity<ChannelDetailResponse> getChannel(@PathVariable UUID channelId,
                                                             Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(channelService.getChannelDetail(channelId, userId));
    }

    /** US-10: member list & roles, as its own endpoint for the settings screen. */
    @GetMapping("/{channelId}/members")
    public ResponseEntity<List<ChannelMemberResponse>> listMembers(@PathVariable UUID channelId,
                                                                    Authentication authentication) {
        UUID userId = currentUserId(authentication);
        // Reuses the membership check inside getChannelDetail's service call path
        // by asking for the full detail and projecting just the members.
        return ResponseEntity.ok(channelService.getChannelDetail(channelId, userId).members());
    }

    /**
     * US-05 (initial load only): cursor-paginated message history, newest
     * first. Pass the oldest `createdAt` currently loaded as `before` to
     * fetch the next older page. Live updates after this arrive via WS.
     *
     * Topic-aware filtering via the optional `topicId` param:
     *  - omitted entirely      → unfiltered, every message regardless of topic (default)
     *  - a topic's UUID        → only that topic's messages
     *  - the literal "none"    → only messages that have NO topic
     */
    @GetMapping("/{channelId}/messages")
    public ResponseEntity<List<MessageResponse>> getHistory(
            @PathVariable UUID channelId,
            @RequestParam(required = false) String topicId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime before,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        UUID userId = currentUserId(authentication);

        if (topicId == null) {
            return ResponseEntity.ok(messageService.getHistory(channelId, userId, before, limit));
        }

        UUID parsedTopicId = "none".equalsIgnoreCase(topicId) ? null : UUID.fromString(topicId);
        return ResponseEntity.ok(messageService.getTopicHistory(channelId, userId, parsedTopicId, before, limit));
    }

    /**
     * "6.4 جستجوی پیام‌ها": search this channel's messages - `q` is
     * required and matched case-insensitively against message content.
     * Same before/limit cursor-pagination shape as getHistory above; not
     * topic-scoped (searches across every topic and no-topic messages
     * alike).
     */
    @GetMapping("/{channelId}/messages/search")
    public ResponseEntity<List<MessageResponse>> searchMessages(
            @PathVariable UUID channelId,
            @RequestParam String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime before,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(messageService.searchMessages(channelId, userId, q, before, limit));
    }

    /** US-13: Delete channel (soft delete, OWNER only). Broadcasts CHANNEL_DELETED over WS. */
    @DeleteMapping("/{channelId}")
    public ResponseEntity<Void> deleteChannel(@PathVariable UUID channelId, Authentication authentication) {
        UUID userId = currentUserId(authentication);
        channelService.deleteChannel(channelId, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }
}

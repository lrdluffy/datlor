package com.strawhats.core.security;

import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.GroupMember;
import com.strawhats.core.entity.enums.GroupMemberStatus;
import com.strawhats.core.entity.enums.MemberStatus;
import com.strawhats.core.repository.ChannelMemberRepository;
import com.strawhats.core.repository.GroupMemberRepository;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Two responsibilities, both CRITICAL to the "WebSocket must be
 * AUTHENTICATED using JWT" requirement:
 *
 * 1. On CONNECT: extract the JWT from the `Authorization` STOMP header,
 *    validate it, and attach a {@link StompPrincipal} to the session so
 *    every subsequent frame on this session is attributed to a real user.
 *
 * 2. On SUBSCRIBE to /topic/channels/{id}(/members|/topics/{topicId}) OR
 *    /topic/groups/{id}(/members) - a valid JWT alone is not enough; a
 *    user must also be a non-blocked channel member, or an ACTIVE group
 *    member, of whichever one they're subscribing to. This stops an
 *    authenticated-but-unrelated user from listening in on a live feed by
 *    simply guessing its UUID. Authorization is always scoped to the
 *    channel/group itself, never to the sub-resource - a topic never
 *    carries its own separate ACL ("topic does NOT override channel
 *    permissions"), and neither does a group's members sub-topic.
 */
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private static final Pattern CHANNEL_TOPIC_PATTERN =
            Pattern.compile("^/topic/channels/([0-9a-fA-F-]{36})(?:/members|/topics/[0-9a-fA-F-]{36})?$");

    private static final Pattern GROUP_TOPIC_PATTERN =
            Pattern.compile("^/topic/groups/([0-9a-fA-F-]{36})(?:/members)?$");

    private final JwtTokenValidator jwtTokenValidator;
    private final ChannelMemberRepository channelMemberRepository;
    private final GroupMemberRepository groupMemberRepository;

    public JwtChannelInterceptor(JwtTokenValidator jwtTokenValidator,
                                  ChannelMemberRepository channelMemberRepository,
                                  GroupMemberRepository groupMemberRepository) {
        this.jwtTokenValidator = jwtTokenValidator;
        this.channelMemberRepository = channelMemberRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull org.springframework.messaging.MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        }

        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);
        if (token == null) {
            throw new InvalidWebSocketTokenException("Missing Authorization header on CONNECT frame");
        }

        UUID userId = jwtTokenValidator.validateAndExtractUserId(token);
        accessor.setUser(new StompPrincipal(userId));
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        Matcher channelMatcher = CHANNEL_TOPIC_PATTERN.matcher(destination);
        if (channelMatcher.matches()) {
            authorizeChannelSubscription(accessor, channelMatcher);
            return;
        }

        Matcher groupMatcher = GROUP_TOPIC_PATTERN.matcher(destination);
        if (groupMatcher.matches()) {
            authorizeGroupSubscription(accessor, groupMatcher);
            return;
        }

        // Not a per-channel or per-group topic (e.g. a /user/queue/** destination) - nothing to check here.
    }

    private void authorizeChannelSubscription(StompHeaderAccessor accessor, Matcher matcher) {
        StompPrincipal principal = requireAuthenticatedPrincipal(accessor);
        UUID channelId = UUID.fromString(matcher.group(1));

        ChannelMember membership = channelMemberRepository
                .findByChannel_IdAndUserId(channelId, principal.getUserId())
                .orElseThrow(() -> new MessagingException(
                        "User " + principal.getUserId() + " is not a member of channel " + channelId));

        if (membership.getStatus() == MemberStatus.BLOCKED) {
            throw new MessagingException(
                    "User " + principal.getUserId() + " is blocked from channel " + channelId);
        }
        // RESTRICTED members may still read (subscribe) - only sending is denied elsewhere.
    }

    private void authorizeGroupSubscription(StompHeaderAccessor accessor, Matcher matcher) {
        StompPrincipal principal = requireAuthenticatedPrincipal(accessor);
        UUID groupId = UUID.fromString(matcher.group(1));

        GroupMember membership = groupMemberRepository
                .findByGroup_IdAndUserId(groupId, principal.getUserId())
                .orElseThrow(() -> new MessagingException(
                        "User " + principal.getUserId() + " is not a member of group " + groupId));

        if (membership.getStatus() != GroupMemberStatus.ACTIVE) {
            throw new MessagingException(
                    "User " + principal.getUserId() + " is not an active member of group " + groupId);
        }
    }

    private StompPrincipal requireAuthenticatedPrincipal(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof StompPrincipal principal)) {
            throw new InvalidWebSocketTokenException("Subscription attempted on an unauthenticated session");
        }
        return principal;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        String raw = (authHeaders == null || authHeaders.isEmpty()) ? null : authHeaders.get(0);

        if (raw == null) {
            List<String> tokenHeaders = accessor.getNativeHeader("token");
            raw = (tokenHeaders == null || tokenHeaders.isEmpty()) ? null : tokenHeaders.get(0);
            return raw;
        }

        return raw.startsWith("Bearer ") ? raw.substring("Bearer ".length()) : raw;
    }
}

package com.strawhats.core.controller;

import com.strawhats.core.dto.request.CreateChannelRequest;
import com.strawhats.core.dto.request.SendMessageRequest;
import com.strawhats.core.dto.request.UpdateMemberStatusRequest;
import com.strawhats.core.dto.request.UpdateRoleRequest;
import com.strawhats.core.dto.response.ChannelMemberResponse;
import com.strawhats.core.dto.response.ChannelResponse;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.dto.ws.WsErrorMessage;
import com.strawhats.core.dto.ws.WsEvent;
import com.strawhats.core.dto.ws.WsEventType;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.exception.InvalidTopicException;
import com.strawhats.core.exception.MemberBlockedException;
import com.strawhats.core.exception.NotAChannelMemberException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.exception.UnauthorizedActionException;
import com.strawhats.core.mapper.ChannelMapper;
import com.strawhats.core.security.StompPrincipal;
import com.strawhats.core.service.ChannelService;
import com.strawhats.core.service.MembershipService;
import com.strawhats.core.service.MessageService;
import jakarta.validation.Valid;
import jakarta.validation.ValidationException;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendToUser;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * PRIMARY real-time entry point for the datlor app. Per the architecture
 * rules, actual message delivery, channel creation, role changes, and
 * block/restrict actions all flow through these STOMP handlers - never
 * through REST. {@link ChannelRestController} only serves non-realtime
 * reads (history/listing).
 *
 * All four handlers resolve the caller's identity from `principal`, which
 * {@link com.strawhats.core.security.JwtChannelInterceptor} attached to
 * the STOMP session during the CONNECT frame - so every action below is
 * already tied to a JWT-authenticated user before it reaches this class.
 */
@Controller
public class ChannelWebSocketController {

    private final ChannelService channelService;
    private final MessageService messageService;
    private final MembershipService membershipService;
    private final ChannelMapper channelMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public ChannelWebSocketController(ChannelService channelService,
                                       MessageService messageService,
                                       MembershipService membershipService,
                                       ChannelMapper channelMapper,
                                       SimpMessagingTemplate messagingTemplate) {
        this.channelService = channelService;
        this.messageService = messageService;
        this.membershipService = membershipService;
        this.channelMapper = channelMapper;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * US-09: Create channel. Replied to the creator only (on /user/queue/channels)
     * since no one else is subscribed to a channel that didn't exist a moment ago;
     * other users will see it next time they load ChannelListPage over REST.
     */
    @MessageMapping("/channels.create")
    @SendToUser(destinations = "/queue/channels", broadcast = false)
    public WsEvent<ChannelResponse> createChannel(@Valid @Payload CreateChannelRequest request, Principal principal) {
        ChannelResponse response = channelService.createChannel(userId(principal), request.name(), request.description());
        return WsEvent.of(WsEventType.CHANNEL_CREATED, response);
    }

    /**
     * US-04: Send message in a public channel. THE canonical real-time
     * message path - broadcasts to every subscriber of
     * /topic/channels/{channelId}, which is also how US-05 (view messages
     * in real time) is satisfied on the receiving end.
     *
     * Topic-aware: when the message carries a topicId, it is ALSO
     * broadcast to /topic/channels/{channelId}/topics/{topicId} so a
     * client focused on just that topic doesn't have to filter the
     * channel-wide firehose itself. The channel-wide broadcast always
     * happens too, topic or not, since that stream means "all messages".
     */
    @MessageMapping("/messages.send")
    public void sendMessage(@Valid @Payload SendMessageRequest request, Principal principal) {
        MessageResponse response = messageService.sendMessage(userId(principal), request);
        WsEvent<MessageResponse> event = WsEvent.of(WsEventType.MESSAGE_NEW, response);

        messagingTemplate.convertAndSend("/topic/channels/" + request.channelId(), event);

        if (response.topicId() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/channels/" + request.channelId() + "/topics/" + response.topicId(), event);
        }
    }

    /** US-11: Assign channel member roles. Broadcasts to the channel's members topic. */
    @MessageMapping("/channels.updateRole")
    public void updateRole(@Valid @Payload UpdateRoleRequest request, Principal principal) {
        ChannelMember updated = membershipService.updateRole(
                request.channelId(), userId(principal), request.targetUserId(), request.newRole());

        ChannelMemberResponse response = channelMapper.toMemberResponse(updated);
        WsEvent<ChannelMemberResponse> event = WsEvent.of(WsEventType.MEMBER_ROLE_UPDATED, response);
        messagingTemplate.convertAndSend("/topic/channels/" + request.channelId() + "/members", event);
    }

    /** US-12: Block/restrict a channel member (also used to lift a block/restriction via newStatus=ACTIVE). */
    @MessageMapping("/channels.blockMember")
    public void blockMember(@Valid @Payload UpdateMemberStatusRequest request, Principal principal) {
        ChannelMember updated = membershipService.updateStatus(
                request.channelId(), userId(principal), request.targetUserId(), request.newStatus());

        ChannelMemberResponse response = channelMapper.toMemberResponse(updated);
        WsEvent<ChannelMemberResponse> event = WsEvent.of(WsEventType.MEMBER_STATUS_UPDATED, response);
        messagingTemplate.convertAndSend("/topic/channels/" + request.channelId() + "/members", event);
    }

    // ---------------------------------------------------------------
    // Error handling: every rejection here is unicast to the offending
    // client's own /user/queue/errors, never broadcast to the channel.
    // ---------------------------------------------------------------

    @MessageExceptionHandler({UnauthorizedActionException.class, MemberBlockedException.class,
            NotAChannelMemberException.class})
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleForbidden(RuntimeException ex) {
        return WsErrorMessage.of("FORBIDDEN", ex.getMessage());
    }

    @MessageExceptionHandler(ResourceNotFoundException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleNotFound(ResourceNotFoundException ex) {
        return WsErrorMessage.of("NOT_FOUND", ex.getMessage());
    }

    @MessageExceptionHandler({ValidationException.class, MethodArgumentNotValidException.class,
            InvalidTopicException.class})
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleValidation(Exception ex) {
        return WsErrorMessage.of("VALIDATION_ERROR", ex.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleGeneric(Exception ex) {
        return WsErrorMessage.of("INTERNAL_ERROR", "An unexpected error occurred");
    }

    private java.util.UUID userId(Principal principal) {
        return ((StompPrincipal) principal).getUserId();
    }
}

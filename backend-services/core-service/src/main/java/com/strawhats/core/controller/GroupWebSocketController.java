package com.strawhats.core.controller;

import com.strawhats.core.dto.request.GroupMessageRequest;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.dto.ws.WsErrorMessage;
import com.strawhats.core.dto.ws.WsEvent;
import com.strawhats.core.dto.ws.WsEventType;
import com.strawhats.core.entity.enums.MessageStatus;
import com.strawhats.core.exception.InvalidMediaException;
import com.strawhats.core.exception.NotAGroupMemberException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.exception.ServiceCommunicationException;
import com.strawhats.core.security.StompPrincipal;
import com.strawhats.core.service.GroupMessageService;
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
import java.util.UUID;

/**
 * PRIMARY real-time entry point for GROUP messaging - deliberately a
 * separate controller from {@link ChannelWebSocketController}, even
 * though both ultimately call into MessagePersistenceHelper, because
 * group membership/permission checks are entirely different from channel
 * membership (see GroupMessageServiceImpl). Group creation and
 * invite/accept/reject are REST (see {@link GroupController}) since
 * they're one-off administrative actions, not a live event stream -
 * sending a message is the one group action that IS real-time.
 */
@Controller
public class GroupWebSocketController {

    private final GroupMessageService groupMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    public GroupWebSocketController(GroupMessageService groupMessageService,
                                     SimpMessagingTemplate messagingTemplate) {
        this.groupMessageService = groupMessageService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * US-04-equivalent for groups + US-18 (media) + US-19 (scheduling).
     * Broadcasts to /topic/groups/{groupId} - a SCHEDULED (PENDING)
     * message is NOT broadcast here, only privately acknowledged on
     * /user/queue/scheduled; ScheduledMessageDispatcher broadcasts it once
     * due, same as for channels.
     */
    @MessageMapping("/groups.messages.send")
    public void sendMessage(@Valid @Payload GroupMessageRequest request, Principal principal) {
        MessageResponse response = groupMessageService.sendMessage(userId(principal), request);

        if (response.status() == MessageStatus.PENDING) {
            messagingTemplate.convertAndSendToUser(
                    principal.getName(), "/queue/scheduled", WsEvent.of(WsEventType.MESSAGE_SCHEDULED, response));
            return;
        }

        WsEvent<MessageResponse> event = WsEvent.of(WsEventType.MESSAGE_NEW, response);
        messagingTemplate.convertAndSend("/topic/groups/" + request.groupId(), event);
    }

    // ---------------------------------------------------------------
    // Error handling: every rejection here is unicast to the offending
    // client's own /user/queue/errors, never broadcast to the group.
    // ---------------------------------------------------------------

    @MessageExceptionHandler(NotAGroupMemberException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleForbidden(NotAGroupMemberException ex) {
        return WsErrorMessage.of("FORBIDDEN", ex.getMessage());
    }

    @MessageExceptionHandler(ResourceNotFoundException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleNotFound(ResourceNotFoundException ex) {
        return WsErrorMessage.of("NOT_FOUND", ex.getMessage());
    }

    @MessageExceptionHandler({ValidationException.class, MethodArgumentNotValidException.class,
            InvalidMediaException.class})
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleValidation(Exception ex) {
        return WsErrorMessage.of("VALIDATION_ERROR", ex.getMessage());
    }

    @MessageExceptionHandler(ServiceCommunicationException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleServiceCommunication(ServiceCommunicationException ex) {
        return WsErrorMessage.of("SERVICE_UNAVAILABLE", ex.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsErrorMessage handleGeneric(Exception ex) {
        return WsErrorMessage.of("INTERNAL_ERROR", "An unexpected error occurred");
    }

    private UUID userId(Principal principal) {
        return ((StompPrincipal) principal).getUserId();
    }
}

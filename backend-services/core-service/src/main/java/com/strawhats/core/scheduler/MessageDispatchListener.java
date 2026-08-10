package com.strawhats.core.scheduler;

import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.dto.ws.WsEvent;
import com.strawhats.core.dto.ws.WsEventType;
import com.strawhats.core.entity.enums.ChatType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Fires strictly AFTER the transaction that flipped a message's status to
 * SENT has committed (TransactionPhase.AFTER_COMMIT) - this is what
 * guarantees a client can never see a MESSAGE_NEW broadcast for a status
 * update that didn't actually persist. Routes to the same destinations a
 * normal immediate send would have used (channel-wide, group-wide, and the
 * topic-specific stream when applicable), so from the receiving client's
 * point of view a dispatched scheduled message is indistinguishable from
 * one sent immediately - it just arrived later.
 */
@Component
public class MessageDispatchListener {

    private final SimpMessagingTemplate messagingTemplate;

    public MessageDispatchListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageDispatched(MessageDispatchedEvent event) {
        MessageResponse message = event.message();
        WsEvent<MessageResponse> wsEvent = WsEvent.of(WsEventType.MESSAGE_NEW, message);

        if (message.chatType() == ChatType.CHANNEL) {
            messagingTemplate.convertAndSend("/topic/channels/" + message.chatId(), wsEvent);
            if (message.topicId() != null) {
                messagingTemplate.convertAndSend(
                        "/topic/channels/" + message.chatId() + "/topics/" + message.topicId(), wsEvent);
            }
        } else if (message.chatType() == ChatType.GROUP) {
            messagingTemplate.convertAndSend("/topic/groups/" + message.chatId(), wsEvent);
        }
        // DM is reserved for a future slice - nothing to broadcast to yet.
    }
}

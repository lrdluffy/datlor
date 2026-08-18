package com.strawhats.core.scheduler;

import com.strawhats.core.config.SchedulingProperties;
import com.strawhats.core.entity.Message;
import com.strawhats.core.entity.enums.MessageStatus;
import com.strawhats.core.mapper.MessageMapper;
import com.strawhats.core.repository.MessageRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * US-19: the ONLY place a scheduled (PENDING) message is ever broadcast.
 * Runs on a fixed delay (scheduling.dispatcher.fixed-delay-ms), picks up
 * every PENDING message whose scheduled_at has arrived, flips it to SENT,
 * and publishes one {@link MessageDispatchedEvent} per message inside the
 * SAME transaction as that status update - MessageDispatchListener then
 * performs the actual WebSocket broadcast, but only after the transaction
 * has durably committed (see its class javadoc for why that matters).
 *
 * Deliberately NOT simplified into "just broadcast inline here": doing so
 * would risk a client seeing a message whose SENT status update then
 * rolled back (e.g. a mid-transaction failure processing a later message
 * in the same batch), which would leave the DB and the clients disagreeing
 * about whether the message was ever actually sent.
 */
@Component
public class ScheduledMessageDispatcher {

    private final MessageRepository messageRepository;
    private final MessageMapper messageMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final SchedulingProperties schedulingProperties;

    public ScheduledMessageDispatcher(MessageRepository messageRepository,
                                       MessageMapper messageMapper,
                                       ApplicationEventPublisher eventPublisher,
                                       SchedulingProperties schedulingProperties) {
        this.messageRepository = messageRepository;
        this.messageMapper = messageMapper;
        this.eventPublisher = eventPublisher;
        this.schedulingProperties = schedulingProperties;
    }

    @Scheduled(fixedDelayString = "${scheduling.dispatcher.fixed-delay-ms}")
    @Transactional
    public void dispatchDueMessages() {
        // Use UTC time instead of server local time
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);

        List<Message> due = messageRepository.findDueScheduledMessages(
                nowUtc, PageRequest.of(0, schedulingProperties.batchSize()));

        for (Message message : due) {
            message.setStatus(MessageStatus.SENT);
            messageRepository.save(message);
            eventPublisher.publishEvent(new MessageDispatchedEvent(messageMapper.toResponse(message)));
        }
    }
}

package com.strawhats.core.entity;

import com.strawhats.core.entity.enums.ChatType;
import com.strawhats.core.entity.enums.MessageStatus;
import com.strawhats.core.entity.enums.MessageType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Note: `content_tsv` (TSVECTOR) is intentionally NOT mapped here - it is
 * maintained by a DB trigger (see V2 migration) and JPA never reads or
 * writes it directly.
 */
@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "chat_type", nullable = false)
    @Builder.Default
    private ChatType chatType = ChatType.CHANNEL;

    /** For chatType = CHANNEL, this is the channel's id. */
    @Column(name = "chat_id", nullable = false)
    private UUID chatId;

    /** Logical reference to identity-service's users.id - no cross-DB FK. */
    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** Logical reference to media-service's media_files.id - no cross-DB FK. */
    @Column(name = "media_id")
    private UUID mediaId;

    /**
     * Optional: a message MAY belong to one of its channel's topics.
     * Nullable - sending a message without a topic is always allowed.
     * Enforced in MessageServiceImpl that a non-null topic must belong to
     * the SAME channel as chatId - this FK alone doesn't guarantee that.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private ChannelTopic topic;

    @Column(name = "edited", nullable = false)
    @Builder.Default
    private boolean edited = false;

    /**
     * US-19: null for an immediate message. When set (and in the future at
     * creation time), the message is persisted with status=PENDING and is
     * NOT broadcast until ScheduledMessageDispatcher's background job fires
     * it and flips status to SENT.
     */
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;


    /**
     * Edit & delete message feature: soft delete, mirroring
     * {@code Channel.deletedAt} - null while the message is active. Content
     * is preserved for audit; MessageRepository's history queries filter
     * this out, and MessagePersistenceHelper.deleteMessage is the only
     * place that sets it.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Transient
    public boolean isDeleted() {
        return deletedAt != null;
    }
}

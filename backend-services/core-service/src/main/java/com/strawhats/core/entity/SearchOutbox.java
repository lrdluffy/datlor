package com.strawhats.core.entity;

import com.strawhats.core.entity.enums.OutboxOperation;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Transactional outbox: written in the SAME transaction as the message
 * insert/update/delete (see MessageServiceImpl), guaranteeing a future
 * search-indexing consumer can poll `processed = false` and never miss or
 * duplicate an event, without a two-phase commit across services.
 */
@Entity
@Table(name = "search_outbox")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation", nullable = false)
    private OutboxOperation operation;

    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Type(JsonType.class)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed", nullable = false)
    @Builder.Default
    private boolean processed = false;
}

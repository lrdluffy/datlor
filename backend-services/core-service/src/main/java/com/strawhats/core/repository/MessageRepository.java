package com.strawhats.core.repository;

import com.strawhats.core.entity.Message;
import com.strawhats.core.entity.enums.ChatType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    /**
     * Cursor-based pagination for channel history (US-05): pass the
     * `createdAt` of the oldest message currently loaded as `before` to
     * fetch the next older page, newest-first. Unfiltered by topic - this
     * is the "all messages, any topic or none" stream.
     * `left join fetch m.topic` avoids an N+1 query per row when
     * MessageMapper reads `message.getTopic()` to populate `topicId`.
     */
    @Query("""
            select m from Message m
            left join fetch m.topic
            where m.chatType = :chatType and m.chatId = :chatId
              and (:before is null or m.createdAt < :before)
            order by m.createdAt desc
            """)
    List<Message> findHistoryPage(@Param("chatType") ChatType chatType,
                                   @Param("chatId") UUID chatId,
                                   @Param("before") LocalDateTime before,
                                   Pageable pageable);

    /**
     * Topic-aware cursor pagination: scoped to one specific topic (when
     * `topicId` is non-null) or to messages that have NO topic at all
     * (when `topicId` is null) - backs the frontend's per-topic filtered
     * view. Each topic (and the no-topic bucket) is paginated completely
     * independently of the unfiltered stream above and of every other topic.
     */
    @Query("""
            select m from Message m
            left join fetch m.topic
            where m.chatType = :chatType and m.chatId = :chatId
              and (:before is null or m.createdAt < :before)
              and (
                (:topicId is null and m.topic is null)
                or (:topicId is not null and m.topic.id = :topicId)
              )
            order by m.createdAt desc
            """)
    List<Message> findTopicHistoryPage(@Param("chatType") ChatType chatType,
                                        @Param("chatId") UUID chatId,
                                        @Param("topicId") UUID topicId,
                                        @Param("before") LocalDateTime before,
                                        Pageable pageable);

    /**
     * Required finder (spec): all messages in a channel tagged to one
     * specific topic, unpaginated. Spring Data resolves "TopicId" via
     * property-path backtracking to the topic association's `id` (i.e.
     * `topic.id`), since Message has no literal `topicId` field.
     */
    List<Message> findByChatIdAndTopicId(UUID chatId, UUID topicId);

    /**
     * Required finder (spec): all messages in a channel with NO topic,
     * unpaginated. Hibernate optimizes `topic.id is null` down to a plain
     * `topic_id is null` check on the FK column, without an actual join.
     */
    List<Message> findByChatIdAndTopicIdIsNull(UUID chatId);

    /**
     * US-19: the polling query behind ScheduledMessageDispatcher. Only
     * ever looks at PENDING rows whose scheduled_at has arrived - matches
     * the partial index on (scheduled_at) WHERE status = 'PENDING' from
     * V4, so this stays fast regardless of how much SENT history piles up.
     * Ordered oldest-due-first so a backlog is worked off in the order
     * users actually scheduled it.
     */
    @Query("""
            select m from Message m
            where m.status = 'PENDING' and m.scheduledAt <= :now
            order by m.scheduledAt asc
            """)
    List<Message> findDueScheduledMessages(@Param("now") LocalDateTime now, Pageable pageable);
}

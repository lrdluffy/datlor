package com.strawhats.core.mapper;

import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.entity.Message;
import org.springframework.stereotype.Component;

@Component
public class MessageMapper {

    public MessageResponse toResponse(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getChatId(),
                message.getSenderId(),
                message.getType(),
                message.getContent(),
                message.getMediaId(),
                message.getTopic() != null ? message.getTopic().getId() : null,
                message.isEdited(),
                message.getCreatedAt()
        );
    }
}

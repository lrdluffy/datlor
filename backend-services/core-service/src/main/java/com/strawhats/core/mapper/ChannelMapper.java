package com.strawhats.core.mapper;

import com.strawhats.core.dto.response.ChannelDetailResponse;
import com.strawhats.core.dto.response.ChannelMemberResponse;
import com.strawhats.core.dto.response.ChannelResponse;
import com.strawhats.core.dto.response.ChannelTopicResponse;
import com.strawhats.core.entity.Channel;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.ChannelTopic;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ChannelMapper {

    public ChannelMemberResponse toMemberResponse(ChannelMember member) {
        return new ChannelMemberResponse(
                member.getChannel().getId(),
                member.getUserId(),
                member.getRole(),
                member.getStatus(),
                member.isMediaAllowed(),
                member.getJoinedAt()
        );
    }

    public ChannelTopicResponse toTopicResponse(ChannelTopic topic) {
        return new ChannelTopicResponse(
                topic.getId(),
                topic.getChannel().getId(),
                topic.getName(),
                topic.getCreatedBy(),
                topic.getCreatedAt()
        );
    }

    public ChannelResponse toChannelResponse(Channel channel, int memberCount, ChannelMember viewerMembership) {
        ChannelResponse.ChannelRoleView viewerRole = viewerMembership == null
                ? null
                : new ChannelResponse.ChannelRoleView(
                        viewerMembership.getRole().name(), viewerMembership.getStatus().name());

        return new ChannelResponse(
                channel.getId(),
                channel.getName(),
                channel.getDescription(),
                channel.getCreatedBy(),
                channel.getCreatedAt(),
                memberCount,
                viewerRole
        );
    }

    public ChannelDetailResponse toDetailResponse(Channel channel,
                                                   List<ChannelMember> members,
                                                   List<ChannelTopic> topics) {
        return new ChannelDetailResponse(
                channel.getId(),
                channel.getName(),
                channel.getDescription(),
                channel.getCreatedBy(),
                channel.getCreatedAt(),
                members.stream().map(this::toMemberResponse).toList(),
                topics.stream().map(this::toTopicResponse).toList()
        );
    }
}

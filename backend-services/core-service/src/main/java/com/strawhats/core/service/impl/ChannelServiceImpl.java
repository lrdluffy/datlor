package com.strawhats.core.service.impl;

import com.strawhats.core.dto.response.ChannelDetailResponse;
import com.strawhats.core.dto.response.ChannelMemberResponse;
import com.strawhats.core.dto.response.ChannelResponse;
import com.strawhats.core.dto.ws.WsEvent;
import com.strawhats.core.dto.ws.WsEventType;
import com.strawhats.core.entity.Channel;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.ChannelTopic;
import com.strawhats.core.entity.enums.ChannelRole;
import com.strawhats.core.exception.NotAChannelMemberException;
import com.strawhats.core.exception.ResourceNotFoundException;
import com.strawhats.core.exception.UnauthorizedActionException;
import com.strawhats.core.mapper.ChannelMapper;
import com.strawhats.core.repository.ChannelMemberRepository;
import com.strawhats.core.repository.ChannelRepository;
import com.strawhats.core.repository.ChannelTopicRepository;
import com.strawhats.core.service.ChannelService;
import com.strawhats.core.service.MembershipService;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ChannelServiceImpl implements ChannelService {

    /** Default topic seeded on every new channel (matches the "# معرفی" tag shown in the wireframe). */
    private static final String DEFAULT_TOPIC_NAME = "معرفی";

    /** Caps a single search request - this is an interactive-typeahead endpoint, not a full browse/paginate one. */
    private static final int SEARCH_RESULT_LIMIT = 20;

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final ChannelTopicRepository channelTopicRepository;
    private final MembershipService membershipService;
    private final ChannelMapper channelMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public ChannelServiceImpl(ChannelRepository channelRepository,
                               ChannelMemberRepository channelMemberRepository,
                               ChannelTopicRepository channelTopicRepository,
                               MembershipService membershipService,
                               ChannelMapper channelMapper,
                               SimpMessagingTemplate messagingTemplate) {
        this.channelRepository = channelRepository;
        this.channelMemberRepository = channelMemberRepository;
        this.channelTopicRepository = channelTopicRepository;
        this.membershipService = membershipService;
        this.channelMapper = channelMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    @Transactional
    public ChannelResponse createChannel(UUID creatorUserId, String name, String description) {
        Channel channel = Channel.builder()
                .name(name.trim())
                .description(description == null ? null : description.trim())
                .createdBy(creatorUserId)
                .build();
        channel = channelRepository.save(channel);

        ChannelMember owner = membershipService.addOwner(channel, creatorUserId);

        ChannelTopic defaultTopic = ChannelTopic.builder()
                .channel(channel)
                .name(DEFAULT_TOPIC_NAME)
                .createdBy(creatorUserId)
                .build();
        channelTopicRepository.save(defaultTopic);

        return channelMapper.toChannelResponse(channel, 1, owner);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelResponse> listChannelsForUser(UUID userId) {
        List<Channel> channels = channelRepository.findActiveChannelsForUser(userId);

        return channels.stream()
                .map(channel -> {
                    List<ChannelMember> members = membershipService.listMembers(channel.getId());
                    ChannelMember viewerMembership = members.stream()
                            .filter(m -> m.getUserId().equals(userId))
                            .findFirst()
                            .orElse(null);
                    return channelMapper.toChannelResponse(channel, members.size(), viewerMembership);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelResponse> searchChannels(String query, UUID requestingUserId) {
        List<Channel> channels = channelRepository.searchActiveChannels(
                query == null ? "" : query.trim(), PageRequest.of(0, SEARCH_RESULT_LIMIT));

        return channels.stream()
                .map(channel -> {
                    List<ChannelMember> members = membershipService.listMembers(channel.getId());
                    ChannelMember viewerMembership = members.stream()
                            .filter(m -> m.getUserId().equals(requestingUserId))
                            .findFirst()
                            .orElse(null);
                    return channelMapper.toChannelResponse(channel, members.size(), viewerMembership);
                })
                .toList();
    }

    @Override
    @Transactional
    public ChannelMemberResponse joinChannel(UUID channelId, UUID userId) {
        Channel channel = channelRepository.findActiveById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + channelId + " was not found"));

        ChannelMember membership = membershipService.joinChannel(channel, userId);
        ChannelMemberResponse response = channelMapper.toMemberResponse(membership);

        messagingTemplate.convertAndSend(
                "/topic/channels/" + channelId + "/members",
                WsEvent.of(WsEventType.MEMBER_JOINED, response));

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public ChannelDetailResponse getChannelDetail(UUID channelId, UUID requestingUserId) {
        Channel channel = channelRepository.findActiveById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + channelId + " was not found"));

        // Membership is required to view settings/detail - throws NotAChannelMemberException otherwise.
        membershipService.requireMembership(channelId, requestingUserId);

        List<ChannelMember> members = membershipService.listMembers(channelId);
        List<ChannelTopic> topics = channelTopicRepository.findByChannel_IdOrderByCreatedAtAsc(channelId);

        return channelMapper.toDetailResponse(channel, members, topics);
    }

    @Override
    @Transactional
    public void deleteChannel(UUID channelId, UUID requestingUserId) {
        Channel channel = channelRepository.findActiveById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Channel " + channelId + " was not found"));

        ChannelMember requester = channelMemberRepository.findByChannel_IdAndUserId(channelId, requestingUserId)
                .orElseThrow(() -> new NotAChannelMemberException(
                        "User " + requestingUserId + " is not a member of channel " + channelId));

        if (requester.getRole() != ChannelRole.OWNER) {
            throw new UnauthorizedActionException("Only the channel owner may delete the channel");
        }

        channel.setDeletedAt(LocalDateTime.now());
        channelRepository.save(channel);

        Map<String, Object> payload = Map.of("channelId", channelId.toString());
        WsEvent<Map<String, Object>> event = WsEvent.of(WsEventType.CHANNEL_DELETED, payload);

        messagingTemplate.convertAndSend("/topic/channels/" + channelId, event);
        messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/members", event);
    }
}

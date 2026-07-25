package com.strawhats.core.service.impl;

import com.strawhats.core.entity.Channel;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.enums.ChannelRole;
import com.strawhats.core.entity.enums.MemberStatus;
import com.strawhats.core.exception.MemberBlockedException;
import com.strawhats.core.exception.NotAChannelMemberException;
import com.strawhats.core.exception.UnauthorizedActionException;
import com.strawhats.core.repository.ChannelMemberRepository;
import com.strawhats.core.service.MembershipService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class MembershipServiceImpl implements MembershipService {

    private final ChannelMemberRepository channelMemberRepository;

    public MembershipServiceImpl(ChannelMemberRepository channelMemberRepository) {
        this.channelMemberRepository = channelMemberRepository;
    }

    @Override
    @Transactional
    public ChannelMember addOwner(Channel channel, UUID userId) {
        ChannelMember owner = ChannelMember.create(channel, userId, ChannelRole.OWNER);
        return channelMemberRepository.save(owner);
    }

    @Override
    public ChannelMember requireMembership(UUID channelId, UUID userId) {
        return channelMemberRepository.findByChannel_IdAndUserId(channelId, userId)
                .orElseThrow(() -> new NotAChannelMemberException(
                        "User " + userId + " is not a member of channel " + channelId));
    }

    @Override
    public void requireCanSend(ChannelMember member) {
        switch (member.getStatus()) {
            case BLOCKED -> throw new MemberBlockedException(
                    "User " + member.getUserId() + " is blocked from channel " + member.getChannel().getId());
            case RESTRICTED -> throw new MemberBlockedException(
                    "User " + member.getUserId() + " is restricted to read-only in channel " + member.getChannel().getId());
            case ACTIVE -> { /* allowed */ }
        }
    }

    @Override
    public List<ChannelMember> listMembers(UUID channelId) {
        // The repository query only orders by joinedAt - role ranking is applied
        // here because ChannelRole's enum ordinal (OWNER=0 ... MEMBER=3) gives the
        // correct seniority order, whereas sorting by the stored role STRING in
        // SQL/JPQL would come out alphabetical instead.
        return channelMemberRepository.findByChannel_IdOrderByRoleAscJoinedAtAsc(channelId).stream()
                .sorted(Comparator.comparing(ChannelMember::getRole).thenComparing(ChannelMember::getJoinedAt))
                .toList();
    }

    @Override
    @Transactional
    public ChannelMember updateRole(UUID channelId, UUID actorUserId, UUID targetUserId, ChannelRole newRole) {
        if (actorUserId.equals(targetUserId)) {
            throw new UnauthorizedActionException("You cannot change your own role");
        }

        ChannelMember actor = requireMembership(channelId, actorUserId);
        ChannelMember target = requireMembership(channelId, targetUserId);

        if (target.getRole() == ChannelRole.OWNER) {
            throw new UnauthorizedActionException("The channel owner's role cannot be changed");
        }

        if (newRole == ChannelRole.OWNER) {
            throw new UnauthorizedActionException("Ownership transfer is not supported by this action");
        }

        if (newRole == ChannelRole.MANAGER && actor.getRole() != ChannelRole.OWNER) {
            throw new UnauthorizedActionException("Only the channel owner can grant the MANAGER role");
        }

        if (!(actor.getRole() == ChannelRole.OWNER || actor.getRole() == ChannelRole.MANAGER)) {
            throw new UnauthorizedActionException("Only OWNER or MANAGER may assign roles");
        }

        if (!actor.getRole().outranks(target.getRole())) {
            throw new UnauthorizedActionException(
                    "Your role (" + actor.getRole() + ") does not outrank the target member's role (" + target.getRole() + ")");
        }

        target.setRole(newRole);
        return channelMemberRepository.save(target);
    }

    @Override
    @Transactional
    public ChannelMember updateStatus(UUID channelId, UUID actorUserId, UUID targetUserId, MemberStatus newStatus) {
        if (actorUserId.equals(targetUserId)) {
            throw new UnauthorizedActionException("You cannot change your own status");
        }

        ChannelMember actor = requireMembership(channelId, actorUserId);
        ChannelMember target = requireMembership(channelId, targetUserId);

        if (!actor.getRole().isAtLeast(ChannelRole.MODERATOR)) {
            throw new UnauthorizedActionException("Only MODERATOR, MANAGER, or OWNER may change a member's status");
        }

        if (!actor.getRole().outranks(target.getRole())) {
            throw new UnauthorizedActionException(
                    "Your role (" + actor.getRole() + ") does not outrank the target member's role (" + target.getRole() + ")");
        }

        target.setStatus(newStatus);
        return channelMemberRepository.save(target);
    }
}

package com.strawhats.core.mapper;

import com.strawhats.core.dto.response.GroupDetailResponse;
import com.strawhats.core.dto.response.GroupInviteResponse;
import com.strawhats.core.dto.response.GroupMemberResponse;
import com.strawhats.core.dto.response.GroupResponse;
import com.strawhats.core.entity.Group;
import com.strawhats.core.entity.GroupInvite;
import com.strawhats.core.entity.GroupMember;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GroupMapper {

    public GroupMemberResponse toMemberResponse(GroupMember member) {
        return new GroupMemberResponse(
                member.getGroup().getId(),
                member.getUserId(),
                member.getRole(),
                member.getStatus(),
                member.getJoinedAt()
        );
    }

    public GroupInviteResponse toInviteResponse(GroupInvite invite) {
        return new GroupInviteResponse(
                invite.getId(),
                invite.getGroup().getId(),
                invite.getGroup().getName(),
                invite.getInviterId(),
                invite.getInviteeId(),
                invite.getStatus(),
                invite.getCreatedAt()
        );
    }

    public GroupResponse toGroupResponse(Group group, int memberCount, GroupMember viewerMembership) {
        GroupResponse.GroupRoleView viewerRole = viewerMembership == null
                ? null
                : new GroupResponse.GroupRoleView(
                        viewerMembership.getRole().name(), viewerMembership.getStatus().name());

        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getCreatedBy(),
                group.getCreatedAt(),
                memberCount,
                viewerRole
        );
    }

    public GroupDetailResponse toDetailResponse(Group group, List<GroupMember> members) {
        return new GroupDetailResponse(
                group.getId(),
                group.getName(),
                group.getCreatedBy(),
                group.getCreatedAt(),
                members.stream().map(this::toMemberResponse).toList()
        );
    }
}

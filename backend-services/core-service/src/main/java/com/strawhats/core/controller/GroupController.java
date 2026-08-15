package com.strawhats.core.controller;

import com.strawhats.core.dto.request.AddGroupMemberRequest;
import com.strawhats.core.dto.request.CreateGroupRequest;
import com.strawhats.core.dto.request.InviteToGroupRequest;
import com.strawhats.core.dto.response.GroupDetailResponse;
import com.strawhats.core.dto.response.GroupInviteResponse;
import com.strawhats.core.dto.response.GroupResponse;
import com.strawhats.core.dto.response.MessageResponse;
import com.strawhats.core.service.GroupMessageService;
import com.strawhats.core.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Group creation and invitation management are modeled as REST (not WS) -
 * they're one-off administrative actions, not a live multi-party event
 * stream. Real-time group MESSAGING is handled separately by
 * {@link GroupWebSocketController} - see its class javadoc for why.
 */
@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;
    private final GroupMessageService groupMessageService;

    public GroupController(GroupService groupService, GroupMessageService groupMessageService) {
        this.groupService = groupService;
        this.groupMessageService = groupMessageService;
    }

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody CreateGroupRequest request,
                                                      Authentication authentication) {
        GroupResponse response = groupService.createGroup(currentUserId(authentication), request.name());
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping
    public ResponseEntity<List<GroupResponse>> listMyGroups(Authentication authentication) {
        return ResponseEntity.ok(groupService.listGroupsForUser(currentUserId(authentication)));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailResponse> getGroup(@PathVariable UUID groupId, Authentication authentication) {
        return ResponseEntity.ok(groupService.getGroupDetail(groupId, currentUserId(authentication)));
    }

    /** ADMIN only. Starts the invite/accept flow. */
    @PostMapping("/{groupId}/invites")
    public ResponseEntity<GroupInviteResponse> invite(@PathVariable UUID groupId,
                                                       @Valid @RequestBody InviteToGroupRequest request,
                                                       Authentication authentication) {
        GroupInviteResponse response = groupService.invite(groupId, currentUserId(authentication), request.inviteeId());
        return ResponseEntity.status(201).body(response);
    }

    /** Only the invitee may accept their own invite. */
    @PostMapping("/invites/{inviteId}/accept")
    public ResponseEntity<GroupInviteResponse> acceptInvite(@PathVariable UUID inviteId, Authentication authentication) {
        return ResponseEntity.ok(groupService.acceptInvite(inviteId, currentUserId(authentication)));
    }

    /** Only the invitee may reject their own invite. */
    @PostMapping("/invites/{inviteId}/reject")
    public ResponseEntity<GroupInviteResponse> rejectInvite(@PathVariable UUID inviteId, Authentication authentication) {
        return ResponseEntity.ok(groupService.rejectInvite(inviteId, currentUserId(authentication)));
    }

    /** All of the current user's own PENDING invites, across every group. */
    @GetMapping("/invites/mine")
    public ResponseEntity<List<GroupInviteResponse>> listMyInvites(Authentication authentication) {
        return ResponseEntity.ok(groupService.listMyPendingInvites(currentUserId(authentication)));
    }

    /**
     * US-17: ADMIN only. Adds a member WITHOUT an invite - only succeeds if
     * the target's identity-service privacy profile allows it (403
     * DirectAddNotAllowedException otherwise, in which case use
     * {@link #invite} instead).
     */
    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupDetailResponse> addMemberDirectly(@PathVariable UUID groupId,
                                                                  @Valid @RequestBody AddGroupMemberRequest request,
                                                                  Authentication authentication) {
        GroupDetailResponse response = groupService.addMemberDirectly(groupId, currentUserId(authentication), request.userId());
        return ResponseEntity.ok(response);
    }

    /**
     * Non-realtime initial history load (mirrors channel history) - live
     * updates after this arrive via GroupWebSocketController's WS stream.
     */
    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<MessageResponse>> getHistory(
            @PathVariable UUID groupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime before,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(groupMessageService.getHistory(groupId, userId, before, limit));
    }

    /**
     * "6.4 جستجوی پیام‌ها": group-equivalent of ChannelRestController's
     * message search - `q` is required and matched case-insensitively
     * against message content.
     */
    @GetMapping("/{groupId}/messages/search")
    public ResponseEntity<List<MessageResponse>> searchMessages(
            @PathVariable UUID groupId,
            @RequestParam String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime before,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        UUID userId = currentUserId(authentication);
        return ResponseEntity.ok(groupMessageService.searchMessages(groupId, userId, q, before, limit));
    }

    private UUID currentUserId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }
}

import { Link } from 'react-router-dom';
import { ChannelMemberResponse, ChannelRole, MemberStatus, outranks, isAtLeast } from '../types/channel';

interface RoleManagementPanelProps {
  members: ChannelMemberResponse[];
  currentUserId: string;
  currentUserRole: ChannelRole;
  onUpdateRole: (targetUserId: string, newRole: ChannelRole) => void;
  onUpdateStatus: (targetUserId: string, newStatus: MemberStatus) => void;
}

const ROLE_OPTIONS: ChannelRole[] = ['MANAGER', 'MODERATOR', 'MEMBER'];

const ROLE_LABEL_FA: Record<ChannelRole, string> = {
  OWNER: 'مالک',
  MANAGER: 'مدیر',
  MODERATOR: 'ناظر',
  MEMBER: 'عضو',
};

/**
 * Client-side mirror of MembershipServiceImpl's authorization rules - this
 * only gates the UI for a good experience; the server re-checks everything
 * independently and is the actual source of truth, so there's no security
 * reliance on this logic being correct or unbypassable.
 */
function canChangeRole(currentUserRole: ChannelRole, targetRole: ChannelRole, newRole: ChannelRole): boolean {
  if (targetRole === 'OWNER' || newRole === 'OWNER') return false;
  if (newRole === 'MANAGER' && currentUserRole !== 'OWNER') return false;
  if (currentUserRole !== 'OWNER' && currentUserRole !== 'MANAGER') return false;
  return outranks(currentUserRole, targetRole);
}

function canChangeStatus(currentUserRole: ChannelRole, targetRole: ChannelRole): boolean {
  if (targetRole === 'OWNER') return false;
  if (!isAtLeast(currentUserRole, 'MODERATOR')) return false;
  return outranks(currentUserRole, targetRole);
}

export function RoleManagementPanel({
                                      members,
                                      currentUserId,
                                      currentUserRole,
                                      onUpdateRole,
                                      onUpdateStatus,
                                    }: RoleManagementPanelProps) {
  return (
      <div className="divide-y divide-line">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const roleEditable = !isSelf && canChangeRole(currentUserRole, member.role, member.role);
          const statusEditable = !isSelf && canChangeStatus(currentUserRole, member.role);

          return (
              <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm text-ink/80 flex-1 truncate">
              <Link to={`/profiles/${member.userId}`} className="hover:text-accent hover:underline">
                {member.userId.slice(0, 8)}
              </Link>
              {isSelf && <span className="text-ink/40"> (شما)</span>}
            </span>

                <select
                    value={member.role}
                    disabled={!roleEditable && member.role !== 'OWNER'}
                    onChange={(e) => onUpdateRole(member.userId, e.target.value as ChannelRole)}
                    className="text-xs border border-line rounded-lg px-2 py-1 bg-white disabled:opacity-50 disabled:bg-canvas"
                >
                  {member.role === 'OWNER' ? (
                      <option value="OWNER">{ROLE_LABEL_FA.OWNER}</option>
                  ) : (
                      ROLE_OPTIONS.map((role) => {
                        const optionEnabled = !isSelf && canChangeRole(currentUserRole, member.role, role);
                        return (
                            <option key={role} value={role} disabled={role !== member.role && !optionEnabled}>
                              {ROLE_LABEL_FA[role]}
                            </option>
                        );
                      })
                  )}
                </select>

                <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                        member.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : member.status === 'RESTRICTED'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                    }`}
                >
              {member.status === 'ACTIVE' ? 'مجاز' : member.status === 'RESTRICTED' ? 'محدود' : 'مسدود'}
            </span>

                {statusEditable && (
                    <div className="flex gap-1">
                      {member.status !== 'ACTIVE' && (
                          <button
                              onClick={() => onUpdateStatus(member.userId, 'ACTIVE')}
                              className="text-xs border border-line rounded-lg px-2 py-1 text-ink/70 hover:bg-canvas"
                          >
                            رفع محدودیت
                          </button>
                      )}
                      {member.status !== 'RESTRICTED' && (
                          <button
                              onClick={() => onUpdateStatus(member.userId, 'RESTRICTED')}
                              className="text-xs border border-line rounded-lg px-2 py-1 text-yellow-700 hover:bg-yellow-50"
                          >
                            محدود کردن
                          </button>
                      )}
                      {member.status !== 'BLOCKED' && (
                          <button
                              onClick={() => onUpdateStatus(member.userId, 'BLOCKED')}
                              className="text-xs border border-line rounded-lg px-2 py-1 text-red-700 hover:bg-red-50"
                          >
                            مسدود کردن
                          </button>
                      )}
                    </div>
                )}
              </div>
          );
        })}
      </div>
  );
}

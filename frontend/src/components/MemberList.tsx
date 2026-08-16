import { Link } from 'react-router-dom';
import { ChannelMemberResponse } from '../types/channel';

interface MemberListProps {
    members: ChannelMemberResponse[];
}

const STATUS_DOT_COLOR: Record<ChannelMemberResponse['status'], string> = {
    ACTIVE: 'bg-green-500',
    RESTRICTED: 'bg-yellow-500',
    BLOCKED: 'bg-red-500',
};

const ROLE_LABEL_FA: Record<ChannelMemberResponse['role'], string> = {
    OWNER: 'مالک',
    MANAGER: 'مدیر',
    MODERATOR: 'ناظر',
    MEMBER: 'عضو',
};

/** "10.4 مشاهده و مدیریت نمایه کاربری": each row links to that member's profile (view-only entry point). */
export function MemberList({ members }: MemberListProps) {
    return (
        <aside className="w-48 border-l border-line bg-white flex flex-col">
            <div className="px-3 py-3 border-b border-line">
                <h3 className="text-sm font-semibold text-ink">اعضا ({members.length})</h3>
            </div>
            <ul className="flex-1 overflow-y-auto">
                {members.map((member) => (
                    <li key={member.userId}>
                        <Link
                            to={`/profiles/${member.userId}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLOR[member.status]}`} />
                            <span className="truncate flex-1 text-ink/80">{member.userId.slice(0, 8)}</span>
                            <span className="text-[10px] text-ink/40">{ROLE_LABEL_FA[member.role]}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    );
}

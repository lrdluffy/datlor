import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGroupSession } from '../hooks/useGroupSession';
import { groupApi } from '../api/groupApi';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';

export function GroupViewPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();

  const { group, messages, members, isLoading, error, hasMoreHistory, loadOlderMessages, sendMessage, myScheduledMessages } =
    useGroupSession(groupId);

  const [targetUserId, setTargetUserId] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink/50">در حال بارگذاری...</div>;
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">{error ?? 'گروه یافت نشد'}</p>
      </div>
    );
  }

  const myMembership = members.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === 'ADMIN';
  const canSend = myMembership?.status === 'ACTIVE';

  /**
   * US-17: tries the direct-add path first (no invite needed); if the
   * target's privacy profile forbids it, falls back to sending an invite
   * instead, so an admin doesn't have to know the person's preference
   * up front - either way the person ends up invited or added correctly.
   */
  const handleAddOrInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = targetUserId.trim();
    if (!groupId || !userId) return;

    setInviteBusy(true);
    setInviteError(null);
    setInviteMessage(null);
    try {
      await groupApi.addMemberDirectly(groupId, { userId });
      setInviteMessage('کاربر مستقیماً به گروه اضافه شد.');
      setTargetUserId('');
    } catch (err: any) {
      if (err?.response?.status === 403) {
        try {
          await groupApi.invite(groupId, { inviteeId: userId });
          setInviteMessage('این کاربر افزودن مستقیم را مجاز نکرده - دعوت‌نامه برایش ارسال شد.');
          setTargetUserId('');
        } catch (inviteErr: any) {
          setInviteError(inviteErr?.response?.data?.message ?? 'ارسال دعوت‌نامه ناموفق بود');
        }
      } else {
        setInviteError(err?.response?.data?.message ?? 'افزودن عضو ناموفق بود');
      }
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/groups" className="text-ink/40 hover:text-ink text-sm">
            ←
          </Link>
          <h1 className="font-display font-semibold text-ink">#{group.name}</h1>
        </div>
        <span className="text-xs text-ink/40">{members.length} عضو</span>
      </header>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border-b border-red-100 px-4 py-2 text-center">{error}</p>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <MessageList
            messages={messages}
            currentUserId={user?.id ?? ''}
            hasMoreHistory={hasMoreHistory}
            onLoadOlder={loadOlderMessages}
            topics={[]}
            topicFilterActive={false}
          />
          {myScheduledMessages.length > 0 && (
            <p className="text-[11px] text-ink/40 px-4 pt-1">
              🕒 {myScheduledMessages.length} پیام زمان‌بندی‌شده در انتظار ارسال
            </p>
          )}
          <MessageInput
            disabled={!canSend}
            disabledReason={!canSend ? 'شما دیگر عضو این گروه نیستید' : undefined}
            onSend={sendMessage}
          />
        </div>

        <aside className="w-64 border-l border-line bg-white flex flex-col">
          <div className="px-3 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-ink">اعضا ({members.length})</h3>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    member.status === 'ACTIVE' ? 'bg-green-500' : 'bg-ink/20'
                  }`}
                />
                <span className="truncate flex-1 text-ink/80">{member.userId.slice(0, 8)}</span>
                <span className="text-[10px] text-ink/40">{member.role === 'ADMIN' ? 'مدیر' : 'عضو'}</span>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <form onSubmit={handleAddOrInvite} className="border-t border-line p-3 space-y-2">
              <label className="block text-xs text-ink/60">افزودن یا دعوت عضو (شناسه کاربر)</label>
              <input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="UUID کاربر"
                className="w-full rounded-lg border border-line px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={inviteBusy || !targetUserId.trim()}
                className="w-full bg-ink text-white text-xs font-medium rounded-lg py-1.5 disabled:opacity-40"
              >
                {inviteBusy ? '...' : 'افزودن / دعوت'}
              </button>
              {inviteMessage && <p className="text-[11px] text-green-700">{inviteMessage}</p>}
              {inviteError && <p className="text-[11px] text-red-600">{inviteError}</p>}
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

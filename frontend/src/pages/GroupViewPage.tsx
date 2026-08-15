import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Loader2, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroupSession } from '../hooks/useGroupSession';
import { groupApi } from '../api/groupApi';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';

export function GroupViewPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();

  const { group, messages, members, isLoading, error, hasMoreHistory, loadOlderMessages, sendMessage, editMessage, deleteMessage, myScheduledMessages } =
      useGroupSession(groupId);

  const [targetUserId, setTargetUserId] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
          <p className="text-sm text-ink/50 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال بارگذاری...
          </p>
        </div>
    );
  }

  if (!group) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
          <p className="text-sm text-red-600 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error ?? 'گروه یافت نشد'}
          </p>
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
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
                to="/groups"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink/40 hover:text-ink hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-accent/30">
            <Users className="w-4 h-4 text-white" />
          </span>
            <h1 className="font-display font-semibold text-ink">{group.name}</h1>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-ink/50 bg-slate-100 rounded-full px-2.5 py-1">
          <Users className="w-3 h-3" />
            {members.length} عضو
        </span>
        </header>

        {error && (
            <p className="text-xs text-red-600 bg-red-50 border-b border-red-100 px-4 py-2 text-center inline-flex items-center justify-center gap-1.5 w-full">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
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
                canModerate={isAdmin}
                onEdit={editMessage}
                onDelete={deleteMessage}
            />
            {myScheduledMessages.length > 0 && (
                <p className="text-[11px] text-accent px-4 pt-1 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {myScheduledMessages.length} پیام زمان‌بندی‌شده در انتظار ارسال
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
              <h3 className="text-sm font-semibold text-ink inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent/60" />
                اعضا ({members.length})
              </h3>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {members.map((member) => (
                  <li key={member.userId} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  {member.status === 'ACTIVE' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  )}
                  <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                          member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-ink/20'
                      }`}
                  />
                </span>
                    <span className="truncate flex-1 text-ink/80">{member.userId.slice(0, 8)}</span>
                    <span
                        className={`text-[10px] rounded-full px-1.5 py-0.5 flex-shrink-0 ${
                            member.role === 'ADMIN' ? 'bg-accent/10 text-accent font-medium' : 'text-ink/40'
                        }`}
                    >
                  {member.role === 'ADMIN' ? 'مدیر' : 'عضو'}
                </span>
                  </li>
              ))}
            </ul>

            {isAdmin && (
                <form onSubmit={handleAddOrInvite} className="border-t border-line p-3 space-y-2">
                  <label className="block text-xs text-ink/60 inline-flex items-center gap-1">
                    <UserPlus className="w-3 h-3 text-accent/60" />
                    افزودن یا دعوت عضو (شناسه کاربر)
                  </label>
                  <input
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="UUID کاربر"
                      className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-2 py-1.5 text-xs text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                  />
                  <button
                      type="submit"
                      disabled={inviteBusy || !targetUserId.trim()}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-xs font-semibold rounded-lg py-1.5 shadow shadow-accent/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                  >
                    {inviteBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'افزودن / دعوت'}
                  </button>
                  {inviteMessage && (
                      <p className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        {inviteMessage}
                      </p>
                  )}
                  {inviteError && (
                      <p className="text-[11px] text-red-600 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {inviteError}
                      </p>
                  )}
                </form>
            )}
          </aside>
        </div>
      </div>
  );
}
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash, Settings, Loader2, AlertCircle, Clock, ArchiveX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChannelSession, NO_TOPIC } from '../hooks/useChannelSession';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { MemberList } from '../components/MemberList';
import { TopicSelector } from '../components/TopicSelector';
import { isAtLeast } from '../types/channel';

export function ChannelViewPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    channel,
    messages,
    selectedTopicId,
    setSelectedTopicId,
    members,
    isLoading,
    error,
    wasDeleted,
    hasMoreHistory,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    myScheduledMessages,
    createTopic,
  } = useChannelSession(channelId);

  useEffect(() => {
    if (wasDeleted) {
      const timeout = setTimeout(() => navigate('/'), 2000);
      return () => clearTimeout(timeout);
    }
  }, [wasDeleted, navigate]);

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

  if (wasDeleted) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
          <p className="text-sm text-ink/60 inline-flex items-center gap-2">
            <ArchiveX className="w-4 h-4 text-ink/40" />
            این کانال حذف شد. در حال بازگشت به لیست کانال‌ها...
          </p>
        </div>
    );
  }

  if (!channel) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
          <p className="text-sm text-red-600 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error ?? 'کانال یافت نشد'}
          </p>
        </div>
    );
  }

  const myMembership = members.find((m) => m.userId === user?.id);
  const canSend = myMembership?.status === 'ACTIVE';
  // Same threshold US-12 uses for block/restrict - a channel admin/moderator
  // may delete anyone's message, not just their own.
  const canModerate = !!myMembership && isAtLeast(myMembership.role, 'MODERATOR');
  const disabledReason =
      myMembership?.status === 'BLOCKED'
          ? 'شما از این کانال مسدود شده‌اید'
          : myMembership?.status === 'RESTRICTED'
              ? 'دسترسی شما محدود شده و فقط می‌توانید پیام‌ها را مشاهده کنید'
              : undefined;

  const activeTopicLabel =
      selectedTopicId && selectedTopicId !== NO_TOPIC
          ? channel.topics.find((t) => t.id === selectedTopicId)?.name
          : undefined;

  return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
                to="/"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink/40 hover:text-ink hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-accent/30">
            <Hash className="w-4 h-4 text-white" />
          </span>
            <h1 className="font-display font-semibold text-ink">{channel.name}</h1>
          </div>
          {myMembership && (
              <Link
                  to={`/channels/${channel.id}/settings`}
                  className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-accent border-2 border-line hover:border-accent/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                تنظیمات
              </Link>
          )}
        </header>

        {error && (
            <p className="text-xs text-red-600 bg-red-50 border-b border-red-100 px-4 py-2 text-center inline-flex items-center justify-center gap-1.5 w-full">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
        )}

        <TopicSelector
            topics={channel.topics}
            selectedTopicId={selectedTopicId}
            onSelect={setSelectedTopicId}
            onCreateTopic={createTopic}
            canCreateTopic={canSend}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            <MessageList
                messages={messages}
                currentUserId={user?.id ?? ''}
                hasMoreHistory={hasMoreHistory}
                onLoadOlder={loadOlderMessages}
                topics={channel.topics}
                topicFilterActive={selectedTopicId !== null}
                canModerate={canModerate}
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
                disabledReason={disabledReason}
                onSend={sendMessage}
                activeTopicLabel={activeTopicLabel}
            />
          </div>
          <MemberList members={members} />
        </div>
      </div>
  );
}
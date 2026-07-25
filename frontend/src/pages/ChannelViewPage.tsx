import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChannelSession, NO_TOPIC } from '../hooks/useChannelSession';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { MemberList } from '../components/MemberList';
import { TopicSelector } from '../components/TopicSelector';

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
  } = useChannelSession(channelId);

  useEffect(() => {
    if (wasDeleted) {
      const timeout = setTimeout(() => navigate('/'), 2000);
      return () => clearTimeout(timeout);
    }
  }, [wasDeleted, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink/50">در حال بارگذاری...</div>;
  }

  if (wasDeleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-ink/60">این کانال حذف شد. در حال بازگشت به لیست کانال‌ها...</p>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">{error ?? 'کانال یافت نشد'}</p>
      </div>
    );
  }

  const myMembership = members.find((m) => m.userId === user?.id);
  const canSend = myMembership?.status === 'ACTIVE';
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
      <header className="border-b border-line bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-ink/40 hover:text-ink text-sm">
            ←
          </Link>
          <h1 className="font-display font-semibold text-ink">#{channel.name}</h1>
        </div>
        {myMembership && (
          <Link
            to={`/channels/${channel.id}/settings`}
            className="text-sm text-ink/60 hover:text-ink border border-line rounded-lg px-3 py-1.5"
          >
            تنظیمات
          </Link>
        )}
      </header>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border-b border-red-100 px-4 py-2 text-center">{error}</p>
      )}

      <TopicSelector
        topics={channel.topics}
        selectedTopicId={selectedTopicId}
        onSelect={setSelectedTopicId}
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
          />
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

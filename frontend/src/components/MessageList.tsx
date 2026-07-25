import { useEffect, useRef } from 'react';
import { ChannelTopicResponse } from '../types/channel';
import { MessageResponse } from '../types/message';

interface MessageListProps {
  messages: MessageResponse[];
  currentUserId: string;
  hasMoreHistory: boolean;
  onLoadOlder: () => void;
  /** Used to resolve a message's topicId to a display name for its tag. */
  topics: ChannelTopicResponse[];
  /** True while viewing a single topic (or "no topic") - hides the redundant per-message tag since it's implied by the active filter. */
  topicFilterActive: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({
  messages,
  currentUserId,
  hasMoreHistory,
  onLoadOlder,
  topics,
  topicFilterActive,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(messages.length);

  useEffect(() => {
    // Only auto-scroll when a message was appended (new send/receive),
    // not when older history was prepended to the top.
    if (messages.length > messageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    messageCountRef.current = messages.length;
  }, [messages.length]);

  const topicName = (topicId: string): string | undefined => topics.find((t) => t.id === topicId)?.name;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {hasMoreHistory && (
        <div className="text-center pb-2">
          <button
            onClick={onLoadOlder}
            className="text-xs text-accent hover:text-accentDeep font-medium"
          >
            بارگذاری پیام‌های قدیمی‌تر
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-center text-sm text-ink/40 mt-8">هنوز پیامی ارسال نشده است</p>
      )}

      {messages.map((message) => {
        const isOwn = message.senderId === currentUserId;
        // Only shown in the unfiltered "All messages" view - redundant once
        // the user has already filtered down to one topic (or "no topic").
        const showTopicTag = !topicFilterActive && message.topicId != null;

        return (
          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                isOwn ? 'bg-accent text-white' : 'bg-white border border-line text-ink'
              }`}
            >
              {showTopicTag && (
                <span
                  className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 mb-1 ${
                    isOwn ? 'bg-white/20 text-white' : 'bg-canvas text-ink/60'
                  }`}
                >
                  #{topicName(message.topicId as string) ?? '…'}
                </span>
              )}
              {message.type === 'TEXT' && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
              {message.type !== 'TEXT' && (
                <p className="italic opacity-80">
                  [{message.type === 'IMAGE' ? 'تصویر' : message.type === 'FILE' ? 'فایل' : 'پیام سیستمی'}]
                </p>
              )}
              <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-ink/40'}`}>
                {formatTime(message.createdAt)}
                {message.edited && ' · ویرایش شده'}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}

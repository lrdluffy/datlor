import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { ChannelTopicResponse } from '../types/channel';
import { MessageResponse } from '../types/message';
import { Avatar } from './Avatar';
import { MediaAttachment } from './MediaAttachment';

interface MessageListProps {
  messages: MessageResponse[];
  currentUserId: string;
  hasMoreHistory: boolean;
  onLoadOlder: () => void;
  /** Used to resolve a message's topicId to a display name for its tag. */
  topics: ChannelTopicResponse[];
  /** True while viewing a single topic (or "no topic") - hides the redundant per-message tag since it's implied by the active filter. */
  topicFilterActive: boolean;
  /** True when the current viewer is a channel admin/moderator (MODERATOR+) or a group ADMIN - may delete ANY message, not just their own. */
  canModerate?: boolean;
  /** Only the sender may edit their own message - enforced server-side too. */
  onEdit?: (messageId: string, content: string) => void;
  /** The sender or a channel/group admin may delete - enforced server-side too. */
  onDelete?: (messageId: string) => void;
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
                              canModerate = false,
                              onEdit,
                              onDelete,
                            }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(messages.length);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    // Only auto-scroll when a message was appended (new send/receive),
    // not when older history was prepended to the top.
    if (messages.length > messageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    messageCountRef.current = messages.length;
  }, [messages.length]);

  const topicName = (topicId: string): string | undefined => topics.find((t) => t.id === topicId)?.name;

  const startEditing = (message: MessageResponse) => {
    setEditingId(message.id);
    setDraft(message.content ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft('');
  };

  const submitEdit = (messageId: string) => {
    const trimmed = draft.trim();
    if (!trimmed || !onEdit) return;
    onEdit(messageId, trimmed);
    setEditingId(null);
    setDraft('');
  };

  const confirmDelete = (messageId: string) => {
    if (!onDelete) return;
    if (window.confirm('آیا از حذف این پیام مطمئن هستید؟')) {
      onDelete(messageId);
    }
  };

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
          // Edit: sender only. Delete: sender or an admin/moderator. Neither
          // action applies to non-text or system messages.
          const canEdit = isOwn && message.type === 'TEXT' && !!onEdit;
          const canDelete = (isOwn || canModerate) && message.type !== 'SYSTEM' && !!onDelete;
          const isEditing = editingId === message.id;

          return (
              <div key={message.id} className={`group flex items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                    <div className="mr-2 mb-1 flex-shrink-0">
                      <Avatar userId={message.senderId} size="xs" />
                    </div>
                )}
                {isOwn && (canEdit || canDelete) && !isEditing && (
                    <div className="flex items-center gap-1 self-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      {canEdit && (
                          <button
                              onClick={() => startEditing(message)}
                              title="ویرایش پیام"
                              className="p-1 rounded-full text-ink/40 hover:text-accent hover:bg-canvas"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                      )}
                      {canDelete && (
                          <button
                              onClick={() => confirmDelete(message.id)}
                              title="حذف پیام"
                              className="p-1 rounded-full text-ink/40 hover:text-red-600 hover:bg-canvas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                      )}
                    </div>
                )}

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

                  {isEditing ? (
                      <div className="space-y-1.5">
                  <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoFocus
                      rows={2}
                      maxLength={4000}
                      className="w-full rounded-lg px-2 py-1 text-sm text-ink bg-white border border-line focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                        <div className="flex justify-end gap-1">
                          <button
                              onClick={cancelEditing}
                              title="انصراف"
                              className={`p-1 rounded-full ${isOwn ? 'text-white/80 hover:bg-white/20' : 'text-ink/50 hover:bg-canvas'}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                              onClick={() => submitEdit(message.id)}
                              disabled={!draft.trim()}
                              title="ذخیره"
                              className={`p-1 rounded-full disabled:opacity-40 ${isOwn ? 'text-white hover:bg-white/20' : 'text-accent hover:bg-canvas'}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                  ) : (
                      <>
                        {message.type === 'TEXT' && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                        {/* actually render what was sent, not a bracketed label. */}
                        {(message.type === 'IMAGE' || message.type === 'FILE') && message.mediaId && (
                            <MediaAttachment mediaId={message.mediaId} type={message.type} isOwn={isOwn} />
                        )}
                        {message.type === 'SYSTEM' && <p className="italic opacity-80">[پیام سیستمی]</p>}
                        <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-ink/40'}`}>
                          {formatTime(message.createdAt)}
                          {message.edited && ' · ویرایش شده'}
                        </div>
                      </>
                  )}
                </div>

                {!isOwn && canDelete && !isEditing && (
                    <div className="flex items-center gap-1 self-center opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      <button
                          onClick={() => confirmDelete(message.id)}
                          title="حذف پیام (مدیر)"
                          className="p-1 rounded-full text-ink/40 hover:text-red-600 hover:bg-canvas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                )}
              </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
  );
}

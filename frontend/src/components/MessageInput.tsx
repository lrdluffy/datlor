import React, { useRef, useState } from 'react';
import { mediaApi } from '../api/mediaApi';
import { MessageType } from '../types/message';

export interface MessageComposerSubmission {
  content?: string;
  mediaId?: string;
  type: MessageType;
  /** US-19: ISO timestamp - omitted means "send immediately". */
  scheduledAt?: string;
}

interface MessageInputProps {
  disabled: boolean;
  disabledReason?: string;
  onSend: (submission: MessageComposerSubmission) => void;
  /** e.g. "معرفی" when a specific topic is selected - shown so the person knows where the message will land. */
  activeTopicLabel?: string;
}

function fileTypeToMessageType(mimeType: string): MessageType {
  return mimeType.startsWith('image/') ? 'IMAGE' : 'FILE';
}

/**
 * US-18 (attach media) + US-19 (schedule for later) live here alongside
 * the plain text composer: a person picks a file (uploaded immediately to
 * media-service, returning a mediaId - never sent as raw bytes over the
 * WebSocket) and/or a future date & time before hitting send.
 */
export function MessageInput({ disabled, disabledReason, onSend, activeTopicLabel }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [attachedMediaId, setAttachedMediaId] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [attachedMessageType, setAttachedMessageType] = useState<MessageType>('TEXT');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setUploadError(null);
    setUploadProgress(0);
    try {
      const uploaded = await mediaApi.upload(file, setUploadProgress);
      setAttachedMediaId(uploaded.id);
      setAttachedFileName(file.name);
      setAttachedMessageType(fileTypeToMessageType(uploaded.fileType));
    } catch (err: any) {
      setUploadError(err?.response?.data?.message ?? 'آپلود فایل ناموفق بود');
    } finally {
      setUploadProgress(null);
    }
  };

  const clearAttachment = () => {
    setAttachedMediaId(null);
    setAttachedFileName(null);
    setAttachedMessageType('TEXT');
  };

  const canSubmit = (value.trim().length > 0 || attachedMediaId !== null) && uploadProgress === null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || disabled) return;

    const trimmed = value.trim();
    const iso = showScheduler && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;

    onSend({
      content: trimmed || undefined,
      mediaId: attachedMediaId ?? undefined,
      type: attachedMediaId ? attachedMessageType : 'TEXT',
      scheduledAt: iso,
    });

    setValue('');
    clearAttachment();
    setShowScheduler(false);
    setScheduledAt('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-line p-3">
      {disabled && disabledReason && (
        <p className="text-xs text-red-600 mb-2 text-center">{disabledReason}</p>
      )}
      {!disabled && activeTopicLabel && (
        <p className="text-[11px] text-ink/40 mb-1.5">ارسال به #{activeTopicLabel}</p>
      )}

      {attachedFileName && (
        <div className="flex items-center gap-2 mb-2 text-xs bg-canvas border border-line rounded-lg px-2 py-1.5">
          <span className="flex-1 truncate text-ink/70">📎 {attachedFileName}</span>
          <button type="button" onClick={clearAttachment} className="text-ink/40 hover:text-ink">
            ×
          </button>
        </div>
      )}
      {uploadProgress !== null && (
        <p className="text-[11px] text-ink/50 mb-2">در حال آپلود... {uploadProgress}%</p>
      )}
      {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}

      {showScheduler && (
        <div className="flex items-center gap-2 mb-2">
          <label className="text-[11px] text-ink/50 whitespace-nowrap">زمان ارسال</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            className="text-xs border border-line rounded-lg px-2 py-1 flex-1"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" disabled={disabled} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploadProgress !== null}
          title="پیوست فایل"
          className="text-ink/50 hover:text-ink border border-line rounded-lg px-2.5 py-2 disabled:opacity-40"
        >
          📎
        </button>
        <button
          type="button"
          onClick={() => setShowScheduler((v) => !v)}
          disabled={disabled}
          title="زمان‌بندی ارسال"
          className={`text-sm border rounded-lg px-2.5 py-2 disabled:opacity-40 ${
            showScheduler ? 'bg-ink text-white border-ink' : 'text-ink/50 hover:text-ink border-line'
          }`}
        >
          🕒
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="پیام بنویسید..."
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || !canSubmit}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40"
        >
          {showScheduler && scheduledAt ? 'زمان‌بندی' : 'ارسال'}
        </button>
      </div>
    </form>
  );
}

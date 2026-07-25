import React, { useState } from 'react';

interface MessageInputProps {
  disabled: boolean;
  disabledReason?: string;
  onSend: (content: string) => void;
  /** e.g. "معرفی" when a specific topic is selected - shown so the person knows where the message will land. */
  activeTopicLabel?: string;
}

export function MessageInput({ disabled, disabledReason, onSend, activeTopicLabel }: MessageInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-line p-3">
      {disabled && disabledReason && (
        <p className="text-xs text-red-600 mb-2 text-center">{disabledReason}</p>
      )}
      {!disabled && activeTopicLabel && (
        <p className="text-[11px] text-ink/40 mb-1.5">ارسال به #{activeTopicLabel}</p>
      )}
      <div className="flex items-center gap-2">
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
          disabled={disabled || !value.trim()}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40"
        >
          ارسال
        </button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChannelList } from '../hooks/useChannelList';

export function ChannelListPage() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { channels, isLoading, error, createChannel } = useChannelList();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createChannel(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
    setShowCreateForm(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-display font-semibold text-ink">کانال‌های من</h1>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} title={connected ? 'متصل' : 'در حال اتصال...'} />
          <span className="text-sm text-ink/60">{user?.displayName ?? user?.email}</span>
          <button onClick={logout} className="text-sm text-ink/60 hover:text-ink">
            خروج
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink/70">کانال‌ها</h2>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="bg-ink text-white text-sm font-medium rounded-lg px-3 py-1.5"
          >
            + کانال جدید
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreate} className="bg-white border border-line rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-xs text-ink/60 mb-1">نام</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: اعلانات"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">توضیحات (اختیاری)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!connected || !name.trim()}
                className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40"
              >
                ایجاد کانال
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="border border-line text-sm font-medium rounded-lg px-4 py-2 text-ink/70"
              >
                لغو
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-ink/50">در حال بارگذاری...</p>
        ) : channels.length === 0 ? (
          <p className="text-sm text-ink/50">هنوز عضو هیچ کانالی نیستید.</p>
        ) : (
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li key={channel.id}>
                <Link
                  to={`/channels/${channel.id}`}
                  className="block bg-white border border-line rounded-xl px-4 py-3 hover:border-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">#{channel.name}</span>
                    <span className="text-xs text-ink/40">{channel.memberCount} عضو</span>
                  </div>
                  {channel.description && (
                    <p className="text-xs text-ink/50 mt-1 truncate">{channel.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

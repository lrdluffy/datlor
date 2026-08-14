import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  LogOut,
  Hash,
  Users,
  Loader2,
  UserPlus,
  ArrowUpRight,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChannelList } from '../hooks/useChannelList';
import { useChannelSearch } from '../hooks/useChannelSearch';

export function ChannelListPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { channels, isLoading, error, createChannel, reload } = useChannelList();
  const {
    query,
    setQuery,
    results,
    isSearching,
    error: searchError,
    joiningChannelId,
    joinChannel,
  } = useChannelSearch();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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

  const handleJoin = async (channelId: string) => {
    await joinChannel(channelId);
    reload(); // pulls the newly-joined channel into "my channels" too
    navigate(`/channels/${channelId}`);
  };

  const joinedChannelIds = new Set(channels.map((c) => c.id));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-line px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-accent/30">
            <Hash className="w-4 h-4 text-white" />
          </span>
          <h1 className="font-display font-bold text-ink">کانال‌های من</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border ${
              connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}
            title={connected ? 'متصل' : 'در حال اتصال...'}
          >
            <span className="relative flex h-2 w-2">
              {!connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  connected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </span>
            {connected ? 'متصل' : 'در حال اتصال...'}
          </span>

          <div className="h-4 w-px bg-line" />

          <Link
            to="/groups"
            className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-accent transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            گروه‌ها
          </Link>
          <Link to="/profile/edit" className="text-sm text-ink/60 hover:text-accent transition-colors">
            {user?.displayName ?? user?.email}
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            خروج
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink/70">کانال‌ها</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowSearch((v) => !v);
                setShowCreateForm(false);
              }}
              className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border-2 transition-colors ${
                showSearch
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-line text-ink/70 hover:border-accent/40 hover:text-accent'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              جستجو
            </button>
            <button
              onClick={() => {
                setShowCreateForm((v) => !v);
                setShowSearch(false);
              }}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg px-3 py-1.5 shadow-md shadow-accent/25 transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              کانال جدید
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-2 border-line rounded-xl p-4 mb-4 shadow-sm"
            >
              <div className="relative mb-3">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/60" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی کانال بر اساس نام..."
                  className="w-full rounded-lg border-2 border-line bg-slate-50/80 pr-10 pl-3 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                />
              </div>

              {searchError && <p className="text-xs text-red-600 mb-2">{searchError}</p>}

              {isSearching ? (
                <p className="text-xs text-ink/50 inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  در حال جستجو...
                </p>
              ) : results.length === 0 ? (
                <p className="text-xs text-ink/40">
                  {query.trim() ? 'کانالی با این نام پیدا نشد.' : 'کانال‌های اخیر در اینجا نمایش داده می‌شوند.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {results.map((channel) => {
                    const alreadyJoined = channel.viewerRole !== null || joinedChannelIds.has(channel.id);
                    return (
                      <li
                        key={channel.id}
                        className="flex items-center justify-between border-2 border-line rounded-lg px-3 py-2 hover:border-accent/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">#{channel.name}</p>
                          <p className="text-[11px] text-ink/40 inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {channel.memberCount} عضو
                          </p>
                        </div>
                        {alreadyJoined ? (
                          <Link
                            to={`/channels/${channel.id}`}
                            className="inline-flex items-center gap-1 text-xs border-2 border-line rounded-lg px-3 py-1.5 text-ink/70 flex-shrink-0 hover:border-accent/40 hover:text-accent transition-colors"
                          >
                            باز کردن
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleJoin(channel.id)}
                            disabled={joiningChannelId === channel.id}
                            className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white rounded-lg px-3 py-1.5 flex-shrink-0 shadow shadow-accent/25 disabled:opacity-40"
                          >
                            {joiningChannelId === channel.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                پیوستن
                              </>
                            )}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showCreateForm && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCreate}
              className="bg-white border-2 border-line rounded-xl p-4 mb-4 space-y-3 shadow-sm"
            >
              <div>
                <label className="block text-xs text-ink/60 mb-1">نام</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: اعلانات"
                  className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">توضیحات (اختیاری)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!connected || !name.trim()}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg px-4 py-2 shadow-md shadow-accent/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ایجاد کانال
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex items-center gap-1.5 border-2 border-line text-sm font-medium rounded-lg px-4 py-2 text-ink/70 hover:border-accent/30 hover:text-accent transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  لغو
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-ink/50 inline-flex items-center gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال بارگذاری...
          </p>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 text-ink/40">
            <Inbox className="w-8 h-8 mb-2 text-ink/20" />
            <p className="text-sm">هنوز عضو هیچ کانالی نیستید.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li key={channel.id}>
                <Link
                  to={`/channels/${channel.id}`}
                  className="block bg-white border-2 border-line rounded-xl px-4 py-3 hover:border-accent/50 hover:shadow-md hover:shadow-accent/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink inline-flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-accent/60" />
                      {channel.name}
                    </span>
                    <span className="text-xs text-ink/40 inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {channel.memberCount} عضو
                    </span>
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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Plus, X, Mail, Check, Loader2, Inbox } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useGroupList } from '../hooks/useGroupList';

export function GroupListPage() {
  const { connected } = useSocket();
  const { groups, invites, isLoading, error, createGroup, acceptInvite, rejectInvite } = useGroupList();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createGroup(name.trim());
      setName('');
      setShowCreateForm(false);
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'ایجاد گروه ناموفق بود');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-line px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink/40 hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-accent/30">
            <Users className="w-4 h-4 text-white" />
          </span>
          <h1 className="font-display font-semibold text-ink">گروه‌های من</h1>
        </div>
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
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {invites.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-ink/70 mb-2 inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-accent/60" />
              دعوت‌های در انتظار
            </h2>
            <ul className="space-y-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="bg-white border-2 border-accent/20 bg-accent/[0.03] rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm text-ink">
                    دعوت به گروه <span className="font-medium">#{invite.groupName}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptInvite(invite.id)}
                      className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white rounded-lg px-3 py-1.5 shadow shadow-accent/25 hover:brightness-110 transition"
                    >
                      <Check className="w-3 h-3" />
                      پذیرفتن
                    </button>
                    <button
                      onClick={() => rejectInvite(invite.id)}
                      className="inline-flex items-center gap-1 text-xs border-2 border-line rounded-lg px-3 py-1.5 text-ink/70 hover:border-red-200 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      رد کردن
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink/70">گروه‌ها</h2>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg px-3 py-1.5 shadow-md shadow-accent/25 transition-transform hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            گروه جدید
          </button>
        </div>

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
                <label className="block text-xs text-ink/60 mb-1">نام گروه</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: دوستان دانشگاه"
                  className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                />
              </div>
              {actionError && <p className="text-xs text-red-600">{actionError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg px-4 py-2 shadow-md shadow-accent/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ایجاد گروه
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
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-ink/50 inline-flex items-center gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال بارگذاری...
          </p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 text-ink/40">
            <Inbox className="w-8 h-8 mb-2 text-ink/20" />
            <p className="text-sm">هنوز عضو هیچ گروهی نیستید.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/groups/${group.id}`}
                  className="block bg-white border-2 border-line rounded-xl px-4 py-3 hover:border-accent/50 hover:shadow-md hover:shadow-accent/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-accent/60" />
                      {group.name}
                    </span>
                    <span className="text-xs text-ink/40">{group.memberCount} عضو</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
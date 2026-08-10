import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-ink/40 hover:text-ink text-sm">
            ←
          </Link>
          <h1 className="font-display font-semibold text-ink">گروه‌های من</h1>
        </div>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {invites.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-ink/70 mb-2">دعوت‌های در انتظار</h2>
            <ul className="space-y-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="bg-white border border-line rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm text-ink">
                    دعوت به گروه <span className="font-medium">#{invite.groupName}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptInvite(invite.id)}
                      className="text-xs bg-ink text-white rounded-lg px-3 py-1.5"
                    >
                      پذیرفتن
                    </button>
                    <button
                      onClick={() => rejectInvite(invite.id)}
                      className="text-xs border border-line rounded-lg px-3 py-1.5 text-ink/70"
                    >
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
            className="bg-ink text-white text-sm font-medium rounded-lg px-3 py-1.5"
          >
            + گروه جدید
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreate} className="bg-white border border-line rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-xs text-ink/60 mb-1">نام گروه</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: دوستان دانشگاه"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!name.trim()}
                className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40"
              >
                ایجاد گروه
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
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-ink/50">در حال بارگذاری...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-ink/50">هنوز عضو هیچ گروهی نیستید.</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/groups/${group.id}`}
                  className="block bg-white border border-line rounded-xl px-4 py-3 hover:border-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">#{group.name}</span>
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

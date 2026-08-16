import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Settings,
  Users,
  Hash,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChannelSession } from '../hooks/useChannelSession';
import { RoleManagementPanel } from '../components/RoleManagementPanel';
import { channelApi } from '../api/channelApi';
import { isAtLeast } from '../types/channel';

export function ChannelSettingsPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { channel, members, isLoading, error, updateRole, updateMemberStatus } = useChannelSession(channelId);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEditInitialized, setIsEditInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // seed the edit form once the channel
  // has loaded (once only - CHANNEL_UPDATED echoes from my own save
  // shouldn't clobber whatever I might already be mid-typing).
  useEffect(() => {
    if (channel && !isEditInitialized) {
      setName(channel.name);
      setDescription(channel.description ?? '');
      setIsEditInitialized(true);
    }
  }, [channel, isEditInitialized]);

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
  if (!myMembership) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
          <p className="text-sm text-red-600 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            شما عضو این کانال نیستید
          </p>
        </div>
    );
  }

  const handleDelete = async () => {
    if (!channelId) return;
    if (!window.confirm('آیا از حذف این کانال مطمئن هستید؟ این عملیات غیرقابل بازگشت است.')) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await channelApi.deleteChannel(channelId);
      navigate('/');
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message ?? 'حذف کانال ناموفق بود');
    } finally {
      setIsDeleting(false);
    }
  };

  const canManage = isAtLeast(myMembership.role, 'MANAGER');

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await channelApi.updateChannel(channelId, { name: name.trim(), description: description.trim() || undefined });
      setSaveMessage('تغییرات با موفقیت ذخیره شد.');
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'ذخیره تغییرات ناموفق بود');
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-accent/30">
            <Settings className="w-4 h-4 text-white" />
          </span>
            <h1 className="font-display font-semibold text-ink">
              #{channel.name} <span className="text-ink/40 font-normal">— تنظیمات</span>
            </h1>
          </div>
          <Link
              to={`/channels/${channel.id}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink/40 hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </Link>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
          {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </p>
          )}

          {/* OWNER/MANAGER only - same actors as the delete button below. */}
          {canManage && (
              <>
                <h2 className="text-sm font-semibold text-ink/70 mb-2 inline-flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-accent/60" />
                  ویرایش اطلاعات کانال
                </h2>
                <form onSubmit={handleSaveEdit} className="bg-white border-2 border-line rounded-xl p-4 shadow-sm mb-6 space-y-4">
                  <div>
                    <label className="block text-xs text-ink/60 mb-1">نام کانال</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-ink/60 mb-1">توضیحات</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                    />
                  </div>

                  {saveError && (
                      <p className="text-xs text-red-600 inline-flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {saveError}
                      </p>
                  )}
                  <p
                      className={`text-xs text-emerald-700 inline-flex items-center gap-1.5 transition-opacity duration-200 ${
                          saveMessage ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    {saveMessage || '\u00A0'}
                  </p>

                  <button
                      type="submit"
                      disabled={isSaving || !name.trim()}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg px-4 py-2 shadow-md shadow-accent/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </button>
                </form>
              </>
          )}

          <h2 className="text-sm font-semibold text-ink/70 mb-2 inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-accent/60" />
            اعضا
          </h2>
          <div className="bg-white border-2 border-line rounded-xl overflow-hidden mb-6 shadow-sm">
            <RoleManagementPanel
                members={members}
                currentUserId={user?.id ?? ''}
                currentUserRole={myMembership.role}
                onUpdateRole={updateRole}
                onUpdateStatus={updateMemberStatus}
            />
          </div>

          {channel.topics.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-ink/70 mb-2 inline-flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-accent/60" />
                  تاپیک‌ها
                </h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {channel.topics.map((topic) => (
                      <span
                          key={topic.id}
                          className="text-xs bg-accent/5 border border-accent/20 rounded-full px-3 py-1 text-accent"
                      >
                  #{topic.name}
                </span>
                  ))}
                </div>
              </>
          )}

          {canManage && (
              <div className="border-2 border-red-100 bg-red-50/40 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-red-700 mb-1">منطقه خطر</h2>
                <p className="text-xs text-red-600/70 mb-3">
                  حذف کانال غیرقابل بازگشت است و تمام پیام‌ها و اعضا را از بین می‌برد.
                </p>
                {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-white border-2 border-red-200 rounded-lg px-4 py-2 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        در حال حذف...
                      </>
                  ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف کانال
                      </>
                  )}
                </button>
              </div>
          )}
        </main>
      </div>
  );
}
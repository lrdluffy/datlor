import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChannelSession } from '../hooks/useChannelSession';
import { RoleManagementPanel } from '../components/RoleManagementPanel';
import { channelApi } from '../api/channelApi';

export function ChannelSettingsPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { channel, members, isLoading, error, updateRole, updateMemberStatus } = useChannelSession(channelId);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink/50">در حال بارگذاری...</div>;
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">{error ?? 'کانال یافت نشد'}</p>
      </div>
    );
  }

  const myMembership = members.find((m) => m.userId === user?.id);
  if (!myMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">شما عضو این کانال نیستید</p>
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/channels/${channel.id}`} className="text-ink/40 hover:text-ink text-sm">
            ×
          </Link>
          <h1 className="font-display font-semibold text-ink">#{channel.name} — تنظیمات</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <h2 className="text-sm font-semibold text-ink/70 mb-2">اعضا</h2>
        <div className="bg-white border border-line rounded-xl overflow-hidden mb-6">
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
            <h2 className="text-sm font-semibold text-ink/70 mb-2">تاپیک‌ها</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {channel.topics.map((topic) => (
                <span key={topic.id} className="text-xs bg-white border border-line rounded-full px-3 py-1 text-ink/70">
                  #{topic.name}
                </span>
              ))}
            </div>
          </>
        )}

        {myMembership.role === 'OWNER' && (
          <div className="border-t border-line pt-4">
            {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? 'در حال حذف...' : '🗑 حذف کانال'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

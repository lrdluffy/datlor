import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi } from '../api/profileApi';
import { mediaApi } from '../api/mediaApi';
import { ProfileResponse } from '../types/profile';

export function ProfileEditPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarMediaId, setAvatarMediaId] = useState<string | undefined>(undefined);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileApi
      .getMyProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName);
        setBio(p.bio ?? '');
        setAvatarMediaId(p.avatarMediaId ?? undefined);
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'بارگذاری پروفایل ناموفق بود'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarUploadProgress(0);
    try {
      const uploaded = await mediaApi.upload(file, setAvatarUploadProgress);
      setAvatarMediaId(uploaded.id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'آپلود تصویر ناموفق بود');
    } finally {
      setAvatarUploadProgress(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const updated = await profileApi.updateMyProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarMediaId,
      });
      setProfile(updated);
      setSaveMessage('پروفایل با موفقیت ذخیره شد.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'ذخیره پروفایل ناموفق بود');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyToggle = async () => {
    if (!profile) return;
    setIsTogglingPrivacy(true);
    setError(null);
    try {
      const updated = await profileApi.updateMyPrivacy({ allowDirectGroupAdd: !profile.allowDirectGroupAdd });
      setProfile(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'تغییر تنظیمات حریم خصوصی ناموفق بود');
    } finally {
      setIsTogglingPrivacy(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink/50">در حال بارگذاری...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white px-4 py-3 flex items-center gap-2">
        <Link to="/" className="text-ink/40 hover:text-ink text-sm">
          ←
        </Link>
        <h1 className="font-display font-semibold text-ink">ویرایش پروفایل</h1>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSave} className="bg-white border border-line rounded-xl p-5 space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-canvas border border-line overflow-hidden flex items-center justify-center flex-shrink-0">
              {avatarMediaId ? (
                <img src={mediaApi.contentUrl(avatarMediaId)} alt="آواتار" className="w-full h-full object-cover" />
              ) : (
                <span className="text-ink/30 text-xl">🙂</span>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploadProgress !== null}
                className="text-xs border border-line rounded-lg px-3 py-1.5 text-ink/70 disabled:opacity-40"
              >
                تغییر تصویر
              </button>
              {avatarUploadProgress !== null && (
                <p className="text-[11px] text-ink/50 mt-1">در حال آپلود... {avatarUploadProgress}%</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink/60 mb-1">نام نمایشی</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-ink/60 mb-1">درباره من</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {saveMessage && <p className="text-xs text-green-700">{saveMessage}</p>}

          <button
            type="submit"
            disabled={isSaving || !displayName.trim()}
            className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40"
          >
            {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </form>

        {profile && (
          <div className="bg-white border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-1">حریم خصوصی</h2>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-sm text-ink">اجازه افزودن مستقیم به گروه</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  در صورت خاموش بودن، دیگران فقط می‌توانند شما را دعوت کنند و باید دعوت را بپذیرید.
                </p>
              </div>
              <button
                onClick={handlePrivacyToggle}
                disabled={isTogglingPrivacy}
                role="switch"
                aria-checked={profile.allowDirectGroupAdd}
                className={`w-11 h-6 rounded-full flex-shrink-0 transition-colors relative disabled:opacity-40 ${
                  profile.allowDirectGroupAdd ? 'bg-accent' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    profile.allowDirectGroupAdd ? 'translate-x-0.5' : 'translate-x-5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

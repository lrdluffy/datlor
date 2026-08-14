import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Camera, Loader2, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
        <p className="text-sm text-ink/50 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          در حال بارگذاری...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-accent/5 via-white to-fuchsia-50/40">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-line px-4 py-3 flex items-center gap-2.5">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink/40 hover:text-ink hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-accent/30">
          <User className="w-4 h-4 text-white" />
        </span>
        <h1 className="font-display font-semibold text-ink">ویرایش پروفایل</h1>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6">
        <p
          className={`text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-1.5 transition-opacity duration-200 ${
            error ? 'opacity-100' : 'opacity-0 h-0 !p-0 !m-0 !border-0 overflow-hidden'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error || '\u00A0'}
        </p>

        <form onSubmit={handleSave} className="bg-white border-2 border-line rounded-xl p-5 space-y-4 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-canvas overflow-hidden flex items-center justify-center">
                  {avatarMediaId ? (
                    <img
                      src={mediaApi.contentUrl(avatarMediaId)}
                      alt="آواتار"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-ink/30 text-xl">🙂</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploadProgress !== null}
                className="inline-flex items-center gap-1.5 text-xs border-2 border-line rounded-lg px-3 py-1.5 text-ink/70 hover:border-accent/30 hover:text-accent transition-colors disabled:opacity-40"
              >
                <Camera className="w-3.5 h-3.5" />
                تغییر تصویر
              </button>
              {avatarUploadProgress !== null && (
                <div className="mt-2">
                  <div className="h-1.5 w-full max-w-[160px] rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-fuchsia-600 transition-all duration-200"
                      style={{ width: `${avatarUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ink/50 mt-1">در حال آپلود... {avatarUploadProgress}%</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink/60 mb-1">نام نمایشی</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-ink/60 mb-1">درباره من</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border-2 border-line bg-slate-50/80 px-3 py-2 text-sm text-ink transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
            />
          </div>

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
            disabled={isSaving || !displayName.trim()}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg px-4 py-2 shadow-md shadow-accent/25 transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </form>

        {profile && (
          <div className="bg-white border-2 border-line rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink mb-1 inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent/60" />
              حریم خصوصی
            </h2>
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
                  profile.allowDirectGroupAdd
                    ? 'bg-gradient-to-r from-accent to-violet-600'
                    : 'bg-line'
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
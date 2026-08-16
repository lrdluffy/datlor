import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/profileApi';
import { mediaApi } from '../api/mediaApi';
import { PublicProfileResponse } from '../types/profile';

/**
 * the "other users can view this
 * profile" half of the feature - ProfileEditPage covers "a user can edit
 * their own profile". Deliberately read-only and reachable for ANY
 * userId, including the viewer's own (in which case a shortcut to
 * ProfileEditPage is offered instead of duplicating the edit form here).
 */
export function ProfileViewPage() {
    const { userId } = useParams<{ userId: string }>();
    const { user } = useAuth();

    const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        setIsLoading(true);
        setError(null);
        profileApi
            .getProfile(userId)
            .then(setProfile)
            .catch((err) => setError(err?.response?.data?.message ?? 'بارگذاری نمایه ناموفق بود'))
            .finally(() => setIsLoading(false));
    }, [userId]);

    const isOwnProfile = !!user && user.id === userId;

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
                <h1 className="font-display font-semibold text-ink">نمایه کاربری</h1>
            </header>

            <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6">
                {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </p>
                )}

                {profile && (
                    <div className="bg-white border-2 border-line rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-full flex-shrink-0">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-canvas overflow-hidden flex items-center justify-center">
                                        {profile.avatarMediaId ? (
                                            <img
                                                src={mediaApi.contentUrl(profile.avatarMediaId)}
                                                alt={profile.displayName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-ink/30 text-xl">🙂</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-semibold text-ink truncate">{profile.displayName}</h2>
                                {isOwnProfile && (
                                    <Link
                                        to="/profile/edit"
                                        className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:text-accentDeep font-medium"
                                    >
                                        <Pencil className="w-3 h-3" />
                                        ویرایش نمایه من
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-line">
                            <h3 className="text-xs text-ink/50 mb-1">درباره</h3>
                            {profile.bio ? (
                                <p className="text-sm text-ink whitespace-pre-wrap break-words">{profile.bio}</p>
                            ) : (
                                <p className="text-sm text-ink/30 italic">بیوگرافی ثبت نشده است</p>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

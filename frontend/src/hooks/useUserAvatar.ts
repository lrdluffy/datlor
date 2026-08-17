import { useEffect, useState } from 'react';
import { profileApi } from '../api/profileApi';

/**
 * Displaying a profile's avatar next to a message or member row means
 * looking up THAT user's profile - unlike the viewer's own avatar (already
 * available via useAuth's UserResponse.avatarMediaId, no fetch needed),
 */
const avatarCache = new Map<string, Promise<string | null>>();

function fetchCached(userId: string): Promise<string | null> {
    let pending = avatarCache.get(userId);
    if (!pending) {
        pending = profileApi.getProfile(userId).then((profile) => profile.avatarMediaId);
        avatarCache.set(userId, pending);
        pending.catch(() => avatarCache.delete(userId)); // only evict on an actual fetch failure - "no avatar" is a legitimate, cacheable result
    }
    return pending;
}

export function useUserAvatar(userId: string | null): string | null {
    const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setAvatarMediaId(null);
            return;
        }

        let cancelled = false;
        fetchCached(userId)
            .then((result) => {
                if (!cancelled) setAvatarMediaId(result);
            })
            .catch(() => {
                if (!cancelled) setAvatarMediaId(null);
            });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return avatarMediaId;
}

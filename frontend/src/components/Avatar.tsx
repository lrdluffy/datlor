import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mediaApi } from '../api/mediaApi';
import { useUserAvatar } from '../hooks/useUserAvatar';

interface AvatarProps {
    userId: string;
    size?: 'xs' | 'sm' | 'md';
}

const SIZE_CLASS: Record<NonNullable<AvatarProps['size']>, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
};

const ICON_SIZE_CLASS: Record<NonNullable<AvatarProps['size']>, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
};

/**
 * (displaying a profile's avatar media): reused
 * everywhere a user is shown as more than a bare id - message senders,
 * channel/group member rows. The viewer's OWN avatar comes for free from
 * useAuth (UserResponse.avatarMediaId, already loaded at login - no
 * fetch); any other user's goes through useUserAvatar, which reuses
 * Sprint 8's GET /api/profiles/{userId} and caches by userId so repeated
 * rows for the same sender don't refetch.
 */
export function Avatar({ userId, size = 'sm' }: AvatarProps) {
    const { user } = useAuth();
    const isSelf = user?.id === userId;

    const otherAvatarMediaId = useUserAvatar(isSelf ? null : userId);
    const avatarMediaId = isSelf ? user?.avatarMediaId ?? null : otherAvatarMediaId;

    const sizeClass = SIZE_CLASS[size];

    if (avatarMediaId) {
        return (
            <img
                src={mediaApi.contentUrl(avatarMediaId)}
                alt=""
                className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-black/5`}
            />
        );
    }

    return (
        <span
            className={`${sizeClass} rounded-full bg-gradient-to-br from-accent/20 to-fuchsia-600/20 flex items-center justify-center flex-shrink-0`}
        >
      <User className={`${ICON_SIZE_CLASS[size]} text-accent/60`} />
    </span>
    );
}

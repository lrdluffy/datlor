import { useEffect, useState } from 'react';
import { mediaApi } from '../api/mediaApi';
import { MediaFileResponse } from '../types/media';

/**
 * A message's `type` only distinguishes IMAGE from FILE
 * (see MessageType, MessageInput's uploadAsType) - to tell video/audio/
 * generic-file apart for rendering, this looks up the actual MIME type via
 * media-service's already-existing GET /media/{id} metadata endpoint,
 * cached module-wide by mediaId (a file's type never changes once
 * uploaded, so this is safe to cache indefinitely for the browser
 * session - no invalidation needed).
 */
const metadataCache = new Map<string, Promise<MediaFileResponse>>();

function fetchCached(mediaId: string): Promise<MediaFileResponse> {
    let pending = metadataCache.get(mediaId);
    if (!pending) {
        pending = mediaApi.getMetadata(mediaId);
        metadataCache.set(mediaId, pending);
        pending.catch(() => metadataCache.delete(mediaId)); // don't cache failures
    }
    return pending;
}

export function useMediaMetadata(mediaId: string | null): { metadata: MediaFileResponse | null; isLoading: boolean } {
    const [metadata, setMetadata] = useState<MediaFileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(!!mediaId);

    useEffect(() => {
        if (!mediaId) {
            setMetadata(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        fetchCached(mediaId)
            .then((data) => {
                if (!cancelled) setMetadata(data);
            })
            .catch(() => {
                if (!cancelled) setMetadata(null);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [mediaId]);

    return { metadata, isLoading };
}

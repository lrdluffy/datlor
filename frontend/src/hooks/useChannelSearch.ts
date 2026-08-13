import { useCallback, useEffect, useRef, useState } from 'react';
import { channelApi } from '../api/channelApi';
import { ChannelResponse } from '../types/channel';

const DEBOUNCE_MS = 300;

interface UseChannelSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: ChannelResponse[];
  isSearching: boolean;
  error: string | null;
  joiningChannelId: string | null;
  joinChannel: (channelId: string) => Promise<void>;
}

/**
 * Debounced channel search + self-service join. Unlike groups (invite-only,
 * private membership), any channel found here can be joined directly - no
 * invite/accept round-trip needed.
 */
export function useChannelSearch(): UseChannelSearchResult {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChannelResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      setIsSearching(true);
      setError(null);

      channelApi
        .searchChannels(query.trim())
        .then((channels) => {
          if (requestId === requestIdRef.current) setResults(channels);
        })
        .catch((err) => {
          if (requestId === requestIdRef.current) {
            setError(err?.response?.data?.message ?? 'جستجوی کانال‌ها ناموفق بود');
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const joinChannel = useCallback(async (channelId: string) => {
    setJoiningChannelId(channelId);
    setError(null);
    try {
      const membership = await channelApi.joinChannel(channelId);
      setResults((prev) =>
        prev.map((c) =>
          c.id === channelId
            ? { ...c, memberCount: c.memberCount + (c.viewerRole ? 0 : 1), viewerRole: { role: membership.role, status: membership.status } }
            : c
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'پیوستن به کانال ناموفق بود');
    } finally {
      setJoiningChannelId(null);
    }
  }, []);

  return { query, setQuery, results, isSearching, error, joiningChannelId, joinChannel };
}

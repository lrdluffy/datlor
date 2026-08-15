import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageResponse } from '../types/message';

const DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 50;

interface UseMessageSearchResult {
    query: string;
    setQuery: (query: string) => void;
    results: MessageResponse[];
    isSearching: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    loadMore: () => void;
    error: string | null;
    /** True once the debounced query has actually been sent - lets the UI tell "no results yet" apart from "no matches". */
    hasSearched: boolean;
}

/**
 * debounced in-chat message search, with the same
 * cursor pagination shape as the live history load. Works for both
 * channels and groups - pass the right REST call in as `search` (see
 * ChannelViewPage/GroupViewPage) rather than duplicating this hook per
 * chat type, since the debounce/race-guard/pagination logic itself
 * doesn't depend on which chat type is being searched.
 */
export function useMessageSearch(
    search: (query: string, before?: string, limit?: number) => Promise<MessageResponse[]>
): UseMessageSearchResult {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MessageResponse[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const requestIdRef = useRef(0);
    const searchRef = useRef(search);
    searchRef.current = search;

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const trimmed = query.trim();
        if (!trimmed) {
            // No sensible "browse everything" mode for message search (unlike
            // channel-name search) - an empty query just means "search closed".
            requestIdRef.current += 1;
            setResults([]);
            setHasMore(false);
            setError(null);
            setIsSearching(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            const requestId = ++requestIdRef.current;
            setIsSearching(true);
            setError(null);

            searchRef
                .current(trimmed, undefined, SEARCH_PAGE_SIZE)
                .then((page) => {
                    if (requestId !== requestIdRef.current) return;
                    setResults(page);
                    setHasMore(page.length >= SEARCH_PAGE_SIZE);
                })
                .catch((err) => {
                    if (requestId === requestIdRef.current) {
                        setError(err?.response?.data?.message ?? 'جستجوی پیام‌ها ناموفق بود');
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

    const loadMore = useCallback(() => {
        const trimmed = query.trim();
        if (!trimmed || results.length === 0 || isLoadingMore) return;

        const requestId = requestIdRef.current;
        const oldestLoadedAt = results[results.length - 1]?.createdAt;
        setIsLoadingMore(true);
        setError(null);

        searchRef
            .current(trimmed, oldestLoadedAt, SEARCH_PAGE_SIZE)
            .then((page) => {
                if (requestId !== requestIdRef.current) return;
                setResults((prev) => [...prev, ...page]);
                setHasMore(page.length >= SEARCH_PAGE_SIZE);
            })
            .catch((err) => {
                if (requestId === requestIdRef.current) {
                    setError(err?.response?.data?.message ?? 'جستجوی پیام‌ها ناموفق بود');
                }
            })
            .finally(() => {
                if (requestId === requestIdRef.current) setIsLoadingMore(false);
            });
    }, [query, results, isLoadingMore]);

    return {
        query,
        setQuery,
        results,
        isSearching,
        isLoadingMore,
        hasMore,
        loadMore,
        error,
        hasSearched: query.trim().length > 0,
    };
}

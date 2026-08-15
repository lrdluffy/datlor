import { Loader2, SearchX } from 'lucide-react';
import { MessageResponse } from '../types/message';

interface MessageSearchResultsProps {
    results: MessageResponse[];
    query: string;
    isSearching: boolean;
    hasSearched: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    currentUserId: string;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
}

const TYPE_LABEL: Record<string, string> = { IMAGE: 'تصویر', FILE: 'فایل', SYSTEM: 'پیام سیستمی' };

/**
 * Wraps every case-insensitive occurrence of `query` in <mark> - escapes
 * regex metacharacters first since `query` is raw user input and would
 * otherwise be able to build an invalid (or unintentionally powerful)
 * RegExp, e.g. searching for "a.b" or "(x)".
 */
function highlightMatch(content: string, query: string) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = content.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-accent/20 text-accent rounded px-0.5">
                {part}
            </mark>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

/**
 * "6.4 جستجوی پیام‌ها": renders search hits newest-first (as returned by
 * the API), unlike MessageList's chronological chat rendering - browsing
 * search results isn't a live thread, so there's no bottom-anchored
 * auto-scroll here, and "load more" appends OLDER matches at the bottom.
 * Deliberately read-only: editing/deleting isn't offered from search
 * results, keeping this focused on "filter and display", not message
 * management (use the live chat view for that).
 */
export function MessageSearchResults({
                                         results,
                                         query,
                                         isSearching,
                                         hasSearched,
                                         hasMore,
                                         isLoadingMore,
                                         onLoadMore,
                                         currentUserId,
                                     }: MessageSearchResultsProps) {
    if (isSearching && results.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-ink/40 inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال جستجو...
                </p>
            </div>
        );
    }

    if (hasSearched && !isSearching && results.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center px-6 text-center">
                <p className="text-sm text-ink/40 inline-flex items-center gap-2">
                    <SearchX className="w-4 h-4 flex-shrink-0" />
                    پیامی حاوی «{query}» یافت نشد
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {results.map((message) => {
                const isOwn = message.senderId === currentUserId;
                return (
                    <div
                        key={message.id}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                            isOwn ? 'border-accent/20 bg-accent/5' : 'border-line bg-white'
                        }`}
                    >
                        {message.content && (
                            <p className="whitespace-pre-wrap break-words text-ink">{highlightMatch(message.content, query)}</p>
                        )}
                        {message.type !== 'TEXT' && (
                            <p className="italic text-ink/50 text-xs mt-0.5">[{TYPE_LABEL[message.type] ?? message.type}]</p>
                        )}
                        <div className="text-[10px] text-ink/40 mt-1">{formatTime(message.createdAt)}</div>
                    </div>
                );
            })}

            {hasMore && (
                <div className="text-center pt-2">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="text-xs text-accent hover:text-accentDeep font-medium disabled:opacity-50"
                    >
                        {isLoadingMore ? 'در حال بارگذاری...' : 'نتایج بیشتر'}
                    </button>
                </div>
            )}
        </div>
    );
}

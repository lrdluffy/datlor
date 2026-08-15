import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface MessageSearchBarProps {
    query: string;
    onQueryChange: (query: string) => void;
}

/**
 * collapsed to a single icon button by default - click
 * to expand into a text input. Closing (the X button or Escape) clears the
 * query too, which is what tells ChannelViewPage/GroupViewPage to switch
 * back from search results to the live chat view (see
 * useMessageSearch.hasSearched).
 */
export function MessageSearchBar({ query, onQueryChange }: MessageSearchBarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const close = () => {
        setIsOpen(false);
        onQueryChange('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                title="جستجوی پیام‌ها"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink/40 hover:text-accent hover:bg-slate-100 transition-colors flex-shrink-0"
            >
                <Search className="w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg px-2.5 py-1.5 flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />
            <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') close();
                }}
                placeholder="جستجو در پیام‌ها..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/30 focus:outline-none min-w-0"
            />
            <button onClick={close} title="بستن جستجو" className="text-ink/40 hover:text-ink flex-shrink-0">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

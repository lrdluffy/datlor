import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { ChannelTopicResponse } from '../types/channel';
import { NO_TOPIC } from '../hooks/useChannelSession';

interface TopicSelectorProps {
    topics: ChannelTopicResponse[];
    selectedTopicId: string | null;
    onSelect: (id: string | null) => void;
    /** "4.4 Create Channel": lets any member with access add a new topic. Omit to hide the control entirely. */
    onCreateTopic?: (name: string) => void;
    /** True when the current viewer has access to create a topic (ACTIVE status) - enforced server-side too. */
    canCreateTopic?: boolean;
}

/**
 * Filters the visible message list by topic AND determines which topic a
 * newly sent message is tagged with (see useChannelSession.sendMessage) -
 * the same selection drives both, matching the spec's "Send message to
 * selected topic" requirement.
 *
 * Also where a new topic is created (beyond the default one seeded at
 * channel creation) - any member with access may add one; the new pill
 * appears live for everyone else currently viewing the channel too, via
 * the TOPIC_CREATED WS event (see useChannelSession).
 */
export function TopicSelector({ topics, selectedTopicId, onSelect, onCreateTopic, canCreateTopic }: TopicSelectorProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState('');

    const pillClass = (active: boolean) =>
        `text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
            active ? 'bg-ink text-white' : 'bg-white border border-line text-ink/70 hover:border-accent'
        }`;

    const submitCreate = () => {
        const trimmed = draft.trim();
        if (!trimmed || !onCreateTopic) return;
        onCreateTopic(trimmed);
        setDraft('');
        setIsCreating(false);
    };

    const cancelCreate = () => {
        setDraft('');
        setIsCreating(false);
    };

    return (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-line bg-white overflow-x-auto">
            <button className={pillClass(selectedTopicId === null)} onClick={() => onSelect(null)}>
                همه پیام‌ها
            </button>
            <button className={pillClass(selectedTopicId === NO_TOPIC)} onClick={() => onSelect(NO_TOPIC)}>
                بدون تاپیک
            </button>
            {topics.map((topic) => (
                <button
                    key={topic.id}
                    className={pillClass(selectedTopicId === topic.id)}
                    onClick={() => onSelect(topic.id)}
                >
                    #{topic.name}
                </button>
            ))}

            {onCreateTopic && canCreateTopic && (
                isCreating ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submitCreate();
                                if (e.key === 'Escape') cancelCreate();
                            }}
                            placeholder="نام تاپیک"
                            maxLength={100}
                            className="text-xs rounded-full border border-line px-3 py-1.5 w-28 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                            onClick={submitCreate}
                            disabled={!draft.trim()}
                            title="ایجاد تاپیک"
                            className="p-1 rounded-full text-accent hover:bg-canvas disabled:opacity-40"
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelCreate} title="انصراف" className="p-1 rounded-full text-ink/40 hover:bg-canvas">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        title="تاپیک جدید"
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap border border-dashed border-line text-ink/50 hover:border-accent hover:text-accent transition-colors flex-shrink-0"
                    >
                        <Plus className="w-3 h-3" />
                        تاپیک جدید
                    </button>
                )
            )}
        </div>
    );
}

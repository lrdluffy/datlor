import { ChannelTopicResponse } from '../types/channel';
import { NO_TOPIC } from '../hooks/useChannelSession';

interface TopicSelectorProps {
  topics: ChannelTopicResponse[];
  selectedTopicId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Filters the visible message list by topic AND determines which topic a
 * newly sent message is tagged with (see useChannelSession.sendMessage) -
 * the same selection drives both, matching the spec's "Send message to
 * selected topic" requirement.
 */
export function TopicSelector({ topics, selectedTopicId, onSelect }: TopicSelectorProps) {
  const pillClass = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-ink text-white' : 'bg-white border border-line text-ink/70 hover:border-accent'
    }`;

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
    </div>
  );
}

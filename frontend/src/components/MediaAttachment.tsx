import { Download, File as FileIcon, Loader2 } from 'lucide-react';
import { mediaApi } from '../api/mediaApi';
import { useMediaMetadata } from '../hooks/useMediaMetadata';
import { MessageType } from '../types/message';

interface MediaAttachmentProps {
    mediaId: string;
    type: MessageType;
    /** True when the message bubble it's inside is the viewer's own - affects only download-link tinting, matching the bubble. */
    isOwn: boolean;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * `type === 'IMAGE'` renders directly - the
 * browser only needs a URL for that. `type === 'FILE'` covers video,
 * audio, and everything else (see MessageInput's upload classification),
 * so it looks up the real MIME type (cached, see useMediaMetadata) to pick
 * a video player, audio player, or a generic download link.
 */
export function MediaAttachment({ mediaId, type, isOwn }: MediaAttachmentProps) {
    const contentUrl = mediaApi.contentUrl(mediaId);

    if (type === 'IMAGE') {
        return (
            <a href={contentUrl} target="_blank" rel="noreferrer" className="block mb-1">
                <img
                    src={contentUrl}
                    alt="تصویر ارسالی"
                    className="max-w-[240px] max-h-[240px] rounded-lg object-cover border border-black/5"
                    loading="lazy"
                />
            </a>
        );
    }

    return <FileAttachment mediaId={mediaId} contentUrl={contentUrl} isOwn={isOwn} />;
}

function FileAttachment({ mediaId, contentUrl, isOwn }: { mediaId: string; contentUrl: string; isOwn: boolean }) {
    const { metadata, isLoading } = useMediaMetadata(mediaId);

    if (isLoading) {
        return (
            <p className={`text-xs mb-1 inline-flex items-center gap-1.5 ${isOwn ? 'text-white/70' : 'text-ink/40'}`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                در حال بارگذاری پیوست...
            </p>
        );
    }

    const mimeType = metadata?.fileType ?? '';

    if (mimeType.startsWith('video/')) {
        return (
            <video controls preload="metadata" className="max-w-[280px] rounded-lg mb-1">
                <source src={contentUrl} type={mimeType} />
            </video>
        );
    }

    if (mimeType.startsWith('audio/')) {
        return (
            <audio controls preload="metadata" className="max-w-[240px] mb-1">
                <source src={contentUrl} type={mimeType} />
            </audio>
        );
    }

    // Generic file - a download link, since the browser can't preview it inline.
    return (
        <a
            href={contentUrl}
            target="_blank"
            rel="noreferrer"
            download
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 mb-1 text-xs transition-colors ${
                isOwn
                    ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                    : 'border-line bg-canvas text-ink hover:bg-slate-100'
            }`}
        >
            <FileIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 min-w-0 truncate">{metadata ? formatSize(metadata.size) : 'فایل'}</span>
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
        </a>
    );
}

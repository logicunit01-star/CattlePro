/**
 * Media upload to S3-compatible API (Hulm).
 * POST multipart/form-data with field "file"; response contains files[].location.
 */

import { trackedFetch as fetch } from './apiTracker';

const UPLOAD_URL = (import.meta as any).env.VITE_UPLOAD_URL || 'https://s3.hulmsolutions.com/upload';

/** Default public CDN for DigitalOcean Spaces when the upload API returns a partial path. */
const DEFAULT_MEDIA_CDN =
    ((import.meta as any).env.VITE_MEDIA_CDN_BASE as string | undefined)?.replace(/\/$/, '')
    || 'https://hulmstorage.blr1.digitaloceanspaces.com';

/** Backend limits (must stay in sync with upload server). */
export const UPLOAD_LIMITS = {
    imageMaxBytes: 10 * 1024 * 1024,
    videoMaxBytes: 200 * 1024 * 1024,
} as const;

export type UploadMediaKind = 'image' | 'video';

export interface UploadFileResult {
    fieldname: string;
    originalname: string;
    mimetype: string;
    size: number;
    bucket: string;
    key: string;
    location: string;
    etag?: string;
}

export interface UploadResponse {
    success: boolean;
    files?: UploadFileResult[];
    error?: string;
    message?: string;
}

const IMAGE_MIME = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);
const VIDEO_MIME = new Set([
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/avi', 'video/mpeg',
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi)$/i;

export function formatUploadBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Normalize upload `location` to a full https URL.
 * The upload API sometimes returns `https://bucket.region.../key` and sometimes
 * `region.digitaloceanspaces.com/bucket/key` (no protocol) — the latter breaks in the browser as a relative path.
 */
export function normalizeUploadedMediaUrl(
    raw: string,
    hint?: Pick<UploadFileResult, 'bucket' | 'key' | 'location'>
): string {
    const trimmed = (raw || hint?.location || '').trim();
    if (!trimmed) return '';

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }

    // region.digitaloceanspaces.com/bucket/videos/file.mp4 → https://bucket.region.../videos/file.mp4
    const regionFirst = trimmed.match(/^([a-z0-9-]+)\.digitaloceanspaces\.com\/([^/]+)\/(.+)$/i);
    if (regionFirst) {
        const [, region, bucket, key] = regionFirst;
        return `https://${bucket}.${region}.digitaloceanspaces.com/${key}`;
    }

    // bucket.region.digitaloceanspaces.com/key (missing https)
    if (/\.digitaloceanspaces\.com\//i.test(trimmed)) {
        return `https://${trimmed.replace(/^\/+/, '')}`;
    }

    if (hint?.bucket && hint?.key) {
        const key = hint.key.replace(/^\//, '');
        const bucket = hint.bucket.trim();
        if (bucket && key) {
            return `https://${bucket}.blr1.digitaloceanspaces.com/${key}`;
        }
    }

    if (/^(images|videos)\//i.test(trimmed)) {
        return `${DEFAULT_MEDIA_CDN}/${trimmed}`;
    }

    return trimmed;
}

export function normalizeGalleryUrls(urls?: string[] | null): string[] {
    if (!Array.isArray(urls)) return [];
    return urls.map((u) => normalizeUploadedMediaUrl(u)).filter(Boolean);
}

export function isRemoteMediaUrl(value?: string | null): boolean {
    const normalized = normalizeUploadedMediaUrl(value || '');
    return Boolean(normalized && /^https?:\/\//i.test(normalized));
}

/** True when URL points at uploaded video (path or extension). */
export function isVideoUrl(url: string): boolean {
    const u = (url || '').trim();
    if (!u) return false;
    if (/\/videos\//i.test(u)) return true;
    return VIDEO_EXT.test(u.split('?')[0] || '');
}

export function getUploadMediaKind(file: File): UploadMediaKind | null {
    const type = (file.type || '').toLowerCase();
    if (IMAGE_MIME.has(type) || type.startsWith('image/')) return 'image';
    if (VIDEO_MIME.has(type) || type.startsWith('video/')) return 'video';
    const name = file.name || '';
    if (IMAGE_EXT.test(name)) return 'image';
    if (VIDEO_EXT.test(name)) return 'video';
    return null;
}

export type ValidateUploadOptions = {
    /** Profile photo and similar slots — images only. */
    imagesOnly?: boolean;
};

/**
 * Client-side validation before hitting the upload server.
 * @throws Error with a user-facing message
 */
export function validateUploadFile(file: File, options?: ValidateUploadOptions): UploadMediaKind {
    const kind = getUploadMediaKind(file);
    if (!kind) {
        throw new Error('Only images and videos are allowed. Use JPG, PNG, WebP, MP4, or MOV.');
    }
    if (options?.imagesOnly && kind !== 'image') {
        throw new Error('Please choose an image file (JPG, PNG, or WebP). Videos belong in the media gallery.');
    }
    const max = kind === 'image' ? UPLOAD_LIMITS.imageMaxBytes : UPLOAD_LIMITS.videoMaxBytes;
    const label = kind === 'image' ? 'Image' : 'Video';
    const maxLabel = kind === 'image' ? '10 MB' : '200 MB';
    if (file.size > max) {
        throw new Error(
            `${label} is too large (${formatUploadBytes(file.size)}). Maximum allowed size is ${maxLabel}.`
        );
    }
    return kind;
}

function parseUploadError(res: Response, data: unknown): string {
    const body = data as UploadResponse | null;
    const serverMsg = typeof body?.error === 'string' ? body.error.trim()
        : typeof body?.message === 'string' ? body.message.trim()
        : '';

    if (res.status === 413) {
        return 'File is too large for the server. Images must be under 10 MB and videos under 200 MB.';
    }
    if (serverMsg) return serverMsg;
    if (!res.ok) return `Upload failed (${res.status})`;
    return 'Upload failed';
}

/**
 * Upload an image or video. Returns public URL and detected kind.
 */
export async function uploadMedia(file: File, options?: ValidateUploadOptions): Promise<{ url: string; kind: UploadMediaKind }> {
    const kind = validateUploadFile(file, options);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
    });

    let data: UploadResponse;
    try {
        data = (await res.json()) as UploadResponse;
    } catch {
        if (res.status === 413) {
            throw new Error(parseUploadError(res, null));
        }
        throw new Error(res.ok ? 'Invalid response from upload server' : `Upload failed (${res.status})`);
    }

    if (!res.ok || data.success === false) {
        throw new Error(parseUploadError(res, data));
    }
    if (!data.files?.length) {
        throw new Error('Upload failed: no file returned');
    }
    const uploaded = data.files[0];
    const url = normalizeUploadedMediaUrl(uploaded.location, uploaded);
    if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error('Upload failed: invalid media URL from upload server');
    }
    return { url, kind };
}

/**
 * Upload a single image (animal profile, medical attachment, etc.).
 */
export async function uploadImage(file: File): Promise<string> {
    const { url } = await uploadMedia(file, { imagesOnly: true });
    return url;
}

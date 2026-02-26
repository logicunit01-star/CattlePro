/**
 * Image upload to S3-compatible API (Hulm).
 * POST multipart/form-data with field "file"; response contains files[].location.
 */

const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://s3.hulmsolutions.com/upload';

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
    files: UploadFileResult[];
}

/**
 * Upload a single file. Returns the public URL (location) on success.
 * @param file - File from input
 * @returns Promise resolving to the image URL
 */
export async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
        // Do not set Content-Type; browser sets multipart boundary
    });

    let data: UploadResponse;
    try {
        data = (await res.json()) as UploadResponse;
    } catch {
        throw new Error(res.ok ? 'Invalid response from upload server' : `Upload failed (${res.status})`);
    }
    if (!res.ok) {
        throw new Error((data as any)?.message || `Upload failed (${res.status})`);
    }
    if (!data.success || !data.files?.length) {
        throw new Error('Upload failed: no file returned');
    }
    const location = data.files[0].location;
    if (!location) {
        throw new Error('Upload failed: no location in response');
    }
    return location;
}

export const SUPPORTED_MIME_TYPES = {
    // Images
    'image/jpeg': ['.jpg', '.jpeg'] as const,
    'image/png': ['.png'] as const,
    'image/gif': ['.gif'] as const,
    'image/webp': ['.webp'] as const,

    // Documents
    'application/pdf': ['.pdf'] as const,
    'application/msword': ['.doc'] as const,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
    ] as const,
    'application/vnd.ms-excel': ['.xls'] as const,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
    ] as const,

    // Text
    'text/plain': ['.txt'] as const,
    'text/markdown': ['.md'] as const,

    // Archives
    'application/zip': ['.zip'] as const,
    'application/x-rar-compressed': ['.rar'] as const,
    'application/x-7z-compressed': ['.7z'] as const,
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;
export interface FileUploadSlot {
    putUrl: string;
    getUrl: string;
    putHeaders: Record<string, string>;
    getHeaders: Record<string, string>;
}

export interface FileUploadSlotOptions {
    filename: string;
    size: number;
    contentType: string;
    domain: string;
}

export interface UploadConfig {
    maxFileSize?: number;
    allowedMimeTypes?: SupportedMimeType[];
    uploadEndpoint: string;
    downloadEndpoint?: string;
    headers?: Record<string, string>;
}

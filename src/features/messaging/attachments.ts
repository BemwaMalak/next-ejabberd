import axios from 'axios';
import {
    SUPPORTED_MIME_TYPES,
    SupportedMimeType,
    UploadConfig,
    FileUploadSlot,
} from '../../types/files';
import { FileQueryBuilder } from '../files/queries';
import { FileHandler } from '../files/handlers';
import { ConnectionManager } from '../../core/connection';
import mime from 'mime-types';

/**
 * Error types for file handling
 */
export class FileError extends Error {
    constructor(
        message: string,
        public readonly code:
            | 'SIZE_EXCEEDED'
            | 'INVALID_TYPE'
            | 'UPLOAD_FAILED'
            | 'DOWNLOAD_FAILED',
    ) {
        super(message);
        this.name = 'FileError';
    }
}

export class AttachmentManager {
    private config: UploadConfig;
    private queryBuilder: FileQueryBuilder;
    private fileHandler: FileHandler;
    private connection: ConnectionManager;

    constructor(config: UploadConfig, connection: ConnectionManager) {
        this.config = {
            maxFileSize: 10 * 1024 * 1024, // 10MB default
            allowedMimeTypes: Object.keys(
                SUPPORTED_MIME_TYPES,
            ) as SupportedMimeType[],
            ...config,
        };
        this.queryBuilder = new FileQueryBuilder();
        this.fileHandler = new FileHandler();
        this.connection = connection;
    }

    /**
     * Validates a file before upload
     */
    private validateFile(file: File): void {
        if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
            throw new FileError(
                `File size (${file.size} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`,
                'SIZE_EXCEEDED',
            );
        }

        if (
            this.config.allowedMimeTypes &&
            !this.config.allowedMimeTypes.includes(
                file.type as SupportedMimeType,
            )
        ) {
            throw new FileError(
                `File type ${file.type} is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`,
                'INVALID_TYPE',
            );
        }
    }

    private async getFileBuffer(file: File): Promise<Buffer> {
        return new Promise((resolve) => {
            file.arrayBuffer().then((buffer) => {
                resolve(Buffer.from(buffer));
            });
        });
    }

    private async requestUploadSlot(file: File): Promise<FileUploadSlot> {
        if (!this.connection) {
            throw new Error('XMPP connection not available');
        }

        return new Promise((resolve, reject) => {
            const iq = this.queryBuilder.createUploadSlotRequest({
                filename: file.name,
                size: file.size,
                contentType: file.type,
                domain: this.connection.getConfig().domain,
            });

            this.connection
                .sendIQ(iq)
                .then((stanza: any) => {
                    if (!this.connection) return;

                    const slot =
                        this.fileHandler.parseUploadSlotResponse(stanza);
                    if (slot) {
                        resolve(slot);
                        return;
                    }
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    private async uploadFileToSlot(
        slot: FileUploadSlot,
        file: Buffer,
    ): Promise<void> {
        try {
            await axios.put(slot.putUrl, file, {
                headers: {
                    'Content-Type': mime.lookup(file.toString()),
                    ...slot.putHeaders,
                },
            });
        } catch (error) {
            throw new FileError(
                `File upload failed: ${(error as Error).message}`,
                'UPLOAD_FAILED',
            );
        }
    }
    /**
     * Uploads a file to the server
     */
    public async uploadFile(file: File): Promise<FileUploadSlot> {
        try {
            this.validateFile(file);

            const uploadSlot = await this.requestUploadSlot(file);
            const fileBuffer = await this.getFileBuffer(file);
            await this.uploadFileToSlot(uploadSlot, fileBuffer);

            return uploadSlot;
        } catch (error) {
            if (error instanceof FileError) {
                throw error;
            }
            throw new FileError(
                `File upload failed: ${(error as Error).message}`,
                'UPLOAD_FAILED',
            );
        }
    }

    /**
     * Checks if a file type is supported
     */
    public isSupportedFileType(mimeType: string): boolean {
        return mimeType in SUPPORTED_MIME_TYPES;
    }

    /**
     * Gets the file extension for a MIME type
     */
    public getFileExtension(mimeType: SupportedMimeType): string[] {
        return [...SUPPORTED_MIME_TYPES[mimeType]];
    }
}

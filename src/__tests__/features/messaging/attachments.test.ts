import {
    AttachmentManager,
    FileError,
} from '../../../features/messaging/attachments';
import { ConnectionManager } from '../../../core/connection';
import { FileUploadSlot, SUPPORTED_MIME_TYPES } from '../../../types/files';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../core/connection');
jest.mock('mime-types', () => ({
    lookup: jest.fn().mockReturnValue('application/pdf'),
}));

describe('AttachmentManager', () => {
    let attachmentManager: AttachmentManager;
    let mockConnection: jest.Mocked<ConnectionManager>;
    const mockConfig = {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: Object.keys(SUPPORTED_MIME_TYPES) as Array<
            keyof typeof SUPPORTED_MIME_TYPES
        >,
        uploadEndpoint: 'https://test.com/upload',
        downloadEndpoint: 'https://test.com/download',
    };

    beforeEach(() => {
        mockConnection = new ConnectionManager({
            domain: 'test.com',
            password: 'test',
            username: 'test',
            service: 'ws://test.com:5280/ws',
            resource: 'test',
        }) as jest.Mocked<ConnectionManager>;
        mockConnection.getConfig = jest
            .fn()
            .mockReturnValue({ domain: 'test.com' });
        mockConnection.sendIQ = jest.fn();

        attachmentManager = new AttachmentManager(mockConfig, mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateFile', () => {
        it('should throw SIZE_EXCEEDED error when file is too large', () => {
            const file = new File([''], 'test.pdf', {
                type: 'application/pdf',
            });
            Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

            expect(() => {
                (attachmentManager as any).validateFile(file);
            }).toThrow(FileError);
            expect(() => {
                (attachmentManager as any).validateFile(file);
            }).toThrow(/File size .* exceeds maximum allowed size/);
        });

        it('should throw INVALID_TYPE error for unsupported file type', () => {
            const file = new File([''], 'test.txt', {
                type: 'application/unknown',
            });

            expect(() => {
                (attachmentManager as any).validateFile(file);
            }).toThrow(FileError);
            expect(() => {
                (attachmentManager as any).validateFile(file);
            }).toThrow(/File type .* is not allowed/);
        });

        it('should not throw for valid file', () => {
            const file = new File([''], 'test.pdf', {
                type: 'application/pdf',
            });
            Object.defineProperty(file, 'size', { value: 1024 });

            expect(() => {
                (attachmentManager as any).validateFile(file);
            }).not.toThrow();
        });
    });

    describe('requestUploadSlot', () => {
        const mockFile = new File([''], 'test.pdf', {
            type: 'application/pdf',
        });
        const mockSlot: FileUploadSlot = {
            getUrl: 'http://test.com/get',
            putUrl: 'http://test.com/put',
            putHeaders: { 'Content-Type': 'application/pdf' },
            getHeaders: { Accept: 'application/pdf' },
        };

        beforeEach(() => {
            (attachmentManager as any).fileHandler.parseUploadSlotResponse =
                jest.fn().mockReturnValue(mockSlot);
        });

        it('should throw error when connection is not available', async () => {
            (attachmentManager as any).connection = null;

            await expect(
                (attachmentManager as any).requestUploadSlot(mockFile),
            ).rejects.toThrow('XMPP connection not available');
        });
    });

    describe('uploadFileToSlot', () => {
        const mockSlot: FileUploadSlot = {
            getUrl: 'http://test.com/get',
            putUrl: 'http://test.com/put',
            putHeaders: { 'Content-Type': 'application/pdf' },
            getHeaders: { Accept: 'application/pdf' },
        };
        const mockBuffer = Buffer.from('test content');

        it('should upload file successfully', async () => {
            (axios.put as jest.Mock).mockResolvedValue({});

            await expect(
                (attachmentManager as any).uploadFileToSlot(
                    mockSlot,
                    mockBuffer,
                ),
            ).resolves.not.toThrow();

            expect(axios.put).toHaveBeenCalledWith(
                mockSlot.putUrl,
                mockBuffer,
                expect.objectContaining({
                    headers: expect.objectContaining(mockSlot.putHeaders),
                }),
            );
        });

        it('should throw UPLOAD_FAILED on axios error', async () => {
            const error = new Error('Network error');
            (axios.put as jest.Mock).mockRejectedValue(error);

            await expect(
                (attachmentManager as any).uploadFileToSlot(
                    mockSlot,
                    mockBuffer,
                ),
            ).rejects.toThrow(FileError);
            await expect(
                (attachmentManager as any).uploadFileToSlot(
                    mockSlot,
                    mockBuffer,
                ),
            ).rejects.toThrow(/File upload failed/);
        });
    });

    describe('uploadFile', () => {
        const mockFile = new File(['test content'], 'test.pdf', {
            type: 'application/pdf',
        });
        Object.defineProperty(mockFile, 'size', { value: 1024 });

        const mockSlot: FileUploadSlot = {
            getUrl: 'http://test.com/get',
            putUrl: 'http://test.com/put',
            putHeaders: { 'Content-Type': 'application/pdf' },
            getHeaders: { Accept: 'application/pdf' },
        };

        beforeEach(() => {
            (attachmentManager as any).requestUploadSlot = jest
                .fn()
                .mockResolvedValue(mockSlot);
            (attachmentManager as any).uploadFileToSlot = jest
                .fn()
                .mockResolvedValue(undefined);
        });

        it('should propagate FileError from validation', async () => {
            const largeFile = new File([''], 'large.pdf', {
                type: 'application/pdf',
            });
            Object.defineProperty(largeFile, 'size', {
                value: 10 * 1024 * 1024,
            });

            await expect(
                attachmentManager.uploadFile(largeFile),
            ).rejects.toThrow(FileError);
            await expect(
                attachmentManager.uploadFile(largeFile),
            ).rejects.toThrow(/File size .* exceeds maximum allowed size/);
        });

        it('should wrap non-FileError errors in UPLOAD_FAILED', async () => {
            const error = new Error('Unknown error');
            (attachmentManager as any).requestUploadSlot.mockRejectedValue(
                error,
            );

            await expect(
                attachmentManager.uploadFile(mockFile),
            ).rejects.toThrow(FileError);
            await expect(
                attachmentManager.uploadFile(mockFile),
            ).rejects.toThrow(/File upload failed/);
        });
    });

    describe('isSupportedFileType', () => {
        it('should return true for supported MIME types', () => {
            expect(
                attachmentManager.isSupportedFileType('application/pdf'),
            ).toBe(true);
            expect(attachmentManager.isSupportedFileType('image/jpeg')).toBe(
                true,
            );
            expect(attachmentManager.isSupportedFileType('text/plain')).toBe(
                true,
            );
        });

        it('should return false for unsupported MIME types', () => {
            expect(
                attachmentManager.isSupportedFileType('application/unknown'),
            ).toBe(false);
            expect(attachmentManager.isSupportedFileType('video/mp4')).toBe(
                false,
            );
        });
    });

    describe('getFileExtension', () => {
        it('should return array of extensions for supported MIME type', () => {
            const pdfExtensions =
                attachmentManager.getFileExtension('application/pdf');
            expect(Array.isArray(pdfExtensions)).toBe(true);
            expect(pdfExtensions).toContain('.pdf');

            const jpegExtensions =
                attachmentManager.getFileExtension('image/jpeg');
            expect(jpegExtensions).toContain('.jpg');
            expect(jpegExtensions).toContain('.jpeg');
        });
    });
});

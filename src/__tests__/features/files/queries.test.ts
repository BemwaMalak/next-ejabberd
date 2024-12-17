import { Element } from '@xmpp/xml';
import { FileQueryBuilder } from '../../../features/files/queries';
import { FileUploadError } from '../../../types/files';
import { FileNamespaces } from '../../../constants/namespaces';

// Mock uuid to have consistent IDs in tests
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

describe('FileQueryBuilder', () => {
    let queryBuilder: FileQueryBuilder;

    beforeEach(() => {
        queryBuilder = new FileQueryBuilder();
    });

    describe('validateOptions', () => {
        const validOptions = {
            filename: 'test.jpg',
            size: 1024,
            contentType: 'image/jpeg',
            domain: 'example.com',
        };

        it('should throw error for empty filename', () => {
            expect(() =>
                queryBuilder['validateOptions']({
                    ...validOptions,
                    filename: '',
                }),
            ).toThrow('Filename must not be empty');
            expect(() =>
                queryBuilder['validateOptions']({
                    ...validOptions,
                    filename: '   ',
                }),
            ).toThrow('Filename must not be empty');
        });

        it('should throw error for invalid size', () => {
            expect(() =>
                queryBuilder['validateOptions']({ ...validOptions, size: 0 }),
            ).toThrow('File size must be a positive number');
            expect(() =>
                queryBuilder['validateOptions']({ ...validOptions, size: -1 }),
            ).toThrow('File size must be a positive number');
        });

        it('should throw error for empty domain', () => {
            expect(() =>
                queryBuilder['validateOptions']({
                    ...validOptions,
                    domain: '',
                }),
            ).toThrow('Domain must not be empty');
            expect(() =>
                queryBuilder['validateOptions']({
                    ...validOptions,
                    domain: '   ',
                }),
            ).toThrow('Domain must not be empty');
        });

        it('should throw error for unsupported content type', () => {
            expect(() =>
                queryBuilder['validateOptions']({
                    ...validOptions,
                    contentType: 'invalid/type',
                }),
            ).toThrow('Unsupported content type');
        });

        it('should not throw for valid options', () => {
            expect(() =>
                queryBuilder['validateOptions'](validOptions),
            ).not.toThrow();
        });
    });

    describe('createElement', () => {
        it('should create element with name only', () => {
            const element = queryBuilder['createElement']('test');
            expect(element.name).toBe('test');
            expect(element.attrs).toEqual({});
        });

        it('should create element with attributes', () => {
            const attrs = { id: '123', type: 'test' };
            const element = queryBuilder['createElement']('test', attrs);
            expect(element.name).toBe('test');
            expect(element.attrs).toEqual(attrs);
        });
    });

    describe('createRequestElement', () => {
        it('should create request element with correct attributes', () => {
            const options = {
                filename: 'test.jpg',
                size: 1024,
                contentType: 'image/jpeg',
                domain: 'example.com',
            };

            const request = queryBuilder['createRequestElement'](options);

            expect(request.name).toBe('request');
            expect(request.attrs).toEqual({
                xmlns: FileNamespaces.HTTP_UPLOAD,
                filename: 'test.jpg',
                size: '1024',
                'content-type': 'image/jpeg',
            });
        });
    });

    describe('createIQStanza', () => {
        it('should create IQ stanza with correct attributes', () => {
            const domain = 'example.com';
            const iq = queryBuilder['createIQStanza'](domain);

            expect(iq.name).toBe('iq');
            expect(iq.attrs).toEqual({
                type: 'get',
                id: 'mock-uuid',
                to: 'upload.example.com',
            });
        });
    });

    describe('createUploadSlotRequest', () => {
        const validOptions = {
            filename: 'test.jpg',
            size: 1024,
            contentType: 'image/jpeg',
            domain: 'example.com',
        };

        it('should create complete upload slot request', () => {
            const request = queryBuilder.createUploadSlotRequest(validOptions);

            expect(request.is('iq')).toBe(true);
            expect(request.attrs.type).toBe('get');
            expect(request.attrs.id).toBe('mock-uuid');
            expect(request.attrs.to).toBe('upload.example.com');

            const slotRequest = request.getChild('request');
            expect(slotRequest).toBeTruthy();
            expect(slotRequest?.attrs).toEqual({
                xmlns: FileNamespaces.HTTP_UPLOAD,
                filename: 'test.jpg',
                size: '1024',
                'content-type': 'image/jpeg',
            });
        });

        it('should throw error for invalid options', () => {
            expect(() =>
                queryBuilder.createUploadSlotRequest({
                    ...validOptions,
                    filename: '',
                }),
            ).toThrow('Filename must not be empty');
        });
    });
});

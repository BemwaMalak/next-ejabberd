import { Element } from '@xmpp/xml';
import { FileHandler } from '../../../features/files/handlers';
import { FileNamespaces } from '../../../constants/namespaces';

describe('FileHandler', () => {
    let fileHandler: FileHandler;
    let mockElement: Element;

    beforeEach(() => {
        fileHandler = new FileHandler();
    });

    describe('parseHeaders', () => {
        it('should parse headers correctly', () => {
            mockElement = new Element('put', {});
            mockElement.append(
                new Element('header', { name: 'Content-Type' }).t('image/jpeg'),
            );
            mockElement.append(
                new Element('header', { name: 'Content-Length' }).t('12345'),
            );

            const headers = fileHandler['parseHeaders'](mockElement);

            expect(headers).toEqual({
                'Content-Type': 'image/jpeg',
                'Content-Length': '12345',
            });
        });

        it('should return empty object for no headers', () => {
            mockElement = new Element('put', {});
            const headers = fileHandler['parseHeaders'](mockElement);
            expect(headers).toEqual({});
        });
    });

    describe('validateSlot', () => {
        it('should throw error for missing slot', () => {
            expect(() => fileHandler['validateSlot'](undefined)).toThrow(
                'Missing slot element in response',
            );
        });

        it('should throw error for missing URLs', () => {
            mockElement = new Element('slot', {});
            mockElement.append(new Element('put', {}));
            mockElement.append(new Element('get', {}));

            expect(() => fileHandler['validateSlot'](mockElement)).toThrow(
                'Missing PUT or GET URLs in slot response',
            );
        });

        it('should not throw for valid slot', () => {
            mockElement = new Element('slot', {});
            mockElement.append(
                new Element('put', { url: 'https://example.com/put' }),
            );
            mockElement.append(
                new Element('get', { url: 'https://example.com/get' }),
            );

            expect(() =>
                fileHandler['validateSlot'](mockElement),
            ).not.toThrow();
        });
    });

    describe('extractSlotData', () => {
        beforeEach(() => {
            mockElement = new Element('slot', {});
            const putElement = new Element('put', {
                url: 'https://example.com/put',
            });
            const getElement = new Element('get', {
                url: 'https://example.com/get',
            });
            putElement.append(
                new Element('header', { name: 'Content-Type' }).t('image/jpeg'),
            );
            mockElement.append(putElement);
            mockElement.append(getElement);
        });

        it('should extract URLs and headers correctly', () => {
            const result = fileHandler['extractSlotData'](mockElement);

            expect(result).toEqual({
                putUrl: 'https://example.com/put',
                getUrl: 'https://example.com/get',
                putHeaders: { 'Content-Type': 'image/jpeg' },
                getHeaders: {},
            });
        });
    });

    describe('parseUploadSlotResponse', () => {
        it('should throw error for invalid stanza type', () => {
            mockElement = new Element('iq', { type: 'error' });
            expect(() =>
                fileHandler.parseUploadSlotResponse(mockElement),
            ).toThrow('Invalid upload slot response');
        });

        it('should parse valid response correctly', () => {
            mockElement = new Element('iq', { type: 'result' });
            const slot = new Element('slot', {
                xmlns: FileNamespaces.HTTP_UPLOAD,
            });
            slot.append(new Element('put', { url: 'https://example.com/put' }));
            slot.append(new Element('get', { url: 'https://example.com/get' }));
            mockElement.append(slot);

            const result = fileHandler.parseUploadSlotResponse(mockElement);

            expect(result).toEqual({
                putUrl: 'https://example.com/put',
                getUrl: 'https://example.com/get',
                putHeaders: {},
                getHeaders: {},
            });
        });
    });

    describe('isUploadSlotResponse', () => {
        it('should return true for valid upload slot response', () => {
            mockElement = new Element('iq', { type: 'result' });
            const slot = new Element('slot', {
                xmlns: FileNamespaces.HTTP_UPLOAD,
            });
            slot.append(new Element('put', { url: 'https://example.com/put' }));
            slot.append(new Element('get', { url: 'https://example.com/get' }));
            mockElement.append(slot);

            expect(fileHandler.isUploadSlotResponse(mockElement)).toBe(true);
        });

        it('should return false for invalid stanza', () => {
            mockElement = new Element('iq', { type: 'error' });
            expect(fileHandler.isUploadSlotResponse(mockElement)).toBe(false);
        });

        it('should return false for missing URLs', () => {
            mockElement = new Element('iq', { type: 'result' });
            const slot = new Element('slot', {
                xmlns: FileNamespaces.HTTP_UPLOAD,
            });
            slot.append(new Element('put', {}));
            slot.append(new Element('get', {}));
            mockElement.append(slot);

            expect(fileHandler.isUploadSlotResponse(mockElement)).toBe(false);
        });
    });
});

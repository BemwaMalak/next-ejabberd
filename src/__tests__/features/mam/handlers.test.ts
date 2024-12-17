import { Element } from '@xmpp/xml';
import { MAMHandler } from '../../../features/mam/handlers';
import { FileNamespaces } from '../../../constants/namespaces';
import { Client } from '@xmpp/client';

describe('MAMHandler', () => {
    let handler: MAMHandler;
    let mockClient: jest.Mocked<Client>;

    beforeEach(() => {
        handler = new MAMHandler();
        mockClient = {
            send: jest.fn().mockResolvedValue(undefined),
        } as any;
    });

    describe('parseResult', () => {
        it('should return null for invalid stanza', () => {
            const stanza = new Element('invalid');
            expect(handler.parseResult(stanza)).toBeNull();
        });

        it('should store message and return null for intermediate result', () => {
            const stanza = new Element('message');
            const result = new Element('result', { queryid: 'query-1' });
            const forwarded = new Element('forwarded', {
                xmlns: 'urn:xmpp:forward:0',
            });
            const message = new Element('message', {
                from: 'user@domain',
                to: 'other@domain',
                id: 'msg-1',
            });
            message.append(new Element('body').t('Hello'));
            forwarded.append(message);
            result.append(forwarded);
            stanza.append(result);

            expect(handler.parseResult(stanza)).toBeNull();
        });
    });

    describe('parseForwardedMessage', () => {
        it('should parse file message', () => {
            const stanza = new Element('result');
            const forwarded = new Element('forwarded', {
                xmlns: 'urn:xmpp:forward:0',
            });
            const message = new Element('message', {
                from: 'user@domain',
                to: 'other@domain',
                id: 'msg-1',
            });
            const x = new Element('x', { xmlns: FileNamespaces.HTTP_UPLOAD });
            const file = new Element('file', {
                url: 'https://example.com/file.jpg',
                name: 'file.jpg',
                size: '1024',
                type: 'image/jpeg',
            });
            x.append(file);
            message.append(x);
            forwarded.append(message);
            stanza.append(forwarded);

            const result = handler.parseForwardedMessage(stanza);
            expect(result).toEqual({
                id: 'msg-1',
                from: 'user@domain',
                to: 'other@domain',
                time: expect.any(Date),
                type: 'file',
                body: '',
                stanza_id: undefined,
                fileUrl: 'https://example.com/file.jpg',
                fileName: 'file.jpg',
                fileSize: '1024',
                mimeType: 'image/jpeg',
            });
        });

        it('should return null for invalid stanza', () => {
            const stanza = new Element('invalid');
            expect(handler.parseForwardedMessage(stanza)).toBeNull();
        });
    });

    describe('sendQuery', () => {
        it('should send query to client', async () => {
            const query = new Element('iq', { type: 'set' });
            await handler.sendQuery(mockClient, query);
            expect(mockClient.send).toHaveBeenCalledWith(query);
        });
    });
});

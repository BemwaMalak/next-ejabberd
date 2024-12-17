import { Element } from '@xmpp/xml';
import { MessageManager } from '../../../features/messaging/messages';
import {
    FileNamespaces,
    MessageNamespaces,
} from '../../../constants/namespaces';
import { FileUploadSlot } from '../../../types/files';

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

describe('MessageManager', () => {
    let messageManager: MessageManager;

    beforeEach(() => {
        messageManager = new MessageManager();
    });

    describe('createChatMessage', () => {
        it('should create a basic chat message', () => {
            const message = messageManager.createChatMessage(
                'user@example.com',
                'Hello',
            );

            expect(message.attrs.to).toBe('user@example.com');
            expect(message.attrs.type).toBe('chat');
            expect(message.attrs.id).toBe('mock-uuid');
            expect(message.getChildText('body')).toBe('Hello');
        });

        it('should create a message with thread information', () => {
            const message = messageManager.createChatMessage(
                'user@example.com',
                'Hello',
                {
                    thread: { id: 'thread-1', parent: 'parent-1' },
                },
            );

            const threadElement = message.getChild('thread');
            expect(threadElement?.children[0]).toBe('thread-1');
            expect(threadElement?.attrs.parent).toBe('parent-1');
        });

        it('should create a message with delay information', () => {
            const delay = new Date('2024-01-01T00:00:00Z');
            const message = messageManager.createChatMessage(
                'user@example.com',
                'Hello',
                {
                    delay,
                },
            );

            const delayElement = message.getChild('delay');
            expect(delayElement?.attrs.xmlns).toBe(MessageNamespaces.DELAY);
            expect(delayElement?.attrs.stamp).toBe(delay.toISOString());
        });

        it('should create a message with correction information', () => {
            const message = messageManager.createChatMessage(
                'user@example.com',
                'Hello',
                {
                    replacesId: 'original-msg-id',
                },
            );

            const replaceElement = message.getChild('replace');
            expect(replaceElement?.attrs.xmlns).toBe(MessageNamespaces.REPLACE);
            expect(replaceElement?.attrs.id).toBe('original-msg-id');
        });
    });

    describe('createAttachmentMessage', () => {
        const mockFile = {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
        } as File;

        const mockUploadSlot: FileUploadSlot = {
            getUrl: 'http://example.com/get',
            putUrl: 'http://example.com/put',
            putHeaders: { 'Content-Type': 'application/pdf' },
            getHeaders: { Accept: 'application/pdf' },
        };

        it('should create a message with file attachment', () => {
            const message = messageManager.createAttachmentMessage(
                'user@example.com',
                'Check this file',
                mockFile,
                mockUploadSlot,
            );

            expect(message.attrs.to).toBe('user@example.com');
            expect(message.attrs.type).toBe('chat');
            expect(message.getChildText('body')).toBe('Check this file');

            const x = message.getChild('x');
            expect(x?.attrs.xmlns).toBe(FileNamespaces.HTTP_UPLOAD);

            const fileElement = x?.getChild('file');
            expect(fileElement?.attrs.name).toBe('test.pdf');
            expect(fileElement?.attrs.size).toBe('1024');
            expect(fileElement?.attrs.type).toBe('application/pdf');
            expect(fileElement?.attrs.url).toBe('http://example.com/get');
        });

        it('should use filename as body when body is empty', () => {
            const message = messageManager.createAttachmentMessage(
                'user@example.com',
                '',
                mockFile,
                mockUploadSlot,
            );

            expect(message.getChildText('body')).toBe('test.pdf');
        });
    });

    describe('parsePresence', () => {
        it('should parse a presence stanza', () => {
            const stanza = new Element('presence', {
                from: 'user@example.com',
                type: 'available',
            });

            const presence = messageManager.parsePresence(stanza);
            expect(presence).toEqual({
                type: 'presence',
                from: 'user@example.com',
                status: 'available',
            });
        });

        it('should return null for non-presence stanza', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
            });

            const presence = messageManager.parsePresence(stanza);
            expect(presence).toBeNull();
        });
    });

    describe('parseMessage', () => {
        it('should parse a chat message', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
                to: 'recipient@example.com',
                id: 'msg-1',
            });
            const body = new Element('body');
            body.children.push('Hello');
            stanza.children.push(body);

            const message = messageManager.parseMessage(stanza);
            expect(message).toMatchObject({
                type: 'chat',
                from: 'user@example.com',
                to: 'recipient@example.com',
                id: 'msg-1',
                body: 'Hello',
            });
        });

        it('should parse a file message', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
                to: 'recipient@example.com',
                id: 'msg-1',
            });

            const body = new Element('body');
            body.children.push('Check this file');

            const x = new Element('x', { xmlns: FileNamespaces.HTTP_UPLOAD });
            const file = new Element('file', {
                name: 'test.pdf',
                size: '1024',
                type: 'application/pdf',
                url: 'http://example.com/get',
            });

            x.children.push(file);
            stanza.children.push(body, x);

            const message = messageManager.parseMessage(stanza);
            expect(message).toMatchObject({
                type: 'file',
                from: 'user@example.com',
                to: 'recipient@example.com',
                id: 'msg-1',
                body: 'Check this file',
                fileName: 'test.pdf',
                fileSize: '1024',
                mimeType: 'application/pdf',
                fileUrl: 'http://example.com/get',
            });
        });

        it('should handle stanza-id in messages', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
                to: 'recipient@example.com',
                id: 'msg-1',
            });
            const stanzaId = new Element('stanza-id', { id: 'stanza-1' });
            stanza.children.push(stanzaId);

            const message = messageManager.parseMessage(stanza);
            expect(message?.stanza_id).toBe('stanza-1');
        });
    });

    describe('parseReceipt', () => {
        it('should parse a received receipt', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
            });
            const received = new Element('received', {
                xmlns: MessageNamespaces.RECEIPT,
                id: 'msg-1',
            });
            stanza.children.push(received);

            const receipt = messageManager.parseReceipt(stanza);
            expect(receipt).toEqual({
                id: 'msg-1',
                from: 'user@example.com',
                type: 'received',
            });
        });

        it('should parse a displayed receipt', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
            });
            const displayed = new Element('displayed', {
                xmlns: MessageNamespaces.RECEIPT,
                id: 'msg-1',
            });
            stanza.children.push(displayed);

            const receipt = messageManager.parseReceipt(stanza);
            expect(receipt).toEqual({
                id: 'msg-1',
                from: 'user@example.com',
                type: 'displayed',
            });
        });

        it('should return null for non-receipt message', () => {
            const stanza = new Element('message', {
                from: 'user@example.com',
            });

            const receipt = messageManager.parseReceipt(stanza);
            expect(receipt).toBeNull();
        });
    });
});

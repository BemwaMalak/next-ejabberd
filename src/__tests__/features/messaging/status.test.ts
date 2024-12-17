import { Element } from '@xmpp/xml';
import { MessageStatusManager } from '../../../features/messaging/status';
import { ConnectionManager } from '../../../core/connection';
import { MessageNamespaces } from '../../../constants/namespaces';
import { XMPPMessage } from '../../../types/messages';

jest.mock('../../../core/connection');

describe('MessageStatusManager', () => {
    let statusManager: MessageStatusManager;
    let mockConnection: jest.Mocked<ConnectionManager>;
    const mockMessage: XMPPMessage = {
        id: 'msg-1',
        stanza_id: 'stanza-1',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        type: 'chat',
        body: 'Hello',
        time: new Date(),
    };

    beforeEach(() => {
        mockConnection = new ConnectionManager(
            {} as any,
        ) as jest.Mocked<ConnectionManager>;
        statusManager = new MessageStatusManager(mockConnection);
    });

    describe('markAsRead', () => {
        it('should send IQ stanza and read receipt', async () => {
            mockConnection.sendIQ.mockResolvedValue(new Element('iq'));
            mockConnection.sendStanza.mockResolvedValue();

            await statusManager.markAsRead(mockMessage);

            // Verify IQ stanza
            expect(mockConnection.sendIQ).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'iq',
                    attrs: { type: 'set' },
                    children: [
                        expect.objectContaining({
                            name: 'mark-read',
                            attrs: {
                                xmlns: MessageNamespaces.STATUS,
                                id: mockMessage.id,
                                from: mockMessage.from,
                                to: mockMessage.to,
                            },
                        }),
                    ],
                }),
            );

            // Verify read receipt
            expect(mockConnection.sendStanza).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'message',
                    attrs: {
                        id: mockMessage.id,
                        to: mockMessage.from,
                        from: mockMessage.to,
                        type: 'chat',
                    },
                    children: [
                        expect.objectContaining({
                            name: 'displayed',
                            attrs: {
                                xmlns: MessageNamespaces.RECEIPT,
                                id: mockMessage.id,
                            },
                        }),
                    ],
                }),
            );
        });
    });

    describe('markAsDelivered', () => {
        it('should send IQ stanza and delivery receipt', async () => {
            mockConnection.sendIQ.mockResolvedValue(new Element('iq'));
            mockConnection.sendStanza.mockResolvedValue();

            await statusManager.markAsDelivered(mockMessage);

            // Verify IQ stanza
            expect(mockConnection.sendIQ).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'iq',
                    attrs: { type: 'set' },
                    children: [
                        expect.objectContaining({
                            name: 'mark-delivered',
                            attrs: {
                                xmlns: MessageNamespaces.STATUS,
                                id: mockMessage.id,
                                from: mockMessage.from,
                                to: mockMessage.to,
                            },
                        }),
                    ],
                }),
            );

            // Verify delivery receipt
            expect(mockConnection.sendStanza).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'message',
                    attrs: {
                        id: mockMessage.id,
                        to: mockMessage.from,
                        from: mockMessage.to,
                        type: 'chat',
                    },
                    children: [
                        expect.objectContaining({
                            name: 'received',
                            attrs: {
                                xmlns: MessageNamespaces.RECEIPT,
                                id: mockMessage.id,
                            },
                        }),
                    ],
                }),
            );
        });
    });

    describe('getStatus', () => {
        it('should return message status', async () => {
            const mockResponse = new Element('iq');
            const statusElement = new Element('status', {
                delivered: 'true',
                read: 'true',
                timestamp: '1703014813000',
            });
            mockResponse.append(statusElement);
            mockConnection.sendIQ.mockResolvedValue(mockResponse);

            const status = await statusManager.getStatus(
                'msg-1',
                'user@example.com',
            );

            expect(status).toEqual({
                delivered: true,
                read: true,
                timestamp: 1703014813000,
            });

            expect(mockConnection.sendIQ).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'iq',
                    attrs: { type: 'get' },
                    children: [
                        expect.objectContaining({
                            name: 'get-status',
                            attrs: {
                                xmlns: MessageNamespaces.STATUS,
                                id: 'msg-1',
                                jid: 'user@example.com',
                            },
                        }),
                    ],
                }),
            );
        });

        it('should handle invalid response format', async () => {
            mockConnection.sendIQ.mockResolvedValue(new Element('iq'));

            await expect(
                statusManager.getStatus('msg-1', 'user@example.com'),
            ).rejects.toThrow('Invalid response format');
        });
    });

    describe('markMultipleAsRead', () => {
        it('should mark multiple messages as read', async () => {
            mockConnection.sendIQ.mockResolvedValue(new Element('iq'));
            mockConnection.sendStanza.mockResolvedValue();

            const messages = [mockMessage, { ...mockMessage, id: 'msg-2' }];

            await statusManager.markMultipleAsRead(messages);

            expect(mockConnection.sendIQ).toHaveBeenCalledTimes(2);
            expect(mockConnection.sendStanza).toHaveBeenCalledTimes(2);
        });
    });

    describe('markMultipleAsDelivered', () => {
        it('should mark multiple messages as delivered', async () => {
            mockConnection.sendIQ.mockResolvedValue(new Element('iq'));
            mockConnection.sendStanza.mockResolvedValue();

            const messages = [mockMessage, { ...mockMessage, id: 'msg-2' }];

            await statusManager.markMultipleAsDelivered(messages);

            expect(mockConnection.sendIQ).toHaveBeenCalledTimes(2);
            expect(mockConnection.sendStanza).toHaveBeenCalledTimes(2);
        });
    });
});

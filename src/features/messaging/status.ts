import { Element } from '@xmpp/xml';
import { ConnectionManager } from '../../core/connection';
import {
    MessageReadStatus,
    MessageStatusErrorType,
} from '../../types/message_status';
import { XMPPMessage } from '../../types/messages';
import {
    STATUS_NAMESPACE,
    RECEIPT_NAMESPACE,
} from '../../constants/namespaces';

/**
 * Manager class for handling message read status
 */
export class MessageStatusManager {
    constructor(private connection: ConnectionManager) {}

    /**
     * Send a read receipt to the message sender
     * @param message - The message that was read
     */
    private async sendReadReceipt(message: XMPPMessage): Promise<void> {
        const receipt = new Element('message', {
            id: message.id,
            to: message.from,
            from: message.to,
            type: 'chat',
        });

        const displayed = new Element('displayed', {
            xmlns: RECEIPT_NAMESPACE,
            id: message.id,
        });

        receipt.append(displayed);
        await this.connection.sendStanza(receipt);
    }

    /**
     * Send a delivery receipt to the message sender
     * @param message - The message that was delivered
     */
    private async sendDeliveryReceipt(message: XMPPMessage): Promise<void> {
        const receipt = new Element('message', {
            id: message.id,
            to: message.from,
            from: message.to,
            type: 'chat',
        });

        const received = new Element('received', {
            xmlns: RECEIPT_NAMESPACE,
            id: message.id,
        });

        receipt.append(received);
        await this.connection.sendStanza(receipt);
    }

    /**
     * Mark a message as read
     * @param message - The message to mark as read
     * @returns Promise that resolves when the message is marked as read
     */
    public async markAsRead(message: XMPPMessage): Promise<void> {
        const iq = new Element('iq', { type: 'set' });
        const markRead = new Element('mark-read', {
            xmlns: STATUS_NAMESPACE,
            id: message.id,
            from: message.from,
            to: message.to,
        });

        iq.append(markRead);

        try {
            await this.connection.sendIQ(iq);
            await this.sendReadReceipt(message);
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Mark a message as delivered
     * @param message - The message to mark as delivered
     * @returns Promise that resolves when the message is marked as delivered
     */
    public async markAsDelivered(message: XMPPMessage): Promise<void> {
        const iq = new Element('iq', { type: 'set' });
        const markDelivered = new Element('mark-delivered', {
            xmlns: STATUS_NAMESPACE,
            id: message.id,
            from: message.from,
            to: message.to,
        });

        iq.append(markDelivered);

        try {
            await this.connection.sendIQ(iq);
            await this.sendDeliveryReceipt(message);
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Get the read status of a message
     * @param messageId - The ID of the message to check
     * @param jid - The JID of the sender
     * @returns Promise that resolves with the read status
     */
    public async getStatus(
        messageId: string,
        jid: string,
    ): Promise<MessageReadStatus> {
        const iq = new Element('iq', { type: 'get' });
        const statusQuery = new Element('get-status', {
            xmlns: STATUS_NAMESPACE,
            id: messageId,
            jid: jid,
        });
        iq.append(statusQuery);

        try {
            const result = await this.connection.sendIQ(iq);
            const status = result.getChild('status');
            if (status) {
                return {
                    delivered: status.attrs.delivered === 'true',
                    read: status.attrs.read === 'true',
                    timestamp: status.attrs.timestamp
                        ? parseInt(status.attrs.timestamp)
                        : undefined,
                };
            }
            throw new Error('Invalid response format');
        } catch (error: any) {
            if (error.condition === 'item-not-found') {
                return { delivered: false, read: false };
            }
            throw this.handleError(error);
        }
    }

    /**
     * Mark multiple messages as read
     * @param messages - Array of messages to mark as read
     * @returns Promise that resolves when all messages are marked as read
     */
    public async markMultipleAsRead(
        messages: Array<XMPPMessage>,
    ): Promise<void> {
        await Promise.all(messages.map((message) => this.markAsRead(message)));
    }

    /**
     * Mark multiple messages as delivered
     * @param messages - Array of messages to mark as delivered
     * @returns Promise that resolves when all messages are marked as delivered
     */
    public async markMultipleAsDelivered(
        messages: Array<XMPPMessage>,
    ): Promise<void> {
        await Promise.all(
            messages.map((message) => this.markAsDelivered(message)),
        );
    }

    /**
     * Handle errors from the server
     */
    private handleError(error: any): Error {
        let errorType: MessageStatusErrorType = 'server_error';
        let message = error.message || 'Unknown error';

        if (error.condition) {
            switch (error.condition) {
                case 'item-not-found':
                    errorType = 'not_found';
                    message = 'Message status not found';
                    break;
                case 'forbidden':
                    errorType = 'unauthorized';
                    message = 'Not authorized to access message status';
                    break;
                case 'bad-request':
                    if (message.includes('jid')) {
                        errorType = 'invalid_jid';
                        message = 'Invalid JID format';
                    } else {
                        errorType = 'invalid_id';
                        message = 'Invalid message ID';
                    }
                    break;
            }
        }

        const err = new Error(message);
        err.name = errorType;
        return err;
    }
}

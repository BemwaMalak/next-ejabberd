import { Element } from '@xmpp/xml';
import { ConnectionManager } from './core/connection';
import { XMPPEventEmitter } from './core/events';
import { MessageManager } from './features/messaging/messages';
import { AttachmentManager } from './features/messaging/attachments';
import { MAMHandler } from './features/mam/handlers';
import { MAMQueryBuilder } from './features/mam/queries';
import { ConnectionState, ConnectionConfig } from './types/connection';
import { MessageOptions, XMPPMessage } from './types/messages';
import { XMPPError } from './types/events';
import { MAMQueryOptions } from './types/mam';
import { MessageStatusManager } from './features/messaging/status';
import { MessageReadStatus } from './types/message_status';
import { IXMPPClient } from './interfaces/client';

export class EjabberdClient extends XMPPEventEmitter implements IXMPPClient {
    private connection: ConnectionManager;
    private messages: MessageManager;
    private attachments: AttachmentManager;
    private mam: MAMHandler;
    private mamQueries: MAMQueryBuilder;
    private messageStatus: MessageStatusManager;

    constructor(config: ConnectionConfig) {
        super();

        this.connection = new ConnectionManager(config);
        this.messages = new MessageManager();
        this.attachments = new AttachmentManager(
            config.attachmentConfig || {
                uploadEndpoint: `https://${config.domain}/upload`, // Default upload endpoint based on service
                maxFileSize: 10 * 1024 * 1024, // 10MB default
            },
            this.connection,
        );
        this.mam = new MAMHandler();
        this.mamQueries = new MAMQueryBuilder();
        this.messageStatus = new MessageStatusManager(this.connection);

        this.setupEventHandlers();
        this.connection.connect().catch((err) => {
            this.emit('error', {
                code: 'CONNECTION_ERROR',
                message: err.message,
                type: 'cancel',
            } as XMPPError);
        });
    }

    /**
     * Check if a stanza is a MAM-related stanza (result or fin)
     */
    private isMAMStanza(stanza: Element): boolean {
        return !!(
            stanza.getChild('result', 'urn:xmpp:mam:2') ||
            stanza.getChild('fin', 'urn:xmpp:mam:2')
        );
    }

    private isMessageStanza(stanza: Element): boolean {
        return stanza.name === 'message';
    }

    private isRecieptStanza(stanza: Element): boolean {
        return (
            stanza.name === 'message' &&
            !!(stanza.getChild('displayed') || stanza.getChild('received'))
        );
    }

    /**
     * Handle a MAM-related stanza (result or fin)
     */
    private handleMAMStanza(stanza: Element): void {
        const mamResult = this.mam.parseResult(stanza);
        if (mamResult) {
            Promise.all(
                mamResult.messages.map(async (message) => {
                    const status = await this.getMessageStatus(
                        message.id,
                        message.from,
                    );
                    message.readStatus = status;
                }),
            ).then(() => {
                this.emit('mamResult', mamResult);
            });
        }
    }

    /**
     * Handle a regular message stanza
     */
    private handleMessageStanza(stanza: Element): void {
        const message = this.messages.parseMessage(stanza);
        if (message) {
            this.getMessageStatus(message.id, message.from).then((status) => {
                message.readStatus = status;
                this.emit('message', message);
            });
        }
    }

    private handleReceiptStanza(stanza: Element): void {
        const receipt = this.messages.parseReceipt(stanza);
        if (receipt) {
            this.emit('receipt', receipt);
        }
    }

    /**
     * Setup event handlers for the client
     */
    private setupEventHandlers(): void {
        // Connection events
        this.connection.on('status', (status: ConnectionState) => {
            this.emit('status', status);
        });

        this.connection.on('error', (err: Error) => {
            this.emit('error', {
                code: 'UNKNOWN',
                message: err.message,
                type: 'cancel',
            } as XMPPError);
        });

        // Message events
        this.connection.on('stanza', async (stanza: Element) => {
            // Handle presence stanzas
            if (stanza.name === 'presence') {
                const presence = this.messages.parsePresence(stanza);
                if (presence) {
                    this.emit('presence', presence);
                }
                return;
            }

            // Handle messages
            if (stanza.name === 'message' || stanza.name === 'iq') {
                if (this.isMAMStanza(stanza)) {
                    this.handleMAMStanza(stanza);
                } else if (this.isRecieptStanza(stanza)) {
                    this.handleReceiptStanza(stanza);
                } else if (this.isMessageStanza(stanza)) {
                    this.handleMessageStanza(stanza);
                }
                return;
            }
        });
    }

    /**
     * Connect to the XMPP server
     */
    public async connect(): Promise<void> {
        await this.connection.connect();
    }

    /**
     * Disconnect from the XMPP server
     */
    public async disconnect(): Promise<void> {
        await this.connection.disconnect();
    }

    /**
     * Send a chat message
     */
    public async sendMessage(
        to: string,
        body: string,
        options?: MessageOptions,
    ): Promise<void> {
        const message = this.messages.createChatMessage(to, body, options);
        await this.connection.sendStanza(message);
    }

    /**
     * Upload a file attachment
     */
    public async sendAttachment(
        to: string,
        body: string,
        file: File,
    ): Promise<void> {
        const uploadSlot = await this.attachments.uploadFile(file);
        const message = this.messages.createAttachmentMessage(
            to,
            body,
            file,
            uploadSlot,
        );
        await this.connection.sendStanza(message);
    }

    /**
     * Query message archive
     */
    public async queryArchive(options: MAMQueryOptions): Promise<void> {
        const client = this.connection.getClient();
        if (!client) {
            throw new Error('Client is not connected');
        }
        const query = this.mamQueries.createQuery(options);
        await this.mam.sendQuery(client, query);
    }

    public async broadcastPresence(
        type: 'available' | 'unavailable',
    ): Promise<void> {
        await this.connection.broadcastPresence(type);
    }

    /**
     * Request presence subscription from a contact
     */
    public async subscribeToPresence(jid: string): Promise<void> {
        await this.connection.subscribeToPresence(jid);
    }

    /**
     * Probe for current presence status
     */
    public async probePresence(jid: string): Promise<void> {
        await this.connection.probePresence(jid);
    }

    /**
     * Accept a presence subscription request
     */
    public async acceptSubscription(jid: string): Promise<void> {
        await this.connection.acceptSubscription(jid);
    }

    /**
     * Get current connection status
     */
    public getStatus(): ConnectionState {
        return this.connection.getStatus();
    }

    /**
     * Get current user's JID
     */
    public getUserJID(): string | null {
        return this.connection.getUserJID();
    }

    /**
     * Mark a message as read
     * @param message - The message to mark as read
     */
    public async markMessageAsRead(message: XMPPMessage): Promise<void> {
        try {
            await this.messageStatus.markAsRead(message);
            this.emit('message:read', {
                messageId: message.id,
                fromJid: message.from,
                toJid: message.to,
            });
        } catch (error: any) {
            this.emit('message:read:error', {
                code: error.name,
                message: error.message,
                type: 'cancel',
            } as XMPPError);
            throw error;
        }
    }

    /**
     * Mark a message as delivered
     * @param message - The message to mark as delivered
     */
    public async markMessageAsDelivered(message: XMPPMessage): Promise<void> {
        try {
            await this.messageStatus.markAsDelivered(message);
            this.emit('message:delivered', {
                messageId: message.id,
                fromJid: message.from,
                toJid: message.to,
            });
        } catch (error: any) {
            this.emit('message:delivered:error', {
                code: error.name,
                message: error.message,
                type: 'cancel',
            } as XMPPError);
            throw error;
        }
    }

    /**
     * Get the read status of a message
     * @param messageId - ID of the message to check
     * @param jid - JID of the sender
     */
    public async getMessageStatus(
        messageId: string,
        jid: string,
    ): Promise<MessageReadStatus> {
        return this.messageStatus.getStatus(messageId, jid);
    }

    /**
     * Mark multiple messages as read
     * @param messages - Array of messages to mark as read
     */
    public async markMultipleMessagesAsRead(
        messages: Array<XMPPMessage>,
    ): Promise<void> {
        try {
            await this.messageStatus.markMultipleAsRead(messages);
            messages.forEach((message) => {
                this.emit('message:read', {
                    messageId: message.id,
                    fromJid: message.from,
                    toJid: message.to,
                });
            });
        } catch (error: any) {
            this.emit('message:read:error', {
                code: error.name,
                message: error.message,
                type: 'cancel',
            } as XMPPError);
            throw error;
        }
    }

    /**
     * Mark multiple messages as delivered
     * @param messages - Array of messages to mark as delivered
     */
    public async markMultipleMessagesAsDelivered(
        messages: Array<XMPPMessage>,
    ): Promise<void> {
        try {
            await this.messageStatus.markMultipleAsDelivered(messages);
            messages.forEach((message) => {
                this.emit('message:delivered', {
                    messageId: message.id,
                    fromJid: message.from,
                    toJid: message.to,
                });
            });
        } catch (error: any) {
            this.emit('message:delivered:error', {
                code: error.name,
                message: error.message,
                type: 'cancel',
            } as XMPPError);
            throw error;
        }
    }
}

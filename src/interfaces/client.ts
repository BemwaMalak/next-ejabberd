import { ConnectionState } from '../types/connection';
import { MessageOptions, XMPPMessage } from '../types/messages';
import { MAMQueryOptions } from '../types/mam';
import { MessageReadStatus } from '../types/message_status';
import { XMPPError } from '../types/events';

/**
 * Event types that can be emitted by the XMPP client
 */
export interface ClientEvents {
    status: (status: ConnectionState) => void;
    error: (error: XMPPError) => void;
    message: (message: XMPPMessage) => void;
    presence: (presence: XMPPMessage) => void;
    receipt: (receipt: { id: string; type: 'received' | 'displayed' }) => void;
    mamResult: (result: { messages: XMPPMessage[]; complete: boolean }) => void;
    'message:read': (data: {
        messageId: string;
        fromJid: string;
        toJid: string;
    }) => void;
    'message:delivered': (data: {
        messageId: string;
        fromJid: string;
        toJid: string;
    }) => void;
    'message:read:error': (error: XMPPError) => void;
    'message:delivered:error': (error: XMPPError) => void;
}

/**
 * Interface for the XMPP client
 * Implements XEP-0363 (HTTP File Upload)
 * Implements XEP-0313 (Message Archive Management)
 * Implements XEP-0184 (Message Delivery Receipts)
 */
export interface IXMPPClient {
    /**
     * Connection Management
     */
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getStatus(): ConnectionState;
    getUserJID(): string | null;

    /**
     * Messaging
     */
    sendMessage(
        to: string,
        body: string,
        options?: MessageOptions,
    ): Promise<void>;
    sendAttachment(to: string, body: string, file: File): Promise<void>;

    /**
     * Message Archive Management (MAM)
     */
    queryArchive(options: MAMQueryOptions): Promise<void>;

    /**
     * Presence Management
     */
    broadcastPresence(type: 'available' | 'unavailable'): Promise<void>;
    subscribeToPresence(jid: string): Promise<void>;
    probePresence(jid: string): Promise<void>;
    acceptSubscription(jid: string): Promise<void>;

    /**
     * Message Status Management
     */
    markMessageAsRead(message: XMPPMessage): Promise<void>;
    markMessageAsDelivered(message: XMPPMessage): Promise<void>;
    getMessageStatus(
        messageId: string,
        jid: string,
    ): Promise<MessageReadStatus>;
    markMultipleMessagesAsRead(messages: XMPPMessage[]): Promise<void>;
    markMultipleMessagesAsDelivered(messages: XMPPMessage[]): Promise<void>;
}

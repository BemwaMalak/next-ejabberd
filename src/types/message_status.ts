/**
 * Message read status interface
 */
export interface MessageReadStatus {
    delivered: boolean;
    read: boolean;
    timestamp?: number;
}

/**
 * Message status request interface
 */
export interface MessageStatusRequest {
    messageId: string;
    fromJid: string;
    toJid: string;
}

/**
 * Message status events
 */
export enum MessageStatusEvent {
    READ = 'message:read',
    READ_ACK = 'message:read:ack',
    READ_ERROR = 'message:read:error',
}

/**
 * Message status error types
 */
export type MessageStatusErrorType =
    | 'not_found' // Message status not found
    | 'unauthorized' // Not authorized to access status
    | 'server_error' // Internal server error
    | 'invalid_id' // Invalid message ID
    | 'invalid_jid'; // Invalid JID format

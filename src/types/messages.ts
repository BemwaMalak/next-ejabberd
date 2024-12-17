import { MessageReadStatus } from './message_status';

export interface BaseMessage {
    id: string;
    stanza_id: string;
    from: string;
    to: string;
    time: Date;
    readStatus?: MessageReadStatus;
}

export interface ChatMessage extends BaseMessage {
    type: 'chat';
    body: string;
}

export interface FileMessage extends BaseMessage {
    type: 'file';
    body: string;
    fileUrl: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
}

export interface GroupChatMessage extends BaseMessage {
    type: 'groupchat';
    body: string;
    roomJid: string;
    nickname: string;
}

export interface PresenceMessage {
    type: 'presence';
    from: string;
    status: 'available' | 'unavailable';
}

export type XMPPMessage = ChatMessage | FileMessage | GroupChatMessage;

export interface ThreadInfo {
    id: string;
    parent?: string;
}

export interface MessageOptions {
    id?: string;
    thread?: ThreadInfo;
    requestReceipt?: boolean;
    requestMarkable?: boolean;
    priority?: 'high' | 'medium' | 'low';
    delay?: Date;
    replacesId?: string;
}

export interface MessageReceipt {
    from: string;
    id: string;
    type: DeliveryStatus;
}
export type DeliveryStatus = 'received' | 'displayed';

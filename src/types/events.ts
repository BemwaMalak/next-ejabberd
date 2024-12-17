import { Element } from '@xmpp/xml';
import {
    XMPPMessage,
    ChatMessage,
    GroupChatMessage,
    FileMessage,
    PresenceMessage,
} from './messages';
import { ConnectionState } from './connection';
import { MAMResult } from './mam';

export type CompositionState = 'active' | 'paused' | 'gone' | 'inactive';

export interface XMPPError {
    code: string;
    message: string;
    type: 'auth' | 'cancel' | 'continue' | 'modify' | 'wait';
}

export interface ChatStateEvent {
    state: CompositionState;
}

export interface ReceiptEvent {
    from: string;
    id: string;
    type: 'received' | 'displayed' | 'failed';
}

export interface MessageReadEvent {
    messageId: string;
    fromJid: string;
    toJid: string;
}

export interface XMPPEvents {
    status: ConnectionState;
    error: XMPPError;
    stanza: Element;
    'stanza:error': Element;
    'stanza:sent': Element;
    message: XMPPMessage;
    'message:chat': ChatMessage;
    'message:groupchat': GroupChatMessage;
    'message:file': FileMessage;
    'message:error': XMPPError;
    'message:read': MessageReadEvent;
    'message:delivered': MessageReadEvent;
    'message:read:error': XMPPError;
    'message:delivered:error': XMPPError;
    chatState: ChatStateEvent;
    receipt: ReceiptEvent;
    presence: PresenceMessage;
    'presence:available': PresenceMessage;
    'presence:unavailable': PresenceMessage;
    'presence:error': XMPPError;
    'room:join': { roomJid: string; nickname: string };
    'room:leave': { roomJid: string; nickname: string };
    'room:error': { roomJid: string; error: XMPPError };
    'roster:update': {
        jid: string;
        subscription: 'none' | 'to' | 'from' | 'both';
    };
    'roster:error': XMPPError;
    mamResult: MAMResult;
}

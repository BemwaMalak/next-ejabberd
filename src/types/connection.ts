import { Element } from '@xmpp/xml';
import { UploadConfig } from './files';

/**
 * Configuration for XMPP connection
 */
export interface ConnectionConfig {
    service: string;
    domain: string;
    username: string;
    password: string;
    resource?: string;
    timeout?: number;
    attachmentConfig?: UploadConfig;
}

/**
 * Connection states
 */
export type ConnectionState =
    | 'online'
    | 'offline'
    | 'connecting'
    | 'connected'
    | 'authenticating'
    | 'authenticated'
    | 'disconnecting'
    | 'disconnected'
    | 'error';

/**
 * Connection events
 */
export interface ConnectionEvents {
    status: (status: ConnectionState) => void;
    error: (error: ConnectionError) => void;
    online: () => void;
    offline: () => void;
    stanza: (stanza: Element) => void;
}

/**
 * Connection error
 */
export class ConnectionError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
    ) {
        super(message);
        this.name = 'ConnectionError';
    }
}

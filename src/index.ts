// Core exports
export { EjabberdClient } from './client';
export { ConnectionManager } from './core/connection';

// Utils exports
export { JIDUtils } from './utils/jid';

// Type exports
export type {
    ConnectionConfig,
    ConnectionState,
    ConnectionError,
} from './types/connection';
export type {
    XMPPError,
    CompositionState,
    ChatStateEvent,
    ReceiptEvent,
} from './types/events';
export type {
    XMPPMessage,
    ChatMessage,
    GroupChatMessage,
    FileMessage,
    MessageOptions,
    DeliveryStatus,
    PresenceMessage,
} from './types/messages';
export type {
    MAMQueryOptions,
    MAMResult,
    MAMFilterOptions,
    RSMOptions,
} from './types/mam';

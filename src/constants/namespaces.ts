/**
 * XMPP Protocol Namespaces
 * This file contains all the XMPP protocol namespace constants used in the package.
 * Organized by feature/functionality for better maintainability.
 */

/**
 * Message Archive Management (MAM) related namespaces
 * Used for message history and archiving functionality
 */
export const MAMNamespaces = {
    /** Message Archive Management v2 */
    MAM: 'urn:xmpp:mam:2',
    /** Result Set Management for pagination */
    RSM: 'http://jabber.org/protocol/rsm',
    /** Data Forms for querying */
    DATAFORM: 'jabber:x:data',
} as const;

/**
 * Messaging related namespaces
 * Core messaging functionality including corrections, receipts, and status
 */
export const MessageNamespaces = {
    /** Message delay/timestamp information */
    DELAY: 'urn:xmpp:delay',
    /** Message correction/editing */
    REPLACE: 'urn:xmpp:message-correct:0',
    /** Message delivery receipts */
    RECEIPT: 'urn:xmpp:receipts',
    /** Message status notifications */
    STATUS: 'urn:xmpp:message-status:0',
} as const;

/**
 * File handling related namespaces
 * Used for file upload and transfer functionality
 */
export const FileNamespaces = {
    /** HTTP File Upload */
    HTTP_UPLOAD: 'urn:xmpp:http:upload:0',
} as const;

import { Element } from '@xmpp/xml';
import { v4 as uuidv4 } from 'uuid';
import {
    XMPPMessage,
    MessageOptions,
    ThreadInfo,
    PresenceMessage,
    MessageReceipt,
    DeliveryStatus,
} from '../../types/messages';
import { FileNamespaces, MessageNamespaces } from '../../constants/namespaces';
import { FileUploadSlot } from '../../types/files';

/**
 * Message manager class for handling XMPP messages
 */
export class MessageManager {
    /**
     * Creates a basic message element
     */
    private createBasicMessage(
        to: string,
        type: 'chat' | 'groupchat',
        options: MessageOptions = {},
    ): Element {
        const message = new Element('message', {
            to,
            type,
            id: options.id || uuidv4(),
        });

        // Add thread information if provided
        if (options.thread) {
            const threadElement = new Element('thread');
            threadElement.children.push(options.thread.id);
            if (options.thread.parent) {
                threadElement.attrs.parent = options.thread.parent;
            }
            message.children.push(threadElement);
        }

        // Add priority if specified
        if (options.priority) {
            message.attrs.priority = options.priority;
        }

        // Add delay information if provided
        if (options.delay) {
            const delay = new Element('delay', {
                xmlns: MessageNamespaces.DELAY,
                stamp: options.delay.toISOString(),
            });
            message.children.push(delay);
        }

        // Add message correction if needed
        if (options.replacesId) {
            const replace = new Element('replace', {
                xmlns: MessageNamespaces.REPLACE,
                id: options.replacesId,
            });
            message.children.push(replace);
        }

        return message;
    }

    /**
     * Creates a chat message
     */
    public createChatMessage(
        to: string,
        body: string,
        options: MessageOptions = {},
    ): Element {
        const message = this.createBasicMessage(to, 'chat', options);

        // Add message body
        const bodyElement = new Element('body');
        bodyElement.children.push(body);
        message.children.push(bodyElement);

        return message;
    }

    public createAttachmentMessage(
        to: string,
        body: string,
        file: File,
        uploadSlot: FileUploadSlot,
    ): Element {
        const message = this.createBasicMessage(to, 'chat');

        // Add message body
        const bodyElement = new Element('body');
        if (body == '') {
            body = file.name;
        }
        bodyElement.children.push(body);
        const x = new Element('x', {
            xmlns: FileNamespaces.HTTP_UPLOAD,
        });

        const fileElement = new Element('file');
        fileElement.attrs.name = file.name;
        fileElement.attrs.size = file.size.toString();
        fileElement.attrs.type = file.type;
        fileElement.attrs.url = uploadSlot.getUrl;
        x.children.push(fileElement);

        message.children.push(bodyElement);
        message.children.push(x);

        return message;
    }

    /**
     * Parse a presence stanza
     */
    public parsePresence(stanza: Element): PresenceMessage | null {
        try {
            if (stanza.name !== 'presence') {
                return null;
            }

            return {
                type: 'presence',
                from: stanza.attrs.from,
                status: stanza.attrs.type,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Parses a message stanza
     */
    public parseMessage(stanza: Element): XMPPMessage | null {
        try {
            const body = stanza.getChildText('body') || '';
            const stanza_id = stanza.getChild('stanza-id')?.attrs.id;

            const baseMessage = {
                id: stanza.attrs.id,
                stanza_id: stanza_id,
                from: stanza.attrs.from,
                to: stanza.attrs.to,
                time: new Date(),
            };

            // Check for file attachment
            const x = stanza.getChild('x', FileNamespaces.HTTP_UPLOAD);
            if (x) {
                const fileElement = x.getChild('file');
                if (fileElement) {
                    return {
                        ...baseMessage,
                        type: 'file',
                        body,
                        fileName: fileElement.attrs.name,
                        fileSize: fileElement.attrs.size,
                        mimeType: fileElement.attrs.type,
                        fileUrl: fileElement.attrs.url,
                    };
                }
            }

            // Handle regular chat messages
            return {
                ...baseMessage,
                type: 'chat',
                body,
            };
        } catch (error) {
            console.error('Error parsing message:', error);
            return null;
        }
    }

    public parseReceipt(stanza: Element): MessageReceipt | null {
        try {
            const received = stanza.getChild(
                'received',
                MessageNamespaces.RECEIPT,
            );
            const displayed = stanza.getChild(
                'displayed',
                MessageNamespaces.RECEIPT,
            );

            const receipt = received || displayed;
            if (!receipt) return null;

            return {
                id: receipt.attrs.id,
                from: stanza.attrs.from,
                type: receipt.name as DeliveryStatus,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Gets the thread information from a message
     */
    public getThreadInfo(stanza: Element): ThreadInfo | null {
        const threadElement = stanza.getChild('thread');
        if (!threadElement) return null;

        return {
            id: threadElement.children[0]?.toString() || '',
            parent: threadElement.attrs.parent,
        };
    }

    /**
     * Gets the message being replaced
     */
    public getReplacedMessageId(stanza: Element): string | null {
        const replace = stanza.getChild('replace', MessageNamespaces.REPLACE);
        return replace?.attrs.id || null;
    }

    /**
     * Gets the delay timestamp if present
     */
    public getDelayTimestamp(stanza: Element): Date | null {
        const delay = stanza.getChild('delay', MessageNamespaces.DELAY);
        return delay ? new Date(delay.attrs.stamp) : null;
    }
}

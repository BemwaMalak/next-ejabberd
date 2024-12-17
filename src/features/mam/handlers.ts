import { Element } from '@xmpp/xml';
import { ChatMessage, FileMessage, XMPPMessage } from '../../types/messages';
import { MAMResult } from '../../types/mam';
import { Client } from '@xmpp/client';
import {
    HTTP_UPLOAD_NAMESPACE,
    MAM_NAMESPACE,
    RSM_NAMESPACE,
} from '../../constants/namespaces';

export class MAMHandler {
    private messageCollections: Map<string, XMPPMessage[]> = new Map();

    /**
     * Parses a MAM result stanza and returns a complete result only when all messages are received
     */
    public parseResult(stanza: Element): MAMResult | null {
        try {
            const resultChild = stanza.getChild('result', MAM_NAMESPACE);
            if (resultChild) {
                const queryId = resultChild.attrs.queryid;
                const message = this.parseForwardedMessage(resultChild);

                if (!message || !queryId) return null;

                // Store the message in the collection
                if (!this.messageCollections.has(queryId)) {
                    this.messageCollections.set(queryId, []);
                }
                this.messageCollections.get(queryId)?.push(message);

                // Don't emit result yet, just return null
                return null;
            }

            const fin = stanza.getChild('fin', MAM_NAMESPACE);
            if (!fin) return null;

            const queryId = stanza.attrs.id;
            const messages = this.messageCollections.get(queryId) || [];

            // Clear the collection
            this.messageCollections.delete(queryId);

            const result: MAMResult = {
                queryId,
                complete: fin.attrs.complete === 'true',
                messages,
            };

            // Parse RSM information
            const set = fin.getChild('set', RSM_NAMESPACE);
            if (set) {
                const first = set.getChildText('first');
                const last = set.getChildText('last');
                const count = set.getChildText('count');

                result.rsm = {
                    first: first || undefined,
                    last: last || undefined,
                    count: count ? parseInt(count, 10) : undefined,
                };
            }

            return result;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parses a forwarded message from MAM results
     */
    public parseForwardedMessage(stanza: Element): XMPPMessage | null {
        try {
            const forwarded = stanza.getChild(
                'forwarded',
                'urn:xmpp:forward:0',
            );
            if (!forwarded) return null;

            const message = forwarded.getChild('message');
            if (!message) return null;

            const delay = forwarded.getChild('delay', 'urn:xmpp:delay');
            const timestamp = delay ? new Date(delay.attrs.stamp) : new Date();
            const stanza_id = message.getChild('stanza-id')?.attrs.id;

            const baseMessage = {
                id: message.attrs.id,
                stanza_id: stanza_id,
                from: message.attrs.from,
                to: message.attrs.to,
                time: timestamp,
            };

            // Handle different message types
            const body = message.getChildText('body') || '';

            // Check for file message
            const x = message.getChild('x', HTTP_UPLOAD_NAMESPACE);
            const fileElement = x?.getChild('file');

            if (fileElement) {
                const fileUrl = fileElement?.attrs.url;
                const fileName = fileElement?.attrs.name;
                const fileSize = fileElement?.attrs.size;
                const mimeType = fileElement?.attrs.type;

                const fileMessage: FileMessage = {
                    ...baseMessage,
                    type: 'file',
                    body: body,
                    fileUrl: fileUrl,
                    fileName: fileName,
                    fileSize: fileSize,
                    mimeType: mimeType,
                };
                return fileMessage;
            }

            // Default to regular chat message
            const chatMessage: ChatMessage = {
                ...baseMessage,
                type: 'chat',
                body,
            };
            return chatMessage;
        } catch (error) {
            return null;
        }
    }

    /**
     * Sends a MAM query to the XMPP server
     */
    public async sendQuery(client: Client, query: Element): Promise<void> {
        await client.send(query);
    }
}

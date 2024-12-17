import { Element } from '@xmpp/xml';
import { FileUploadSlot, FileUploadError } from '../../types/files';
import { FileNamespaces } from '../../constants/namespaces';

/**
 * Error messages for file handling operations
 */
const ERROR_MESSAGES = {
    INVALID_RESPONSE: 'Invalid upload slot response',
    MISSING_SLOT: 'Missing slot element in response',
    MISSING_URLS: 'Missing PUT or GET URLs in slot response',
} as const;

/**
 * Handles XMPP file upload related operations
 * Implements XEP-0363: HTTP File Upload
 */
export class FileHandler {
    /**
     * Parse headers from a slot element
     * @param element - The XML element containing headers
     * @returns Record of header name-value pairs
     */
    private parseHeaders(element: Element): Record<string, string> {
        const headers: Record<string, string> = {};
        const headerElements = element.getChildren('header');

        if (!headerElements) {
            return headers;
        }

        for (const header of headerElements) {
            const name = header.attrs.name;
            const value = header.text();

            if (name && value) {
                headers[name] = value;
            }
        }

        return headers;
    }

    /**
     * Validates a slot element from an upload response
     * @param slot - The slot element to validate
     * @throws {FileUploadError} If the slot is invalid
     */
    private validateSlot(slot: Element | undefined): void {
        if (!slot) {
            throw new FileUploadError(ERROR_MESSAGES.MISSING_SLOT);
        }

        const put = slot.getChild('put');
        const get = slot.getChild('get');

        if (!put?.attrs.url || !get?.attrs.url) {
            throw new FileUploadError(ERROR_MESSAGES.MISSING_URLS);
        }
    }

    /**
     * Extract URLs and headers from a valid slot element
     * @param slot - The validated slot element
     * @returns FileUploadSlot containing URLs and headers
     */
    private extractSlotData(slot: Element): FileUploadSlot {
        const put = slot.getChild('put')!;
        const get = slot.getChild('get')!;

        return {
            putUrl: put.attrs.url,
            getUrl: get.attrs.url,
            putHeaders: this.parseHeaders(put),
            getHeaders: this.parseHeaders(get),
        };
    }

    /**
     * Parse an upload slot response stanza
     * @param stanza - The response stanza to parse
     * @returns FileUploadSlot if successful
     * @throws {FileUploadError} If the response is invalid
     */
    public parseUploadSlotResponse(stanza: Element): FileUploadSlot {
        if (!stanza.is('iq') || stanza.attrs.type !== 'result') {
            throw new FileUploadError(ERROR_MESSAGES.INVALID_RESPONSE);
        }

        const slot = stanza.getChild('slot', FileNamespaces.HTTP_UPLOAD);
        this.validateSlot(slot);

        return this.extractSlotData(slot!);
    }

    /**
     * Check if a stanza is a valid upload slot response
     * @param stanza - The stanza to check
     * @returns boolean indicating if the stanza is a valid upload slot response
     */
    public isUploadSlotResponse(stanza: Element): boolean {
        try {
            const slot = stanza.getChild('slot', FileNamespaces.HTTP_UPLOAD);
            return (
                stanza.is('iq') &&
                stanza.attrs.type === 'result' &&
                !!slot?.getChild('put')?.attrs.url &&
                !!slot?.getChild('get')?.attrs.url
            );
        } catch {
            return false;
        }
    }
}

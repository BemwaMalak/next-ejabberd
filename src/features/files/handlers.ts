import { Element } from '@xmpp/xml';
import { FileUploadSlot } from '../../types/files';
import { HTTP_UPLOAD_NAMESPACE } from '../../constants/namespaces';

export class FileHandler {
    /**
     * Parse headers from a slot element
     */
    private parseHeaders(element: Element): Record<string, string> {
        const headers: Record<string, string> = {};
        const headerElements = element.getChildren('header');

        headerElements?.forEach((header: Element) => {
            const name = header.attrs.name;
            const value = header.text();
            if (name && value) {
                headers[name] = value;
            }
        });

        return headers;
    }

    /**
     * Parse an upload slot response stanza
     */
    public parseUploadSlotResponse(
        stanza: Element,
    ): FileUploadSlot | undefined {
        if (stanza.is('iq') && stanza.attrs.type === 'result') {
            const slot = stanza.getChild('slot', HTTP_UPLOAD_NAMESPACE);
            if (slot) {
                const put = slot.getChild('put');
                const get = slot.getChild('get');

                if (put && get) {
                    return {
                        putUrl: put.attrs.url,
                        getUrl: get.attrs.url,
                        putHeaders: this.parseHeaders(put),
                        getHeaders: this.parseHeaders(get),
                    };
                }
            }
        }
        return undefined;
    }
}

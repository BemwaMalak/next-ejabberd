import { Element } from '@xmpp/xml';
import { v4 as uuidv4 } from 'uuid';
import { HTTP_UPLOAD_NAMESPACE } from '../../constants/namespaces';
import { FileUploadSlotOptions } from '../../types/files';

export class FileQueryBuilder {
    /**
     * Creates a basic Element with attributes
     */
    private createElement(
        name: string,
        attrs: Record<string, string> = {},
    ): Element {
        return new Element(name, attrs);
    }

    /**
     * Creates a request for a file upload slot
     */
    public createUploadSlotRequest(options: FileUploadSlotOptions): Element {
        const queryId = uuidv4();

        // Create IQ stanza
        const iq = this.createElement('iq', {
            type: 'get',
            id: queryId,
            to: `upload.${options.domain}`,
        });

        // Create request element
        const request = this.createElement('request', {
            xmlns: HTTP_UPLOAD_NAMESPACE,
            filename: options.filename,
            size: options.size.toString(),
            'content-type': options.contentType,
        });

        iq.append(request);
        return iq;
    }
}

import { Element } from '@xmpp/xml';
import { v4 as uuidv4 } from 'uuid';
import { FileNamespaces } from '../../constants/namespaces';
import {
    FileUploadSlotOptions,
    FileUploadError,
    SUPPORTED_MIME_TYPES,
} from '../../types/files';

/**
 * Default values for file upload queries
 */
const DEFAULTS = {
    UPLOAD_SUBDOMAIN: 'upload',
} as const;

/**
 * Error messages for query building operations
 */
const ERROR_MESSAGES = {
    INVALID_SIZE: 'File size must be a positive number',
    INVALID_FILENAME: 'Filename must not be empty',
    UNSUPPORTED_TYPE: 'Unsupported content type',
    INVALID_DOMAIN: 'Domain must not be empty',
} as const;

/**
 * Builds XMPP queries for file operations
 * Implements XEP-0363: HTTP File Upload
 */
export class FileQueryBuilder {
    /**
     * Creates a basic Element with attributes
     * @param name - Name of the element
     * @param attrs - Element attributes
     * @returns New Element instance
     */
    private createElement(
        name: string,
        attrs: Record<string, string> = {},
    ): Element {
        return new Element(name, attrs);
    }

    /**
     * Validates file upload options
     * @param options - Options to validate
     * @throws {FileUploadError} If options are invalid
     */
    private validateOptions(options: FileUploadSlotOptions): void {
        if (!options.filename?.trim()) {
            throw new FileUploadError(ERROR_MESSAGES.INVALID_FILENAME);
        }

        if (!options.size || options.size <= 0) {
            throw new FileUploadError(ERROR_MESSAGES.INVALID_SIZE);
        }

        if (!options.domain?.trim()) {
            throw new FileUploadError(ERROR_MESSAGES.INVALID_DOMAIN);
        }

        // Optional: Validate content type against supported types
        if (!Object.keys(SUPPORTED_MIME_TYPES).includes(options.contentType)) {
            throw new FileUploadError(ERROR_MESSAGES.UNSUPPORTED_TYPE);
        }
    }

    /**
     * Creates the upload request element
     * @param options - Validated upload options
     * @returns Request Element
     */
    private createRequestElement(options: FileUploadSlotOptions): Element {
        return this.createElement('request', {
            xmlns: FileNamespaces.HTTP_UPLOAD,
            filename: options.filename.trim(),
            size: options.size.toString(),
            'content-type': options.contentType,
        });
    }

    /**
     * Creates an IQ stanza for the request
     * @param domain - Target domain
     * @returns IQ Element
     */
    private createIQStanza(domain: string): Element {
        return this.createElement('iq', {
            type: 'get',
            id: uuidv4(),
            to: `${DEFAULTS.UPLOAD_SUBDOMAIN}.${domain.trim()}`,
        });
    }

    /**
     * Creates a request for a file upload slot
     * @param options - File upload options
     * @returns Element containing the complete request
     * @throws {FileUploadError} If options are invalid
     */
    public createUploadSlotRequest(options: FileUploadSlotOptions): Element {
        this.validateOptions(options);

        const iq = this.createIQStanza(options.domain);
        const request = this.createRequestElement(options);

        iq.append(request);
        return iq;
    }
}

import { jid, JID } from '@xmpp/jid';

/**
 * JID parts interface
 */
export interface JIDParts {
    local: string;
    domain: string;
    resource?: string;
}

/**
 * JID validation error types
 */
export type JIDValidationError =
    | 'INVALID_FORMAT'
    | 'INVALID_LOCAL'
    | 'INVALID_DOMAIN'
    | 'INVALID_RESOURCE'
    | 'DOMAIN_TOO_LONG'
    | 'RESOURCE_TOO_LONG'
    | 'LOCAL_TOO_LONG';

/**
 * JID validation error class
 */
export class JIDError extends Error {
    constructor(
        message: string,
        public readonly code: JIDValidationError,
        public readonly part?: string,
    ) {
        super(message);
        this.name = 'JIDError';
    }
}

/**
 * Constants for JID validation
 */
export const JID_CONSTANTS = {
    MAX_LOCAL_LENGTH: 1023,
    MAX_DOMAIN_LENGTH: 1023,
    MAX_RESOURCE_LENGTH: 1023,
    LOCAL_FORBIDDEN_CHARS: ['@', '/', '\\', '"', ' ', '<', '>', '&', "'", ':'],
    DOMAIN_FORBIDDEN_CHARS: ['@', '/', '\\', '"', ' ', '<', '>', '&', "'"],
    RESOURCE_FORBIDDEN_CHARS: ['@', '"', ' ', '<', '>', '&', "'"],
} as const;

export class JIDUtils {
    /**
     * Validates a local part of a JID
     */
    private static validateLocal(local: string): void {
        if (!local) {
            throw new JIDError('Local part cannot be empty', 'INVALID_LOCAL');
        }

        if (local.length > JID_CONSTANTS.MAX_LOCAL_LENGTH) {
            throw new JIDError(
                `Local part exceeds maximum length of ${JID_CONSTANTS.MAX_LOCAL_LENGTH}`,
                'LOCAL_TOO_LONG',
                local,
            );
        }

        for (const char of JID_CONSTANTS.LOCAL_FORBIDDEN_CHARS) {
            if (local.includes(char)) {
                throw new JIDError(
                    `Local part contains forbidden character: ${char}`,
                    'INVALID_LOCAL',
                    local,
                );
            }
        }
    }

    /**
     * Validates a domain part of a JID
     */
    private static validateDomain(domain: string): void {
        if (!domain) {
            throw new JIDError('Domain cannot be empty', 'INVALID_DOMAIN');
        }

        if (domain.length > JID_CONSTANTS.MAX_DOMAIN_LENGTH) {
            throw new JIDError(
                `Domain exceeds maximum length of ${JID_CONSTANTS.MAX_DOMAIN_LENGTH}`,
                'DOMAIN_TOO_LONG',
                domain,
            );
        }

        for (const char of JID_CONSTANTS.DOMAIN_FORBIDDEN_CHARS) {
            if (domain.includes(char)) {
                throw new JIDError(
                    `Domain contains forbidden character: ${char}`,
                    'INVALID_DOMAIN',
                    domain,
                );
            }
        }

        // Basic domain name validation
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/.test(domain)) {
            throw new JIDError(
                'Domain contains invalid characters or format',
                'INVALID_DOMAIN',
                domain,
            );
        }
    }

    /**
     * Validates a resource part of a JID
     */
    private static validateResource(resource: string): void {
        if (resource.length > JID_CONSTANTS.MAX_RESOURCE_LENGTH) {
            throw new JIDError(
                `Resource exceeds maximum length of ${JID_CONSTANTS.MAX_RESOURCE_LENGTH}`,
                'RESOURCE_TOO_LONG',
                resource,
            );
        }

        for (const char of JID_CONSTANTS.RESOURCE_FORBIDDEN_CHARS) {
            if (resource.includes(char)) {
                throw new JIDError(
                    `Resource contains forbidden character: ${char}`,
                    'INVALID_RESOURCE',
                    resource,
                );
            }
        }
    }

    /**
     * Parses a JID string into its components
     */
    public static parse(jidString: string): JIDParts {
        try {
            const parsed = jid(jidString);
            return {
                local: parsed.local,
                domain: parsed.domain,
                resource: parsed.resource,
            };
        } catch (error) {
            throw new JIDError(
                `Invalid JID format: ${(error as Error).message}`,
                'INVALID_FORMAT',
                jidString,
            );
        }
    }

    /**
     * Creates a JID from its components
     */
    public static create(parts: JIDParts): JID {
        this.validateLocal(parts.local);
        this.validateDomain(parts.domain);
        if (parts.resource) {
            this.validateResource(parts.resource);
        }

        return jid(parts.local, parts.domain, parts.resource);
    }

    /**
     * Gets the bare JID (without resource)
     */
    public static getBare(jidString: string): string {
        const parsed = this.parse(jidString);
        return `${parsed.local}@${parsed.domain}`;
    }

    /**
     * Checks if a JID is valid
     */
    public static isValid(jidString: string): boolean {
        try {
            this.parse(jidString);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Compares two JIDs for equality
     */
    public static equals(
        jid1: string,
        jid2: string,
        ignoreResource = false,
    ): boolean {
        try {
            const parsed1 = this.parse(jid1);
            const parsed2 = this.parse(jid2);

            const localEqual =
                parsed1.local.toLowerCase() === parsed2.local.toLowerCase();
            const domainEqual =
                parsed1.domain.toLowerCase() === parsed2.domain.toLowerCase();

            if (ignoreResource) {
                return localEqual && domainEqual;
            }

            const resourceEqual = parsed1.resource === parsed2.resource;
            return localEqual && domainEqual && resourceEqual;
        } catch {
            return false;
        }
    }

    /**
     * Escapes a node (local) part of a JID
     */
    public static escapeLocal(local: string): string {
        return local
            .replace('\\', '\\5c')
            .replace(' ', '\\20')
            .replace('"', '\\22')
            .replace('&', '\\26')
            .replace("'", '\\27')
            .replace('/', '\\2f')
            .replace(':', '\\3a')
            .replace('<', '\\3c')
            .replace('>', '\\3e')
            .replace('@', '\\40');
    }

    /**
     * Unescapes a node (local) part of a JID
     */
    public static unescapeLocal(local: string): string {
        return local
            .replace('\\5c', '\\')
            .replace('\\20', ' ')
            .replace('\\22', '"')
            .replace('\\26', '&')
            .replace('\\27', "'")
            .replace('\\2f', '/')
            .replace('\\3a', ':')
            .replace('\\3c', '<')
            .replace('\\3e', '>')
            .replace('\\40', '@');
    }

    /**
     * Gets the room name from a room JID
     */
    public static getRoomName(roomJid: string): string {
        const parsed = this.parse(roomJid);
        return parsed.local;
    }

    /**
     * Gets the nickname from a room JID
     */
    public static getNickname(roomJid: string): string | null {
        const parsed = this.parse(roomJid);
        return parsed.resource || null;
    }

    /**
     * Creates a room JID
     */
    public static createRoomJid(
        roomName: string,
        domain: string,
        nickname?: string,
    ): string {
        const parts: JIDParts = {
            local: roomName,
            domain: domain,
            resource: nickname,
        };
        return this.create(parts).toString();
    }
}

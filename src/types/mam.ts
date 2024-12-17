import { XMPPMessage } from './messages';

/**
 * Represents a field in a data form
 */
export interface FormField {
    name: string;
    value: string | number | boolean;
    type?: 'hidden' | 'text-single' | 'boolean' | 'list-single';
}

/**
 * Options for Result Set Management (XEP-0059)
 */
export interface RSMOptions {
    before?: string;
    after?: string;
    max?: number;
    index?: number;
}

/**
 * Options for filtering MAM queries
 */
export interface MAMFilterOptions {
    with?: string;
    start?: Date;
    end?: Date;
    fullText?: string;
    hasFile?: boolean;
    messageTypes?: Array<'chat' | 'groupchat' | 'normal'>;
}

/**
 * Options for MAM (Message Archive Management) queries
 */
export interface MAMQueryOptions {
    queryId?: string;
    with?: string;
    node?: string;
    start?: Date;
    end?: Date;
    before?: string;
    after?: string;
    limit?: number;
    filters?: MAMFilterOptions;
    rsm?: RSMOptions;
    namespace?: string;
}

/**
 * Result set management information
 */
export interface ResultSetManagement {
    first?: string;
    last?: string;
    count?: number;
}

/**
 * Result of a MAM query
 */
export interface MAMResult {
    queryId: string;
    complete: boolean;
    messages: XMPPMessage[];
    rsm?: ResultSetManagement;
}

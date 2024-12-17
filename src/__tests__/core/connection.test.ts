import { ConnectionManager } from '../../core/connection';
import { ConnectionConfig } from '../../types/connection';
import { client as XMPPClient } from '@xmpp/client';
import { EventEmitter } from 'events';

// Create a mock XMPP client class that extends EventEmitter
class MockXMPPClient extends EventEmitter {
    start = jest.fn().mockResolvedValue(undefined);
    stop = jest.fn().mockResolvedValue(undefined);
    send = jest.fn().mockResolvedValue(undefined);
}

// Mock @xmpp/client
jest.mock('@xmpp/client', () => ({
    client: jest.fn().mockImplementation(() => new MockXMPPClient()),
    jid: jest.fn().mockImplementation((str) => ({
        toString: () => str,
        local: str.split('@')[0],
    })),
}));

// Mock JIDUtils
jest.mock('../../utils/jid', () => ({
    JIDUtils: {
        parse: jest.fn().mockImplementation((jid) => ({
            local: jid.split('@')[0],
            domain: jid.split('@')[1]?.split('/')[0] || '',
            resource: jid.split('/')[1] || '',
        })),
    },
}));

describe('ConnectionManager', () => {
    let connection: ConnectionManager;
    let mockClient: MockXMPPClient;

    const mockConfig: ConnectionConfig = {
        username: 'test',
        password: 'password',
        domain: 'example.com',
        resource: 'web',
        service: 'ws://example.com:5280/ws',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        connection = new ConnectionManager(mockConfig);
        mockClient = (XMPPClient as jest.Mock)() as MockXMPPClient;
    });

    describe('constructor', () => {
        it('should initialize with disconnected status', () => {
            expect(connection.getStatus()).toBe('disconnected');
        });

        it('should store configuration', () => {
            expect(connection.getConfig()).toEqual({
                ...mockConfig,
                timeout: 10000, // Default timeout from DEFAULT_CONFIG
            });
        });

        it('should throw error for invalid config', () => {
            expect(() => new ConnectionManager({} as ConnectionConfig)).toThrow(
                'Invalid configuration: missing required fields',
            );
        });
    });
});

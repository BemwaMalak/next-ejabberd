import { client as XMPPClient, jid } from '@xmpp/client';
import { Element } from '@xmpp/xml';
import { EventEmitter } from 'events';
import {
    ConnectionState,
    ConnectionConfig,
    ConnectionError,
} from '../types/connection';
import { JIDUtils } from '../utils/jid';

/**
 * Default configuration values for connection management
 */
const DEFAULT_CONFIG = {
    TIMEOUT: 10000,
    MAX_RECONNECT_ATTEMPTS: 5,
    MAX_BACKOFF_TIME: 30000,
} as const;

/**
 * Manages XMPP connection lifecycle and state
 * Handles connection establishment, reconnection, and error recovery
 */
export class ConnectionManager extends EventEmitter {
    private xmpp: ReturnType<typeof XMPPClient> | null = null;
    private status: ConnectionState = 'disconnected';
    private connectionPromise: Promise<void> | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private readonly config: ConnectionConfig;

    constructor(config: ConnectionConfig) {
        super();
        this.config = this.validateConfig(config);
        this.setupErrorHandler();
    }

    /**
     * Get current connection status
     */
    public getStatus(): ConnectionState {
        return this.status;
    }

    /**
     * Get underlying XMPP client instance
     */
    public getClient(): ReturnType<typeof XMPPClient> | null {
        return this.xmpp;
    }

    /**
     * Get current connection configuration
     */
    public getConfig(): ConnectionConfig {
        return this.config;
    }

    /**
     * Get user's JID (Jabber ID)
     */
    public getUserJID(): string | null {
        return jid(`${this.config.username}`).toString();
    }

    /**
     * Check if client is currently connected
     */
    public isConnected(): boolean {
        return this.status === 'online' && this.xmpp !== null;
    }

    /**
     * Establish connection to XMPP server
     * @throws {ConnectionError} If connection fails or is already in progress
     */
    public async connect(): Promise<void> {
        if (this.status === 'connecting') {
            throw new ConnectionError('Connection already in progress');
        }

        if (this.status === 'online') {
            throw new ConnectionError('Already connected');
        }

        this.setStatus('connecting');
        this.setupConnectionTimeout();

        try {
            await this.establishConnection();
        } catch (error) {
            this.handleConnectionError(error as Error);
            throw error;
        }
    }

    /**
     * Disconnect from XMPP server
     */
    public async disconnect(): Promise<void> {
        if (!this.xmpp) return;

        try {
            await this.xmpp.stop();
            this.cleanup();
        } catch (error) {
            this.handleConnectionError(error as Error);
            throw error;
        }
    }

    public async sendPresenceToRoom(
        to: string,
        type: 'available' | 'unavailable',
    ): Promise<void> {
        const presence = new Element('presence', {
            to,
            type,
        });
        await this.sendStanza(presence);
    }

    public async broadcastPresence(
        type: 'available' | 'unavailable',
    ): Promise<void> {
        const presence = new Element('presence', {
            ...(type === 'unavailable' ? { type } : {}),
        });
        await this.sendStanza(presence);
    }

    public async subscribeToPresence(jid: string): Promise<void> {
        const presence = new Element('presence', {
            to: jid,
            type: 'subscribe',
        });
        return this.sendStanza(presence);
    }

    public async probePresence(jid: string): Promise<void> {
        const presence = new Element('presence', {
            to: jid,
            type: 'probe',
        });
        return this.sendStanza(presence);
    }

    public async acceptSubscription(jid: string): Promise<void> {
        const presence = new Element('presence', {
            to: jid,
            type: 'subscribed',
        });
        return this.sendStanza(presence);
    }

    /**
     * Send an IQ stanza and wait for response
     * @param iq - The IQ stanza to send
     * @returns Promise that resolves with the response stanza
     */
    public async sendIQ(iq: Element): Promise<Element> {
        if (!this.xmpp || this.status !== 'online') {
            throw new Error('Not connected to server');
        }

        if (!iq.attrs.id) {
            iq.attrs.id = Math.random().toString(36).substr(2, 9);
        }

        try {
            const response = await this.xmpp.iqCaller.request(iq);
            return response;
        } catch (error: any) {
            if (error.condition) {
                throw error;
            }

            throw new Error('Failed to send IQ: ' + error.message);
        }
    }

    /**
     * Send an XMPP stanza
     * @throws {Error} If not connected to server
     */
    public async sendStanza(stanza: Element): Promise<void> {
        if (!this.isConnected()) {
            throw new Error('Not connected to server');
        }
        await this.xmpp!.send(stanza);
        this.emit('stanza:sent', stanza);
    }

    /**
     * Validate and normalize connection configuration
     */
    private validateConfig(config: ConnectionConfig): ConnectionConfig {
        if (
            !config.service ||
            !config.domain ||
            !config.username ||
            !config.password
        ) {
            throw new Error('Invalid configuration: missing required fields');
        }
        return {
            ...config,
            timeout: config.timeout || DEFAULT_CONFIG.TIMEOUT,
        };
    }

    private setupErrorHandler(): void {
        this.on('error', () => {
            // Prevent unhandled error events from crashing the process
        });
    }

    private setStatus(status: ConnectionState): void {
        this.status = status;
        this.emit('status', status);
    }

    private setupConnectionTimeout(): void {
        this.clearConnectionTimeout();
        this.connectionTimeout = setTimeout(() => {
            if (this.status === 'connecting') {
                this.handleConnectionError(
                    new ConnectionError('Connection timeout', 'TIMEOUT'),
                );
            }
        }, this.config.timeout || DEFAULT_CONFIG.TIMEOUT);
    }

    private clearConnectionTimeout(): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    private async establishConnection(): Promise<void> {
        this.xmpp = this.createXMPPClient();
        this.setupEventHandlers();
        await this.xmpp.start();
        await this.waitForConnection();
    }

    private createXMPPClient(): ReturnType<typeof XMPPClient> {
        return XMPPClient({
            service: this.config.service,
            domain: this.config.domain,
            resource: this.config.resource,
            username: JIDUtils.parse(this.config.username).local,
            password: this.config.password,
        });
    }

    private setupEventHandlers(): void {
        if (!this.xmpp) return;

        this.xmpp.on('online', this.handleOnline.bind(this));
        this.xmpp.on('offline', this.handleOffline.bind(this));
        this.xmpp.on('error', this.handleConnectionError.bind(this));
        this.xmpp.on('stanza', (stanza: Element) =>
            this.emit('stanza', stanza),
        );
    }

    private handleOnline(): void {
        this.clearConnectionTimeout();
        this.reconnectAttempts = 0;
        this.setStatus('online');
        this.emit('online');
    }

    private handleOffline(): void {
        this.setStatus('disconnected');
        this.emit('offline');
    }

    private handleConnectionError(error: Error): void {
        this.clearConnectionTimeout();

        const connectionError =
            error instanceof ConnectionError
                ? error
                : new ConnectionError(error.message);

        this.setStatus('error');
        this.emit('error', connectionError);

        if (this.shouldAttemptReconnect()) {
            this.reconnectAttempts++;
            this.reconnect();
        }
    }

    private shouldAttemptReconnect(): boolean {
        return (
            this.reconnectAttempts < DEFAULT_CONFIG.MAX_RECONNECT_ATTEMPTS &&
            this.config !== null &&
            this.status !== 'disconnected'
        );
    }

    private async reconnect(): Promise<void> {
        const backoffTime = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            DEFAULT_CONFIG.MAX_BACKOFF_TIME,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffTime));

        try {
            await this.connect();
        } catch (error) {
            this.handleConnectionError(error as Error);
        }
    }

    private async waitForConnection(): Promise<void> {
        this.connectionPromise = new Promise((resolve, reject) => {
            const onOnline = () => {
                this.xmpp?.removeListener('error', onError);
                resolve();
            };

            const onError = (error: Error) => {
                this.xmpp?.removeListener('online', onOnline);
                reject(error);
            };

            this.xmpp?.once('online', onOnline);
            this.xmpp?.once('error', onError);
        });

        return this.connectionPromise;
    }

    private cleanup(): void {
        if (this.xmpp) {
            this.xmpp.removeAllListeners();
            this.xmpp = null;
        }
        this.connectionPromise = null;
        this.reconnectAttempts = 0;
        this.clearConnectionTimeout();
        this.setStatus('disconnected');
    }
}

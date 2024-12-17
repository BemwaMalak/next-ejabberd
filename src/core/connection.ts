import { client as XMPPClient, jid } from '@xmpp/client';
import { Element } from '@xmpp/xml';
import { EventEmitter } from 'events';
import {
    ConnectionState,
    ConnectionConfig,
    ConnectionError,
} from '../types/connection';
import { JIDUtils } from '../utils/jid';

export class ConnectionManager extends EventEmitter {
    private xmpp: ReturnType<typeof XMPPClient> | null = null;
    private status: ConnectionState = 'disconnected';
    private connectionPromise: Promise<void> | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private config: ConnectionConfig;

    constructor(config: ConnectionConfig) {
        super();
        this.config = config;
        this.on('error', () => {});
    }

    public getStatus(): ConnectionState {
        return this.status;
    }

    public getClient(): ReturnType<typeof XMPPClient> | null {
        return this.xmpp;
    }

    public getConfig(): ConnectionConfig {
        return this.config;
    }

    public getUserJID(): string {
        return jid(`${this.config.username}`).toString();
    }

    private setStatus(status: ConnectionState): void {
        this.status = status;
        this.emit('status', status);
    }

    private setupConnectionTimeout(timeout: number): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }

        this.connectionTimeout = setTimeout(() => {
            if (this.status === 'connecting') {
                this.handleConnectionError(
                    new ConnectionError('Connection timeout', 'TIMEOUT'),
                );
            }
        }, timeout);
    }

    private clearConnectionTimeout(): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
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
            this.reconnectAttempts < this.maxReconnectAttempts &&
            this.config !== null &&
            this.status !== 'disconnected'
        );
    }

    private async reconnect(): Promise<void> {
        const backoffTime = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            30000,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffTime));

        try {
            await this.connect();
        } catch (error) {
            this.handleConnectionError(error as Error);
        }
    }

    private setupEventHandlers(): void {
        if (!this.xmpp) return;

        this.xmpp.on('online', () => {
            this.clearConnectionTimeout();
            this.reconnectAttempts = 0;
            this.setStatus('online');
            this.emit('online');
        });

        this.xmpp.on('offline', () => {
            this.setStatus('disconnected');
            this.emit('offline');
        });

        this.xmpp.on('error', (err: Error) => {
            this.handleConnectionError(err);
        });

        this.xmpp.on('stanza', (stanza: Element) => {
            this.emit('stanza', stanza);
        });
    }

    public async connect(): Promise<void> {
        if (this.status === 'connecting') {
            throw new ConnectionError('Connection already in progress');
        }

        if (this.status === 'online') {
            throw new ConnectionError('Already connected');
        }

        this.setStatus('connecting');

        const timeout = this.config.timeout || 10000;
        this.setupConnectionTimeout(timeout);

        try {
            this.xmpp = XMPPClient({
                service: this.config.service,
                domain: this.config.domain,
                resource: this.config.resource,
                username: JIDUtils.parse(this.config.username).local,
                password: this.config.password,
            });

            this.setupEventHandlers();

            await this.xmpp.start();

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

            await this.connectionPromise;
        } catch (error) {
            this.handleConnectionError(error as Error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.xmpp) {
            return;
        }

        try {
            await this.xmpp.stop();
            this.xmpp.removeAllListeners();
            this.xmpp = null;
            this.connectionPromise = null;
            this.reconnectAttempts = 0;
            this.clearConnectionTimeout();
            this.setStatus('disconnected');
        } catch (error) {
            this.handleConnectionError(error as Error);
            throw error;
        }
    }

    public async sendStanza(stanza: Element): Promise<void> {
        if (!this.isConnected()) {
            throw new Error('Not connected to server');
        }
        await this.xmpp?.send(stanza);

        this.emit('stanza:sent', stanza);
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

    public isConnected(): boolean {
        return this.status === 'online' && this.xmpp !== null;
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
}

import { EventEmitter } from 'events';
import { XMPPEvents } from '../types/events';

/**
 * Type-safe event emitter for XMPP events
 */
export class XMPPEventEmitter extends EventEmitter {
    /**
     * Emit a strongly typed event
     */
    emit<K extends keyof XMPPEvents>(event: K, data: XMPPEvents[K]): boolean {
        return super.emit(event, data);
    }

    /**
     * Add a strongly typed event listener
     */
    on<K extends keyof XMPPEvents>(
        event: K,
        listener: (data: XMPPEvents[K]) => void,
    ): this {
        return super.on(event, listener);
    }

    /**
     * Add a one-time strongly typed event listener
     */
    once<K extends keyof XMPPEvents>(
        event: K,
        listener: (data: XMPPEvents[K]) => void,
    ): this {
        return super.once(event, listener);
    }

    /**
     * Remove a strongly typed event listener
     */
    off<K extends keyof XMPPEvents>(
        event: K,
        listener: (data: XMPPEvents[K]) => void,
    ): this {
        return super.off(event, listener);
    }

    /**
     * Remove all listeners for a specific event or all events
     */
    removeAllListeners<K extends keyof XMPPEvents>(event?: K): this {
        return super.removeAllListeners(event);
    }

    /**
     * Get all listeners for a specific event
     */
    listeners<K extends keyof XMPPEvents>(
        event: K,
    ): ((data: XMPPEvents[K]) => void)[] {
        return super.listeners(event) as ((data: XMPPEvents[K]) => void)[];
    }

    /**
     * Get the number of listeners for a specific event
     */
    listenerCount<K extends keyof XMPPEvents>(event: K): number {
        return super.listenerCount(event);
    }
}

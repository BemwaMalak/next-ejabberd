# Next-Ejabberd

A modern TypeScript XMPP client for Next.js applications, designed to work seamlessly with Ejabberd servers.

[![NPM Version](https://img.shields.io/npm/v/next-ejabberd.svg)](https://www.npmjs.com/package/next-ejabberd)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)

## Features

- 🚀 Full TypeScript support
- 📦 Modern ESM/CommonJS dual package
- 🔒 Secure WebSocket connections
- 📝 Message Archive Management (MAM)
- 📤 HTTP File Upload support
- 📬 Message delivery receipts
- 👀 Message read/delivery status
- 🔄 Automatic reconnection handling
- 🎯 Event-driven architecture

## Prerequisites

This package requires the following Ejabberd modules to be enabled:

- mod_mam (Message Archive Management)
- mod_http_upload (File Upload)
- [mod_message_status](https://github.com/BemwaMalak/mod_message_status) (Message Status)

## Installation

```bash
# install the package
npm install next-ejabberd
```

## Quick Start

```typescript
import { EjabberdClient } from 'next-ejabberd';

const client = new EjabberdClient({
    service: 'wss://your-ejabberd-server.com:5443/ws',
    domain: 'your-domain.com',
    username: 'user@your-domain.com',
    password: 'your-password',
});

// Listen for messages
client.on('message', (message) => {
    console.log('New message:', message);
});

// Send a message
await client.sendMessage('recipient@domain.com', 'Hello, world!');

// Send a file
const file = new File(['Hello, world!'], 'hello.txt', { type: 'text/plain' });
await client.sendAttachment('recipient@domain.com', 'Check this file', file);

// Query message history
await client.queryArchive({
    with: 'recipient@domain.com',
    start: new Date('2024-01-01'),
    end: new Date(),
});
```

## API Documentation

### Connection Management

```typescript
// Connect to the server
await client.connect();

// Disconnect from the server
await client.disconnect();

// Get current connection status
const status = client.getStatus(); // 'connecting' | 'online' | 'disconnected' | 'error'

// Get current user's JID
const jid = client.getUserJID();
```

### Messaging

```typescript
// Send a text message
await client.sendMessage(to: string, body: string, options?: MessageOptions);

// Send a file attachment
await client.sendAttachment(to: string, body: string, file: File);

// Mark message as read
await client.markMessageAsRead(message: XMPPMessage);

// Mark message as delivered
await client.markMessageAsDelivered(message: XMPPMessage);

// Get message status
const status = await client.getMessageStatus(messageId: string, jid: string);
```

### Message Archive Management (MAM)

```typescript
// Query message history
await client.queryArchive({
    with?: string,           // JID to filter messages
    start?: Date,           // Start date
    end?: Date,             // End date
    before?: string,        // Reference ID for pagination
    after?: string,         // Reference ID for pagination
    max?: number,           // Maximum number of messages
    ascending?: boolean     // Sort order
});
```

### Presence Management

```typescript
// Broadcast presence
await client.broadcastPresence('available' | 'unavailable');

// Subscribe to contact's presence
await client.subscribeToPresence(jid: string);

// Probe contact's presence
await client.probePresence(jid: string);

// Accept subscription request
await client.acceptSubscription(jid: string);
```

### Event Handling

```typescript
// New message received
client.on('message', (message: XMPPMessage) => {});

// Presence update
client.on('presence', (presence: XMPPMessage) => {});

// Message delivery receipt
client.on('receipt', (receipt: { id: string; type: 'received' | 'displayed' }) => {});

// MAM query results
client.on('mamResult', (result: { messages: XMPPMessage[]; complete: boolean }) => {});

// Connection status changes
client.on('status', (status: ConnectionState) => {});

// Error events
client.on('error', (error: XMPPError) => {});
```

## Configuration

```typescript
interface ConnectionConfig {
    service: string;        // WebSocket endpoint
    domain: string;         // XMPP domain
    username: string;       // User's username or full JID
    password: string;       // User's password
    resource?: string;      // Optional resource identifier
    timeout?: number;       // Connection timeout (default: 10000ms)
    attachmentConfig?: {    // Optional file upload configuration
        uploadEndpoint?: string;
        maxFileSize?: number;
        allowedMimeTypes?: string[];
    };
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Dependencies

This package requires the following Ejabberd modules:

- [mod_message_status](https://github.com/BemwaMalak/mod_message_status) - For message read/delivery status support
- mod_mam - For message archive management
- mod_http_upload - For file upload support

Make sure these modules are enabled in your Ejabberd configuration.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Developed by Bemwa Malak with ❤️

## Support

- 📫 Report issues on [GitHub](https://github.com/bemwamalak/next-ejabberd/issues)
- 📧 Contact me at bemwa.malak10@gmail.com

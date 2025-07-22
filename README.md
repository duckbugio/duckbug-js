# @duckbug/js

[![npm version](https://badge.fury.io/js/@duckbug%2Fjs.svg)](https://www.npmjs.com/package/@duckbug/js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official JavaScript SDK for [DuckBug.io](https://duckbug.io) - a flexible logging and error tracking platform.

## Features

- 🦆 **Simple Integration**: Easy setup with DuckBug.io
- 🔌 **Provider Architecture**: Extensible plugin system for custom logging providers
- 📊 **Multiple Log Levels**: Support for debug, info, warn, and error levels
- 🎯 **TypeScript Support**: Full TypeScript support with type definitions
- 📦 **Dual Module Format**: Both CommonJS and ES Module support
- ⚡ **Lightweight**: Minimal dependencies and small bundle size

## Installation

```bash
# npm
npm install @duckbug/js

# yarn
yarn add @duckbug/js

# pnpm
pnpm add @duckbug/js
```

## Quick Start

### Basic Usage

```typescript
import { DuckSDK, DuckBugProvider } from '@duckbug/js';

// Initialize with DuckBug.io provider
const providers = [
  new DuckBugProvider({
    dsn: 'your-duckbug-dsn-here'
  })
];

// Create SDK instance with optional configuration
const duck = new DuckSDK(providers, {
  logReports: {
    log: false,
    warn: true,
    error: true,
  }
});

// Start logging
duck.log('Info message', { userId: 123, action: 'user_login' });
duck.debug('Debug message', { debugInfo: 'Connection established' });
duck.warn('Warning message', { warning: 'Rate limit approaching' });
duck.error('Error message', { error: 'Database connection failed' });
```

### JavaScript Usage

```javascript
const { DuckSDK, DuckBugProvider } = require('@duckbug/js');

const providers = [
  new DuckBugProvider({
    dsn: 'your-duckbug-dsn-here'
  })
];

const duck = new DuckSDK(providers);
duck.error('Something went wrong!', { errorCode: 500 });
```

## API Reference

### DuckSDK

The main SDK class that manages logging across multiple providers.

#### Constructor

```typescript
new DuckSDK(providers: Provider[], config?: LogProviderConfig)
```

- `providers`: Array of provider instances
- `config`: Optional configuration for log reporting levels

#### Methods

- `log(tag: string, payload?: object)`: Log an info-level message
- `debug(tag: string, payload?: object)`: Log a debug-level message
- `warn(tag: string, payload?: object)`: Log a warning-level message
- `error(tag: string, payload?: object)`: Log an error-level message

### DuckBugProvider

The official DuckBug.io provider for sending logs to the DuckBug.io platform.

#### Constructor

```typescript
new DuckBugProvider(config: DuckConfig)
```

- `config.dsn`: Your DuckBug.io DSN (Data Source Name)

### Log Provider Configuration

```typescript
type LogProviderConfig = {
  logReports: {
    log?: boolean;    // Enable/disable info logs (default: false)
    warn?: boolean;   // Enable/disable warning logs (default: true)
    error?: boolean;  // Enable/disable error logs (default: true)
  }
}
```

## Custom Providers

You can create custom providers by implementing the `Provider` interface:

```typescript
import { Provider, LogLevel } from '@duckbug/js';

class TelegramProvider implements Provider {
  constructor(private botToken: string, private chatId: string) {}

  log(...args: unknown[]): void {
    this.sendToTelegram('📝', args);
  }

  warn(...args: unknown[]): void {
    this.sendToTelegram('⚠️', args);
  }

  error(...args: unknown[]): void {
    this.sendToTelegram('🚨', args);
  }

  report(tag: string, level: LogLevel, payload?: object): void {
    const emoji = level === 'ERROR' ? '🚨' : level === 'WARN' ? '⚠️' : '📝';
    this.sendToTelegram(emoji, [tag, payload]);
  }

  private sendToTelegram(emoji: string, args: unknown[]) {
    const message = `${emoji} ${args.join(' ')}`;
    // Implementation to send message to Telegram
    fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message
      })
    });
  }
}

// Usage
const providers = [
  new DuckBugProvider({ dsn: 'your-dsn' }),
  new TelegramProvider('your-bot-token', 'your-chat-id')
];

const duck = new DuckSDK(providers);
```

## Development

### Setup

Install dependencies:

```bash
yarn install
```

### Build

Build the library:

```bash
yarn build
```

### Linting

Run linting:

```bash
yarn lint
```

## TypeScript Support

This package includes TypeScript definitions. All exports are fully typed:

```typescript
import type { Provider, DuckConfig, LogLevel } from '@duckbug/js';
```

## Browser Compatibility

This SDK works in all modern browsers that support:
- ES2015+ (ES6)
- Fetch API
- JSON API

For older browsers, you may need to include polyfills.

## License

MIT © [DuckBug.io](https://duckbug.io)

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/duckbugio/duckbug-js/issues)

---

**Made with 🦆 by the DuckBug.io team**

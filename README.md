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
duck.fatal('Fatal message', { error: 'Ay, caramba' });

//Send error
const testError = new Error("Integration test error");
testError.stack =
  "Error: Integration test error\n    at integration.test.ts:1:1";

// Use quack method directly on provider
duckBugProvider.quack("INTEGRATION_ERROR", testError);
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
- `fatal(tag: string, payload?: object)`: Log an fatal-level message
- `quack(tag: string, error: Error)`: Report error

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
    const emojiMap: Record<LogLevel, string> = {
      INFO: '📝',
      DEBUG: '🦆',
      WARN: '⚠️',
      ERROR: '🚨',
      FATAL: '💀',
    };
    this.sendToTelegram(emojiMap[level], [tag, payload]);
  }

  quack(tag: string, error: Error): void {
    this.sendToTelegram('💀', [tag, error.message]);
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
bun install
```

### Build

Build the library:

```bash
bun run build
```

### Linting

Run linting:

```bash
bun run lint
```

### Commit Messages

Этот проект использует [Conventional Commits](https://www.conventionalcommits.org/) для стандартизации сообщений коммитов. Все коммиты должны соответствовать следующему формату:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Типы коммитов (обязательные)

- `feat`: Новая функциональность
- `fix`: Исправление бага
- `docs`: Изменения в документации
- `style`: Форматирование кода (не влияет на выполнение кода)
- `refactor`: Рефакторинг кода
- `perf`: Улучшение производительности
- `test`: Добавление или изменение тестов
- `build`: Изменения в системе сборки или внешних зависимостях
- `ci`: Изменения в CI конфигурации
- `chore`: Обновление задач сборки, настроек и т.д.
- `revert`: Откат предыдущего коммита

#### Примеры корректных коммитов

```bash
feat: добавить поддержку логирования ошибок
fix: исправить утечку памяти в DuckBugProvider
docs: обновить README с примерами использования
test: добавить тесты для DuckSDK
refactor: улучшить структуру классов провайдеров
```

#### Проверка коммитов

Автоматическая проверка формата коммитов выполняется через git hook. При создании коммита с неправильным форматом вы получите подробное сообщение об ошибке с описанием проблемы и примерами правильного формата.

**Примеры ошибок:**

❌ Если забыли указать тип:
```
❌ Тип коммита обязателен!
📝 Формат коммита: <type>: <описание>
💡 Примеры:
   feat: добавить новую функцию
   fix: исправить обработку ошибок
```

❌ Если использовали неправильный тип:
```
❌ Неверный тип коммита!
✅ Используйте один из допустимых типов:
   - feat: новая функциональность
   - fix: исправление бага
   ...
```

Для ручной проверки сообщения коммита:

```bash
bun run commitlint -- --from HEAD~1 --to HEAD
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

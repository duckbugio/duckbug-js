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

DSN must follow the ingest URL shape from the DuckBug SDK spec (`duckbug-sdk-spec`): `{origin}/ingest/{projectId}:{publicKey}` or `{origin}/api/ingest/{projectId}:{publicKey}` (for example on `duckbug.io`).

```typescript
import { Duck, DuckBugProvider, Pond } from '@duckbug/js';

const dsn = 'https://api.duckbug.io/ingest/your-project-id:your-public-key';
const { extraSensitiveKeys } = Pond.ripple(['custom_secret']);

const duck = new Duck(
  [new DuckBugProvider({ dsn, extraSensitiveKeys })],
  {
    logReports: {
      log: false,
      warn: true,
      error: true,
    },
  },
);

// Branded + idiomatic error capture
const err = new Error('Something failed');
duck.quack('checkout_failed', err);
duck.captureException(err, 'checkout_failed');

// Logging (levels normalized to DEBUG, INFO, WARN, ERROR, FATAL)
duck.warn('Slow query', { ms: 1200 });
```

`DuckSDK` remains available as an alias of the same runtime; prefer `Duck` for new code.

Before process exit, await `duck.flush()` so queued HTTP work finishes (for example at the end of an `async main()`).

## Full usage example

End-to-end pattern for a Node/Bun service: DSN from env, scope (release, user, fingerprint), privacy pipeline, `beforeSend`, batched transport with retries, transport errors, console forwarding, global error handlers, structured logs, manual errors, and clean shutdown.

```typescript
import {
  Duck,
  DuckBugProvider,
  Pond,
  registerNodeGlobalErrorHandlers,
} from "@duckbug/js";

const dsn = process.env.DUCKBUG_DSN;
if (!dsn) {
  throw new Error("Set DUCKBUG_DSN to your ingest URL");
}

const { extraSensitiveKeys } = Pond.ripple([
  "custom_secret",
  "internalToken",
]);

// Transport + ingest errors. Privacy (strip / sanitize / eventId / beforeSend) is applied in `Duck` when you use the core client.
const duckBug = new DuckBugProvider({
  dsn,
  transport: {
    maxBatchSize: 25,
    maxRetries: 2,
    retryDelayMs: 200,
  },
  onTransportError: (info) => {
    console.error("[duckbug transport]", info.message, info.kind, info.itemCount);
  },
});

const duck = new Duck(
  [duckBug],
  {
    logReports: {
      log: true,
      warn: true,
      error: true,
    },
  },
  {
    extraSensitiveKeys,
    // Omit whole sections before sanitize (see StrippableIngestSection in types)
    stripSections: ["cookies", "headers"],
    beforeSend: async (arg) => {
      // Drop PII-heavy events in dev, or tweak payload
      if (process.env.NODE_ENV === "test") {
        return null;
      }
      if (arg.kind === "log" && arg.event.message.includes("healthcheck")) {
        return null;
      }
      return arg.event;
    },
  },
);

// Applied to every subsequent log / error (merge into event)
duck.setScope({
  release: "my-app@1.4.2",
  environment: process.env.NODE_ENV ?? "development",
  service: "checkout-api",
  fingerprint: "checkout-api-default",
  // Prefer nesting session-like data under context; top-level `session` may be rejected by ingest.
  context: { deployment: "eu-west" },
});

const unregisterGlobals = registerNodeGlobalErrorHandlers({
  duck,
  rejectionTag: "unhandledRejection",
  exceptionTag: "uncaughtException",
});

async function main() {
  duck.debug("boot", { pid: process.pid });

  try {
    await doCheckout();
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    duck.quack("checkout_failed", err);
    duck.captureException(err, "checkout_failed");
  }

  duck.warn("slow_query", { table: "orders", ms: 850 });
  duck.error("inventory_low", { sku: "SKU-12", qty: 2 });
  duck.fatal("migration_required", { from: "v10", to: "v11" });

  await duck.flush();
}

async function doCheckout() {
  // ...
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    unregisterGlobals();
    await duck.flush();
  });
```

**Direct provider (no `Duck`)** — same privacy defaults via `finalizeIngestEvent` inside the provider; you call `sendLog` / `sendError` with `DuckBugLogEvent` / `DuckBugErrorEvent` shapes:

```typescript
import { DuckBugProvider, logLevel } from "@duckbug/js";

const provider = new DuckBugProvider({ dsn });
provider.sendLog({
  time: Date.now(),
  level: logLevel.INFO,
  message: "Job finished",
  platform: "node",
  dTags: ["worker", "nightly"],
});
await provider.flush();
```

## API Reference

### Duck / DuckSDK

The main SDK class fans out canonical log and error events to all registered providers.

#### Constructor

```typescript
new Duck(
  providers: Provider[],
  logProviderConfig?: LogProviderConfig,
  options?: DuckSDKOptions,
)
```

- `providers`: Array of provider instances
- `logProviderConfig`: Optional configuration for console interception (`LogProvider`)
- `options`: Optional `beforeSend`, `stripSections`, `extraSensitiveKeys` (strip → sanitize → `eventId` → `beforeSend` → providers; matches `duckbug-sdk-spec`)

#### Methods

- `log` / `debug` / `warn` / `error` / `fatal(tag, payload?)`: structured logs
- `quack(tag, error)`: branded manual error capture; tag is sent as `dTags`, message comes from `error.message`
- `captureException(error, tag?)`: idiomatic alias for `quack` (default tag `error`)
- `setScope(partial)`: merge shared metadata into subsequent events
- `flush()`: await transport drains on providers that implement `flush` (for example `DuckBugProvider`)

Each captured log/error gets a UUID `eventId` when omitted (idempotency / retries).

### DuckBugProvider

First-party provider: posts JSON to single-event ingest by default, or to `/logs/batch` and `/errors/batch` when `transport.maxBatchSize > 1` (body is a JSON array, as required by the DuckBug API).

#### Constructor

```typescript
new DuckBugProvider({
  dsn: string,
  extraSensitiveKeys?: string[],
  stripSections?: StrippableIngestSection[],
  beforeSend?: (arg) => event | null | undefined | Promise<...>,
  transport?: {
    maxBatchSize?: number; // default 1 — one POST per event
    maxRetries?: number;
    retryDelayMs?: number;
    fetchImpl?: typeof fetch;
  },
  onTransportError?: (info: TransportFailureInfo) => void,
})
// or
DuckBugProvider.fromDSN(dsn)
```

- `config.dsn`: full ingest URL, e.g. `https://api.duckbug.io/ingest/myProject:myKey`
- `flush()`: returns a `Promise` that resolves when queued requests for this provider have been sent

### Privacy, batching, and Node hooks

- **Strip sections**: omit whole request fields (`headers`, `cookies`, `session`, …) before sanitize via `stripSections` on `DuckBugProvider` or `DuckSDK` options.
- **`beforeSend`**: on `Duck` / `DuckSDK` for all providers; on `DuckBugProvider` when using the provider without the core client. Return `null` to drop an event.
- **Node global errors** (optional, no core framework deps):

```typescript
import { Duck, DuckBugProvider, registerNodeGlobalErrorHandlers } from '@duckbug/js';

const duck = new Duck([DuckBugProvider.fromDSN(dsn)]);
const unregister = registerNodeGlobalErrorHandlers({ duck });
// ... on shutdown: unregister();
```

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

Implement `Provider`: handle canonical `DuckBugLogEvent` / `DuckBugErrorEvent` from `sendLog` / `sendError` (optional second argument `SendEventMeta` when events are already finalized in `DuckSDK`), and optional console-style methods for `LogProvider` hooks.

```typescript
import type {
  DuckBugErrorEvent,
  DuckBugLogEvent,
  Provider,
} from '@duckbug/js';

class TelegramProvider implements Provider {
  constructor(private botToken: string, private chatId: string) {}

  sendLog(event: DuckBugLogEvent): void {
    this.sendToTelegram('📝', `${event.level} ${event.message}`);
  }

  sendError(event: DuckBugErrorEvent): void {
    this.sendToTelegram('💀', event.message);
  }

  log(...args: unknown[]): void {
    this.sendToTelegram('📝', String(args[0]));
  }

  warn(...args: unknown[]): void {
    this.sendToTelegram('⚠️', String(args[0]));
  }

  error(...args: unknown[]): void {
    this.sendToTelegram('🚨', String(args[0]));
  }

  private sendToTelegram(emoji: string, text: string) {
    const message = `${emoji} ${text}`;
    fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text: message }),
    });
  }
}

const providers = [
  DuckBugProvider.fromDSN('https://api.duckbug.io/ingest/project:key'),
  new TelegramProvider('your-bot-token', 'your-chat-id'),
];

const duck = new Duck(providers);
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

### Автоматические релизы

Этот проект использует [semantic-release](https://github.com/semantic-release/semantic-release) для автоматического управления версиями и релизами.

#### Как это работает:

- **Версионирование**: Версия автоматически обновляется на основе типов коммитов:
  - `feat:` → минорное обновление (1.0.0 → 1.1.0)
  - `fix:` → патч (1.0.0 → 1.0.1)
  - `BREAKING CHANGE` или `feat!:` → мажорное обновление (1.0.0 → 2.0.0)
  - `chore:`, `docs:`, `style:` и другие → без релиза

- **Автоматические действия при пуше в `main`**:
  1. Анализ коммитов с последнего релиза
  2. Определение новой версии
  3. Генерация CHANGELOG.md
  4. Обновление версии в package.json
  5. Создание git тега
  6. Публикация в npm
  7. Создание GitHub Release с заметками

#### Настройка:

1. **Создайте NPM токен** (только для публикации):
   - Перейдите на https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Создайте токен с правами `Automation`
   - Добавьте его в GitHub Secrets как `NPM_TOKEN`

2. **GitHub Actions**:
   - Workflow `release.yaml` автоматически запускается при пуше в `main` или `beta`
   - Использует `GITHUB_TOKEN` (автоматически предоставляется GitHub Actions)
   - Использует `NPM_TOKEN` из секретов для публикации в npm

#### Примеры коммитов для релизов:

```bash
# Патч релиз (1.0.0 → 1.0.1)
fix: исправить обработку ошибок в DuckBugProvider

# Минорный релиз (1.0.0 → 1.1.0)
feat: добавить поддержку фильтрации логов

# Мажорный релиз (1.0.0 → 2.0.0)
feat!: изменить API провайдеров

# или

feat: добавить новую функцию

BREAKING CHANGE: изменена структура конфигурации DuckBugProvider
```

**Примечание**: Коммиты без типа или с типом `chore`, `docs`, `style` не создают новый релиз, но могут быть включены в CHANGELOG.

## TypeScript Support

This package includes TypeScript definitions. All exports are fully typed:

```typescript
import type {
  Provider,
  DuckBugConfig,
  DuckBugLogEvent,
  LogLevel,
} from "@duckbug/js";
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

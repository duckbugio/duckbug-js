# DuckBug.js Bun.js Example

This example demonstrates how to integrate `@duckbug/js` into a Bun.js HTTP server.

## Features

- Simple HTTP server on Bun
- DuckSDK initialization
- Example endpoints with logging
- Minimal dependencies (Bun built-in)

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Add your DuckBug DSN to `.env`:
```env
DUCKBUG_DSN=your-duckbug-dsn-here
```

## Running

Start the server:
```bash
bun run dev
```

The server will be available at `http://localhost:3000`

## API Endpoints

- `GET /` - Health check
- `GET /log` - Test log level
- `GET /debug` - Test debug level
- `GET /warn` - Test warn level
- `GET /error` - Test error level
- `GET /fatal` - Test fatal level
- `GET /quack` - Test error reporting

## Usage

The example includes:
- `src/index.ts` - Bun HTTP server with DuckSDK integration

## Example Code

```typescript
import { DuckSDK, DuckBugProvider } from '@duckbug/js';

const providers = [
  new DuckBugProvider({
    dsn: process.env.DUCKBUG_DSN || '',
  }),
];

const duck = new DuckSDK(providers);

Bun.serve({
  port: 3000,
  fetch(req) {
    duck.log('Request', { method: req.method, path: req.url });
    return new Response('Hello from Bun!');
  },
});
```

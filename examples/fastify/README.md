# DuckBug.js Fastify Example

This example demonstrates how to integrate `@duckbug/js` into a Fastify application using a plugin.

## Features

- Fastify plugin for DuckBug integration
- Plugin registration
- Example routes with logging
- TypeScript support

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

Start the development server:
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
- `src/duckbug.ts` - DuckSDK initialization
- `src/index.ts` - Fastify app with plugin registration
- `src/routes.ts` - Example routes

## Example Code

```typescript
import Fastify from 'fastify';
import { duck } from './duckbug';

const fastify = Fastify();

// Register DuckBug as a decorator
fastify.decorate('duck', duck);

fastify.get('/my-route', async (request, reply) => {
  fastify.duck.log('Route accessed', { path: '/my-route' });
  return { message: 'Success' };
});
```

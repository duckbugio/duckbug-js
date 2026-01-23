# DuckBug.js AdonisJS Example

This example demonstrates how to integrate `@duckbug/js` into an AdonisJS application using a service.

## Features

- AdonisJS service for DuckBug integration
- Example usage in routes
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

The server will be available at `http://localhost:3333`

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
- `app/services/duckbug.ts` - Service that provides DuckSDK instance
- `start/routes.ts` - Example routes using the service

## Example Code

```typescript
import duckBug from '#services/duckbug';

router.get('/my-route', async ({ response }) => {
  duckBug.log('Route accessed', { path: '/my-route' });
  return response.json({ message: 'Success' });
});
```

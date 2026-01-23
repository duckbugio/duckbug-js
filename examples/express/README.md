# DuckBug.js Express Example

This example demonstrates how to integrate `@duckbug/js` into an Express.js application with middleware for request logging.

## Features

- Express middleware for logging requests
- DuckSDK initialization
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
- `src/index.ts` - Express app with middleware
- `src/routes.ts` - Example routes

## Example Code

```typescript
import express from 'express';
import { duck } from './duckbug';

const app = express();

// Middleware for logging requests
app.use((req, res, next) => {
  duck.log('Request', { method: req.method, path: req.path });
  next();
});

app.get('/my-route', (req, res) => {
  duck.log('Route accessed', { path: '/my-route' });
  res.json({ message: 'Success' });
});
```

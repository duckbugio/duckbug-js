# DuckBug.js NestJS Example

This example demonstrates how to integrate `@duckbug/js` into a NestJS application using a module and injectable service.

## Features

- NestJS module (`DuckBugModule`) for dependency injection
- Injectable service (`DuckBugService`) for easy usage
- Example controller demonstrating logging
- TypeScript configuration for NestJS

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
bun run start:dev
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
- `duckbug.module.ts` - Module that provides DuckSDK instance
- `duckbug.service.ts` - Injectable service wrapping DuckSDK
- `app.controller.ts` - Example controller using the service

## Example Code

```typescript
import { Injectable } from '@nestjs/common';
import { DuckBugService } from './duckbug/duckbug.service';

@Injectable()
export class MyService {
  constructor(private readonly duckBug: DuckBugService) {}

  doSomething() {
    this.duckBug.log('Action performed', { userId: 123 });
  }
}
```

# DuckBug.js Examples

This directory contains example integrations of `@duckbug/js` with various JavaScript frameworks and runtimes.

## Available Examples

- **[React](./react/)** - React application with Context API and custom hooks
- **[NestJS](./nestjs/)** - NestJS backend with module and service integration
- **[AdonisJS](./adonisjs/)** - AdonisJS application with service integration
- **[Express](./express/)** - Express.js server with middleware
- **[Fastify](./fastify/)** - Fastify server with plugin integration
- **[Bun](./bun/)** - Bun.js HTTP server example

## Quick Start

1. Choose an example that matches your framework
2. Navigate to the example directory
3. Copy `.env.example` to `.env` and add your DuckBug DSN
4. Install dependencies: `bun install`
5. Run the example: `bun run dev` (or see example-specific README)

## Setting Up Your DSN

All examples require a DuckBug DSN (Data Source Name) to send logs and errors. 

1. Sign up at [DuckBug.io](https://duckbug.io)
2. Create a project
3. Copy your DSN from the project settings
4. Add it to `.env` file in the example directory:

```env
DUCKBUG_DSN=your-duckbug-dsn-here
```

## Using Local Library Version

All examples use the local version of `@duckbug/js` from the parent directory via `file:../..` in their `package.json`. This allows you to test changes to the library without publishing.

To use the published version instead, replace:
```json
"@duckbug/js": "file:../.."
```

with:
```json
"@duckbug/js": "^0.1.3"
```

## Framework Documentation

- [React](https://react.dev/)
- [NestJS](https://nestjs.com/)
- [AdonisJS](https://adonisjs.com/)
- [Express](https://expressjs.com/)
- [Fastify](https://www.fastify.io/)
- [Bun](https://bun.sh/)

## Need Help?

- 📖 [DuckBug.js Documentation](../../README.md)
- 🐛 [GitHub Issues](https://github.com/duckbugio/duckbug-js/issues)
- 💬 [DuckBug.io Support](https://duckbug.io)

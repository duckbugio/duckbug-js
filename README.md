# Rsbuild project

## Setup

Install the dependencies:

```bash
yarn install
```

Build lib:

```bash
yarn compile
```


##  Example

### Basic usage
```ts
const providers = [
  new DuckBugPlugin({
    dsn: "123456",
  })
]

const duck = new DuckSDK(providers, {
  logReports: {
    log: false,
    warn: true,
    error: true,
  }
});

duck.log('Info message', { message: 'All good' })
duck.debug('Debug message', { message: 'All fine' })
duck.warn('Warn message', { message: 'So so' })
duck.error('Error message', { message: 'Ay, Caramba!' })
```

### Create own plugin
```ts
class TelegramProvider extends Providers {
  log(...args: unknown[]): void {
    //send to telegram log
  }
  warn(...args: unknown[]): void {
    //send to telegram warn
  }
  error(...args: unknown[]): void {
    //send to telegram error
  }
}

const providers = [
  new DuckBugProvider({
    dsn: "123456",
  }),

  new TelegramProvider()
]

new DuckSDK(providers);
```

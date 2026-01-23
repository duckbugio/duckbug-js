# DuckBug.js React Example

This example demonstrates how to integrate `@duckbug/js` into a React application using Context API and custom hooks.

## Features

- React Context for global DuckSDK access
- Custom `useDuckBug` hook for easy usage
- Example component with logging
- Vite for fast development and building

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

The app will be available at `http://localhost:5173`

## Usage

The example includes:
- `DuckBugContext.tsx` - Context provider that initializes DuckSDK
- `useDuckBug` hook - Custom hook to access DuckSDK from any component
- `App.tsx` - Example component demonstrating logging

## Example Code

```tsx
import { useDuckBug } from './DuckBugContext';

function MyComponent() {
  const duck = useDuckBug();

  const handleClick = () => {
    duck.log('Button clicked', { userId: 123 });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

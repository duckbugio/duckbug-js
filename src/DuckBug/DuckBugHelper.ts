import type { ErrorRequest, Stacktrace } from "./DuckBugService";

type ParsedError = {
  file: string;
  line: number;
  stacktrace: Stacktrace;
  context: unknown;
};

function parseStacktrace(stack: string | undefined): {
  file: string;
  line: number;
  stacktrace: Stacktrace;
} {
  let file = "unknown";
  let line = 0;
  let stacktrace: Stacktrace;

  if (stack) {
    const stackLines = stack.split("\n");

    let firstStackLineWithFile = null;
    for (let i = 1; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (
        line.indexOf("at ") !== -1 &&
        (line.indexOf(":") !== -1 || line.indexOf("(") !== -1)
      ) {
        firstStackLineWithFile = line;
        break;
      }
    }

    if (firstStackLineWithFile) {
      const match =
        firstStackLineWithFile.match(/\(([^)]+):(\d+):(\d+)\)/) ||
        firstStackLineWithFile.match(/at\s+.*?\(([^)]+):(\d+):(\d+)\)/) ||
        firstStackLineWithFile.match(/([^:()\s]+):(\d+):(\d+)/);

      if (match?.[1]) {
        file = match[1].replace(/^file:\/\//, "").replace(/^\/+/, "");
        line = parseInt(match[2] || "0", 10);
      }
    }

    stacktrace = {
      raw: stack,
      frames: stackLines
        .filter((line) => line.trim())
        .map((line, index) => ({
          index,
          content: line.trim(),
        })),
    };
  } else {
    stacktrace = {
      raw: "",
      frames: [],
    };
    file = "unknown";
    line = 0;
  }

  return { file, line, stacktrace };
}

function parseContext(contextStr: string | undefined): unknown {
  if (!contextStr) {
    return null;
  }

  try {
    return JSON.parse(contextStr);
  } catch {
    return { message: contextStr };
  }
}

export function parseError(error: Error): ParsedError {
  const { file, line, stacktrace } = parseStacktrace(error.stack);
  const context = parseContext(error.message);

  return {
    file,
    line,
    stacktrace,
    context,
  };
}

export function processError(
  error: Error,
  message: string,
  time: number,
): ErrorRequest {
  const parsed = parseError(error);

  return {
    time,
    message,
    stacktrace: parsed.stacktrace,
    file: parsed.file,
    line: parsed.line,
    context: parsed.context,
  };
}

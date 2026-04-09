import type { DuckBugErrorEvent, IngestJsonValue } from "../contract";
import { SDK_IDENTITY } from "../sdkIdentity";

export type StacktraceFrame = {
  index: number;
  content: string;
};

export type Stacktrace = {
  raw: string;
  frames: StacktraceFrame[];
};

type ParsedError = {
  file: string;
  line: number;
  stacktrace: Stacktrace;
  context: unknown;
};

function tryJsonObjectFromMessage(message: string): IngestJsonValue | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    const v = JSON.parse(message) as unknown;
    if (v !== null && typeof v === "object") {
      return v as IngestJsonValue;
    }
  } catch {
    /* ignore */
  }
  return null;
}

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
      const lineStr = stackLines[i];
      if (
        lineStr.indexOf("at ") !== -1 &&
        (lineStr.indexOf(":") !== -1 || lineStr.indexOf("(") !== -1)
      ) {
        firstStackLineWithFile = lineStr;
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
        .filter((lineStr) => lineStr.trim())
        .map((lineStr, index) => ({
          index,
          content: lineStr.trim(),
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

/**
 * Builds a canonical DuckBug error event: {@link error.message} is the primary
 * `message` field; `tag` is sent as `dTags` for grouping/search.
 */
export function processError(
  error: Error,
  tag: string,
  time: number,
): DuckBugErrorEvent {
  const parsed = parseError(error);
  const message =
    typeof error.message === "string" && error.message.length > 0
      ? error.message
      : "Error";

  const event: DuckBugErrorEvent = {
    time,
    message,
    stacktrace: parsed.stacktrace,
    stacktraceAsString: error.stack ?? "",
    file: parsed.file,
    line: parsed.line,
    exception: {
      type: error.name,
      message: error.message,
    },
    platform: "node",
    sdk: { ...SDK_IDENTITY },
  };

  if (tag.length > 0) {
    event.dTags = [tag];
  }

  const fromJson = tryJsonObjectFromMessage(error.message);
  if (fromJson) {
    event.extra = fromJson;
  }

  return event;
}

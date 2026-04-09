export type TransportFailureInfo = {
  kind: "log" | "error";
  itemCount: number;
  attempts: number;
  error: unknown;
  message: string;
};

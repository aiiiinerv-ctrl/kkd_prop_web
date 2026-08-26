/** A path/value-free error identifier safe to include in operational evidence. */
export function operationalErrorCode(error: unknown): string {
  const candidate =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return /^[A-Z][A-Z0-9_]*$/.test(candidate) ? candidate : "UNKNOWN_ERROR";
}

export class OperationalError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "OperationalError";
    this.code = code;
  }
}

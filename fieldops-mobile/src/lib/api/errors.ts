/**
 * Miroir de l'enveloppe d'erreur globale du backend (AllExceptionsFilter) :
 * { statusCode, message, path, timestamp, code?, missing?, currentStatus? }.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly path?: string;
  readonly timestamp?: string;
  readonly code?: string;
  readonly missing?: string[];
  readonly currentStatus?: string;

  constructor(statusCode: number, body: Record<string, unknown>) {
    const message = Array.isArray(body.message)
      ? (body.message as string[]).join(', ')
      : ((body.message as string | undefined) ?? `Erreur HTTP ${statusCode}`);
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.path = body.path as string | undefined;
    this.timestamp = body.timestamp as string | undefined;
    this.code = body.code as string | undefined;
    this.missing = body.missing as string[] | undefined;
    this.currentStatus = body.currentStatus as string | undefined;
  }
}

/** Réutilisation détectée sur le refresh token (rotation family revoquée côté serveur). */
export function isSessionRevoked(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401 && error.message === 'Session révoquée';
}

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Réseau indisponible');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

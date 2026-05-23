/** Stable idempotency key for backend clientMutationId fields. */
export function newClientMutationId(prefix = 'web'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

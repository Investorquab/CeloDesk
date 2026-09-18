export const ACCOUNT_SESSION_ERROR='Something took a little detour. Your CeloDesk session needs to be refreshed. Please try again.';
export const BACKEND_UNAVAILABLE_ERROR='Something took a little detour. Please try again shortly.';

export function userFacingError(error: unknown, fallback = BACKEND_UNAVAILABLE_ERROR): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (normalized.includes('user rejected') || normalized.includes('user denied') || normalized.includes('request rejected') || normalized.includes('code: 4001')) return 'Payment was cancelled in your wallet.';

  if (
    normalized.includes('invalid or expired session token') ||
    (normalized.includes('authentication') && normalized.includes('expired')) ||
    normalized.includes('401')
  ) return ACCOUNT_SESSION_ERROR;

  if (normalized.includes('403') || normalized.includes('forbidden')) return 'You do not have permission to access this account.';

  if (normalized.includes('409') || normalized.includes('already been recorded')) return 'This action has already been recorded.';

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network error') ||
    normalized.includes('backend is down') ||
    normalized.includes('request failed (502)') ||
    normalized.includes('request failed (503)') ||
    normalized.includes('request failed (504)')
  ) return BACKEND_UNAVAILABLE_ERROR;

  return message || fallback;
}

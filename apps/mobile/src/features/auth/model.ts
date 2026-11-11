export interface AccountUser {
  id: string;
  email: string;
  name: string;
}
export interface AuthPort {
  configured: boolean;
  restore: () => Promise<AccountUser | null>;
  subscribe: (listener: (user: AccountUser | null, recovery: boolean) => void) => () => void;
  signIn: (email: string, password: string) => Promise<AccountUser>;
  signUp: (email: string, password: string, name: string) => Promise<AccountUser | null>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  exchangeCode: (code: string, flowId?: string) => Promise<AccountUser>;
  signOut: () => Promise<void>;
}
export const CONNECTION_PENDING =
  'Las cuentas todavía no están activadas en esta versión. Puedes continuar sin cuenta.';
const unavailable = async (): Promise<never> => {
  throw new Error(CONNECTION_PENDING);
};
export const unconfiguredAuth: AuthPort = {
  configured: false,
  restore: async () => null,
  subscribe: () => () => {},
  signIn: unavailable,
  signUp: unavailable,
  resetPassword: unavailable,
  resendConfirmation: unavailable,
  updatePassword: unavailable,
  exchangeCode: unavailable,
  signOut: async () => {},
};
export function emailError(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254
    ? ''
    : 'Escribe un correo electrónico válido.';
}
export function passwordError(password: string) {
  return password.length >= 8 && new TextEncoder().encode(password).length <= 72
    ? ''
    : 'Usa al menos 8 caracteres y evita una contraseña demasiado larga.';
}
export function authError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'invalid_credentials') return 'El correo o la contraseña no son correctos.';
  if (code === 'email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (code === 'weak_password') return 'Elige una contraseña más segura.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit')
    return 'Espera un momento antes de volver a intentarlo.';
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'bad_code_verifier' ||
    code === 'pkce_code_verifier_not_found'
  )
    return 'El enlace venció o se abrió en otro dispositivo. Solicita uno nuevo y ábrelo en el mismo dispositivo.';
  return 'No pudimos completar la solicitud. Revisa tu conexión y vuelve a intentarlo.';
}
export function parseAuthCallback(value: string, webOrigin: string) {
  try {
    const url = new URL(value);
    const native =
      url.protocol === 'honeyflower:' && url.hostname === 'auth' && url.pathname === '/callback';
    const web = url.origin === webOrigin && url.pathname === '/cuenta/callback';
    if (!native && !web) return null;
    if (url.searchParams.has('error') || url.searchParams.has('error_code'))
      return { code: '', recovery: false, flowId: '' };
    const code = url.searchParams.get('code') ?? '';
    const flowId = url.searchParams.get('sb_flow_id') ?? '';
    return {
      code: code.length <= 2048 ? code : '',
      recovery: url.searchParams.get('flow') === 'recovery',
      flowId: /^[a-zA-Z0-9_-]{8,64}$/.test(flowId) ? flowId : '',
    };
  } catch {
    return null;
  }
}

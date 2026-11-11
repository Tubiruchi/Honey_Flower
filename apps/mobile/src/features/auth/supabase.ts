import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { unconfiguredAuth } from './model';
import type { AccountUser, AuthPort } from './model';

const userView = (user: User): AccountUser => ({
  id: user.id,
  email: user.email ?? '',
  name:
    typeof user.user_metadata?.preferred_name === 'string' ? user.user_metadata.preferred_name : '',
});
/** Public client key only. No service-role key, passwords, habit data or photos in this module. */
export function createSupabaseAuth(config?: { url?: string; key?: string }): AuthPort {
  const url = (config?.url ?? import.meta.env.VITE_SUPABASE_URL)?.trim();
  const key = (config?.key ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!url || !key) return unconfiguredAuth;
  // Reject private/server keys and malformed configuration rather than creating a broken client.
  if (!/^https:\/\/[^/]+(?:\/)?$/.test(url) || !key.startsWith('sb_publishable_'))
    return unconfiguredAuth;
  const client = createClient(url, key, {
    auth: {
      storageKey: 'honeyflower.auth.v1',
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  const redirect = (recovery = false) =>
    `${
      Capacitor.isNativePlatform()
        ? 'honeyflower://auth/callback'
        : `${window.location.origin}/cuenta/callback`
    }${recovery ? '?flow=recovery' : ''}`;
  let exchange: { code: string; task: Promise<AccountUser> } | null = null;
  return {
    configured: true,
    async restore() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session ? userView(data.session.user) : null;
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Keep synchronous: awaiting another auth call here can deadlock the SDK's session lock.
        listener(session ? userView(session.user) : null, event === 'PASSWORD_RECOVERY');
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return userView(data.user);
    },
    async signUp(email, password, name) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirect(),
          data: { preferred_name: name },
        },
      });
      if (error) throw error;
      // A user object alone is not an authenticated session when confirmation is enabled.
      return data.session ? userView(data.session.user) : null;
    },
    async resetPassword(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirect(true),
      });
      if (error) throw error;
    },
    async resendConfirmation(email) {
      const { error } = await client.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirect() },
      });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    exchangeCode(code, flowId) {
      const exchangeKey = `${code}:${flowId ?? ''}`;
      if (exchange?.code === exchangeKey) return exchange.task;
      const task = (async () => {
        const { data, error } = await client.auth.exchangeCodeForSession(
          code,
          flowId ? { flowId } : undefined,
        );
        if (error) throw error;
        if (!data.session) throw new Error('No session');
        return userView(data.session.user);
      })();
      exchange = { code: exchangeKey, task };
      return task;
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  };
}

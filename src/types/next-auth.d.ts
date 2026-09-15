import type { DefaultSession } from 'next-auth';

// NextAuth's default Session["user"] shape has no `id`. This feature's ownership
// enforcement (every task query filters by session.user.id) requires it, so we
// augment the type here to match what the `session` callback in `src/lib/auth.ts`
// actually attaches at runtime.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { prisma } from './prisma';

// Gate 1-approved architecture (docs/agent-handoffs/research.md): GoogleProvider +
// PrismaAdapter, database session strategy (real `Session` rows via the adapter,
// not JWT), so `getServerSession(authOptions)` performs a real DB lookup per
// request and a session can be established in tests by seeding a `User` +
// `Session` row directly, without any interactive Google consent.
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Always show Google's account chooser on sign-in, rather than silently
      // re-authenticating with whichever Google account is already active in
      // the browser. Without this, a user who wants to switch accounts must
      // first sign out of Google itself in a separate tab (confirmed by live
      // testing: app sign-out correctly ends the app session, but the next
      // sign-in silently reuses the same Google account instead of prompting).
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  callbacks: {
    // With the database strategy, the adapter passes the full `User` row (not a
    // JWT) here. Attach its id to `session.user.id` so every task Route Handler
    // has a server-verified owner id to filter on (see src/types/next-auth.d.ts).
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

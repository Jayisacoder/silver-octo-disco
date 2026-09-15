// Test-only ESM loader hook (Node's `module.register()` API).
//
// WHY THIS EXISTS: the Route Handler modules under src/app/api are authored
// as plain TypeScript importing via the `@/*` path alias (see tsconfig.json),
// which only Next.js's own bundler (webpack/SWC) knows how to resolve. Under
// plain `node --test` there is no bundler in the loop, so three unrelated
// Node/CJS-interop gaps show up when importing those files directly:
//
//   1. `@/lib/...` is not a real specifier Node can resolve on its own -
//      it has to be mapped back to `src/...` by hand.
//   2. Several first-party and third-party modules are imported without an
//      extension (`./prisma`, `next/server`, `next-auth/next`, ...). Node's
//      native ESM resolver (unlike its CJS `require`) does not auto-append
//      `.js`/`.ts`, so these fail to resolve unless we retry with an
//      extension.
//   3. `next-auth/providers/google` and `@next-auth/prisma-adapter` are CJS
//      packages built with TS's `esModuleInterop` (`exports.default = X`).
//      Node's native dynamic `import()` of a CJS module does NOT unwrap that
//      the way webpack/ts-node do - `import Default from 'pkg'` resolves to
//      the *whole* `module.exports` object, not `module.exports.default`, so
//      `GoogleProvider(...)` blows up as "not a function". This is a Node
//      runtime/tooling gap, not an application bug - `require()`-ing the same
//      package (no ESM interop involved) returns the correct shape, so we use
//      `createRequire` under the hood for just those two specifiers.
//
// None of this changes what src/** actually does; it only lets Node load the
// real, unmodified route handler + auth config modules without Next's
// bundler. `next-auth/next` additionally gets a fully fake implementation
// (see below) because the real `getServerSession()` reads request context
// via `next/headers`' AsyncLocalStorage, which only exists inside a live
// Next.js request - there is no live server in this environment, so that
// call is the deliberate mocked seam (comparable to mocking the Prisma
// client), not an attempt to fake application logic.

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());
const srcDir = path.join(rootDir, 'src');

// Packages that need a require()-based default-export unwrap (see point 3
// above). Handled entirely by requiring the *real* package - only the
// export shape is fixed, not the behavior.
const CJS_INTEROP_SHIMS = new Set(['next-auth/providers/google', '@next-auth/prisma-adapter']);

// Packages replaced outright with a small test-controllable fake.
// `next-auth/next` is the auth boundary this suite mocks (see file header).
const FAKE_MODULES = new Set(['next-auth/next']);

export async function resolve(specifier, context, nextResolve) {
  if (FAKE_MODULES.has(specifier) || CJS_INTEROP_SHIMS.has(specifier)) {
    return { url: 'testshim:' + specifier, shortCircuit: true };
  }

  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    const candidate = pathToFileURL(path.join(srcDir, rel + '.ts')).href;
    return nextResolve(candidate, context);
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
      const isBare = !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('file:');
      // Bare package specifiers missing a `.js` extension (e.g. `next/server`);
      // relative first-party specifiers missing a `.ts` extension (e.g. `./prisma`).
      return nextResolve(specifier + (isBare ? '.js' : '.ts'), context);
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('testshim:')) {
    return nextLoad(url, context);
  }

  const realSpecifier = url.slice('testshim:'.length);
  let source;

  if (realSpecifier === '@next-auth/prisma-adapter') {
    source = `
      import { createRequire } from 'node:module';
      const require = createRequire(${JSON.stringify(import.meta.url)});
      const pkg = require(${JSON.stringify(realSpecifier)});
      export const PrismaAdapter = pkg.PrismaAdapter;
    `;
  } else if (realSpecifier === 'next-auth/providers/google') {
    source = `
      import { createRequire } from 'node:module';
      const require = createRequire(${JSON.stringify(import.meta.url)});
      const pkg = require(${JSON.stringify(realSpecifier)});
      export default pkg.default ?? pkg;
    `;
  } else if (realSpecifier === 'next-auth/next') {
    // The mocked auth boundary. Tests control the "logged in as" state via
    // globalThis.__UNIT_TEST_SESSION__ (see tests/helpers/route-test-helpers.mjs)
    // rather than by exercising real Google OAuth / a real database Session
    // row - see file header and docs/agent-handoffs/unit-testing.md for why.
    source = `
      export async function getServerSession() {
        return globalThis.__UNIT_TEST_SESSION__ ?? null;
      }
    `;
  }

  return { format: 'module', source, shortCircuit: true };
}

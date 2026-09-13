import { NextResponse } from 'next/server';

// Structured 500 response for an unexpected failure (e.g. a real Prisma/
// database error), matching the `{ error }` shape every other failure path in
// this feature already uses (401 `Unauthorized`, 404 `NotFound`, 422
// `ValidationError`, 400 `InvalidJSON`) instead of falling through to Next.js's
// generic, unshaped 500. Not a stack-trace leak either way — this just keeps
// the response body consistent with the rest of the API.
export function internalErrorResponse() {
  return NextResponse.json({ error: 'InternalError' }, { status: 500 });
}

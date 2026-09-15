import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

import { internalErrorResponse } from '@/lib/api-errors';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatZodError, updateTaskSchema } from '@/lib/validation';

interface RouteContext {
  params: { id: string };
}

// Ownership/IDOR pattern (docs/agent-handoffs/research.md): every read, update,
// and delete filters by { id, userId: session.user.id } in the *same* Prisma
// call — never fetch-by-id-then-check-owner-after. A task that doesn't exist and
// a task owned by another user both resolve to an identical 404, never a 403,
// so an attacker can't use the response to distinguish "not yours" from
// "doesn't exist" and enumerate other users' task ids.

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let task;
  try {
    task = await prisma.task.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
  } catch {
    return internalErrorResponse();
  }

  if (!task) {
    return NextResponse.json({ error: 'NotFound' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'InvalidJSON', fields: {} }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 422 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: 'ValidationError', fields: { _: 'At least one field must be provided' } },
      { status: 422 },
    );
  }

  // `update()` requires a unique `where` and `id` alone is unique, so it could
  // not be made to also filter by userId in one call. `updateMany()` accepts an
  // arbitrary where clause and reports how many rows matched, which is what lets
  // the ownership filter and the mutation happen in a single Prisma call.
  let task;
  try {
    const result = await prisma.task.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: parsed.data,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'NotFound' }, { status: 404 });
    }

    task = await prisma.task.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
  } catch {
    return internalErrorResponse();
  }

  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // deleteMany with the compound where is idempotent-safe: a nonexistent or
  // already-deleted task simply matches zero rows, which we report as 404
  // rather than letting a "record not found" error surface as a 500.
  let result;
  try {
    result = await prisma.task.deleteMany({
      where: { id: params.id, userId: session.user.id },
    });
  } catch {
    return internalErrorResponse();
  }

  if (result.count === 0) {
    return NextResponse.json({ error: 'NotFound' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

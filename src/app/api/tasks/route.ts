import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

import { internalErrorResponse } from '@/lib/api-errors';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createTaskSchema, formatZodError } from '@/lib/validation';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let tasks;
  try {
    tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return internalErrorResponse();
  }

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
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

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 422 });
  }

  // userId always comes from the server-verified session, never the request body
  // (createTaskSchema is `.strict()`, so a client-supplied `userId` is already
  // rejected as an unknown key before we even get here).
  let task;
  try {
    task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        userId: session.user.id,
      },
    });
  } catch {
    return internalErrorResponse();
  }

  return NextResponse.json({ task }, { status: 201 });
}

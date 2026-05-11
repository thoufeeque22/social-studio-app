import { NextResponse } from 'next/server';
import { getLaunchTasks, moveLaunchItem } from '@/lib/core/backlog-manager';
import { auth } from '@/auth';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getLaunchTasks();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/launch error:", error);
    return NextResponse.json({ error: 'Failed to read launch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status, section, index } = await request.json();
    
    await moveLaunchItem(id, section, status, index);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update launch tasks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, description, section } = await request.json();
    
    const { createLaunchTask } = await import('@/lib/core/backlog-manager');
    const newTask = await createLaunchTask(title, description, section);
    
    return NextResponse.json({ success: true, task: newTask });
  } catch {
    return NextResponse.json({ error: 'Failed to create launch task' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, title, description } = await request.json();
    const { updateLaunchTask } = await import('@/lib/core/backlog-manager');
    await updateLaunchTask(id, title, description);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update launch task text' }, { status: 500 });
  }
}

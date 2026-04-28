import { NextResponse } from 'next/server';
import { getLaunchTasks, moveLaunchItem } from '@/lib/core/backlog-manager';

export async function GET() {
  try {
    const data = await getLaunchTasks();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/launch error:", error);
    return NextResponse.json({ error: 'Failed to read launch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, status, section, index } = await request.json();
    
    await moveLaunchItem(id, section, status, index);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update launch tasks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { title, description, section } = await request.json();
    
    const { createLaunchTask } = await import('@/lib/core/backlog-manager');
    const newTask = await createLaunchTask(title, description, section);
    
    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create launch task' }, { status: 500 });
  }
}

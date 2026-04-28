import { NextResponse } from 'next/server';
import { getBacklog, moveBacklogItem } from '@/lib/core/backlog-manager';

export async function GET() {
  try {
    const data = await getBacklog();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read backlog' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, status, section, index } = await request.json();
    
    await moveBacklogItem(id, section, status, index);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update backlog' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { title, description, section } = await request.json();
    
    // Using import dynamically to avoid rewriting the whole file structure here
    // or just assume createRoadmapTask is exported from backlog-manager
    const { createRoadmapTask } = await import('@/lib/core/backlog-manager');
    const newTask = await createRoadmapTask(title, description, section);
    
    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create roadmap task' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, title, description } = await request.json();
    const { updateRoadmapTask } = await import('@/lib/core/backlog-manager');
    await updateRoadmapTask(id, title, description);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update roadmap task text' }, { status: 500 });
  }
}

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

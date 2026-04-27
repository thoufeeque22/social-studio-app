import { NextResponse } from 'next/server';
import { getBacklog, updateBacklogItem } from '@/lib/core/backlog-manager';

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
    const { title, status, section } = await request.json();
    
    // If we have a section, it's a move. Otherwise it's a status toggle.
    if (section) {
      await moveBacklogItem(title, section, status);
    } else {
      // Find current item to decide new status if not provided
      const backlog = await getBacklog();
      let item: any;
      for (const s in backlog) {
        item = backlog[s].find(i => i.title === title) || item;
      }
      const newStatus = status || (item?.status === 'completed' ? 'pending' : 'completed');
      const newSection = newStatus === 'completed' ? 'Completed' : (item?.priority || 'High Priority');
      
      await moveBacklogItem(title, newSection, newStatus);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update backlog' }, { status: 500 });
  }
}

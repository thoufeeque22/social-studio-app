import { prisma } from '@/lib/core/prisma';
import { RoadmapTask } from '@prisma/client';

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress';
  priority: string;
}

/**
 * Retrieves all roadmap tasks from the database and groups them by priority
 */
export async function getBacklog() {
  const tasks = await prisma.roadmapTask.findMany({
    orderBy: { order: 'asc' }
  });

  const backlog: Record<string, BacklogItem[]> = {
    'Critical': [],
    'High Priority': [],
    'Medium Priority': [],
    'Low Priority': [],
    'Completed': []
  };

  tasks.forEach(task => {
    const item: BacklogItem = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status as any,
      priority: task.priority
    };

    if (task.status === 'completed') {
      backlog['Completed'].push(item);
    } else if (backlog[task.priority]) {
      backlog[task.priority].push(item);
    } else {
      backlog['High Priority'].push(item);
    }
  });

  return backlog;
}

/**
 * Updates a roadmap task in the database
 */
export async function moveBacklogItem(id: string, newSection: string, newStatus?: string, newIndex?: number) {
  // 1. Find the target task
  const task = await prisma.roadmapTask.findUnique({ where: { id } });
  if (!task) throw new Error('Task not found');

  // 2. Prepare updates
  const updateData: any = {};
  if (newStatus) updateData.status = newStatus;
  
  const prioritySections = ['Critical', 'High Priority', 'Medium Priority', 'Low Priority'];
  if (prioritySections.includes(newSection)) {
    updateData.priority = newSection;
  }

  // 3. Handle ordering (Re-order all tasks in the target section)
  const targetPriority = updateData.priority || task.priority;
  const targetStatus = updateData.status || task.status;

  // Fetch all tasks in the target category to recalculate order
  const siblingTasks = await prisma.roadmapTask.findMany({
    where: { 
      priority: targetPriority,
      status: targetStatus,
      NOT: { id: id }
    },
    orderBy: { order: 'asc' }
  });

  // Insert current task at desired index
  const insertAt = (newIndex !== undefined && newIndex >= 0) ? Math.min(newIndex, siblingTasks.length) : siblingTasks.length;
  siblingTasks.splice(insertAt, 0, { ...task, ...updateData } as any);

  // Perform bulk update for order
  await Promise.all(siblingTasks.map((t, idx) => 
    prisma.roadmapTask.update({
      where: { id: t.id },
      data: { 
        ... (t.id === id ? updateData : {}),
        order: idx 
      }
    })
  ));
}

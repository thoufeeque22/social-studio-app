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
    'On-Hold': [],
    'Completed': []
  };

  tasks.forEach((task: any) => {
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
  
  const prioritySections = ['Critical', 'High Priority', 'Medium Priority', 'Low Priority', 'On-Hold'];
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
  await Promise.all(siblingTasks.map((t: any, idx: number) => 
    prisma.roadmapTask.update({
      where: { id: t.id },
      data: { 
        ... (t.id === id ? updateData : {}),
        order: idx 
      }
    })
  ));
}

export async function updateRoadmapTask(id: string, title: string, description: string) {
  return prisma.roadmapTask.update({
    where: { id },
    data: { title, description }
  });
}

export async function createRoadmapTask(title: string, description: string, priority: string) {
  // Find the max order in the current priority
  const maxOrderTask = await prisma.roadmapTask.findFirst({
    where: { priority, status: 'pending' },
    orderBy: { order: 'desc' }
  });

  const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

  return prisma.roadmapTask.create({
    data: {
      title,
      description,
      priority,
      status: 'pending',
      order: nextOrder
    }
  });
}

export interface LaunchItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress';
  category: string;
}

export async function getLaunchTasks() {
  const tasks = await prisma.launchTask.findMany({
    orderBy: { order: 'asc' }
  });

  const backlog: Record<string, LaunchItem[]> = {
    'App Store': [],
    'Marketing': [],
    'Legal': [],
    'Completed': []
  };

  tasks.forEach((task: any) => {
    const item: LaunchItem = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status as any,
      category: task.category
    };

    if (task.status === 'completed') {
      backlog['Completed'].push(item);
    } else if (backlog[task.category]) {
      backlog[task.category].push(item);
    } else {
      backlog['Marketing'].push(item);
    }
  });

  return backlog;
}

export async function moveLaunchItem(id: string, newSection: string, newStatus?: string, newIndex?: number) {
  const task = await prisma.launchTask.findUnique({ where: { id } });
  if (!task) throw new Error('Task not found');

  const updateData: any = {};
  if (newStatus) updateData.status = newStatus;
  
  const categorySections = ['App Store', 'Marketing', 'Legal'];
  if (categorySections.includes(newSection)) {
    updateData.category = newSection;
  }

  const targetCategory = updateData.category || task.category;
  const targetStatus = updateData.status || task.status;

  const siblingTasks = await prisma.launchTask.findMany({
    where: { 
      category: targetCategory,
      status: targetStatus,
      NOT: { id: id }
    },
    orderBy: { order: 'asc' }
  });

  const insertAt = (newIndex !== undefined && newIndex >= 0) ? Math.min(newIndex, siblingTasks.length) : siblingTasks.length;
  siblingTasks.splice(insertAt, 0, { ...task, ...updateData } as any);

  await Promise.all(siblingTasks.map((t: any, idx: number) => 
    prisma.launchTask.update({
      where: { id: t.id },
      data: { 
        ... (t.id === id ? updateData : {}),
        order: idx 
      }
    })
  ));
}

export async function updateLaunchTask(id: string, title: string, description: string) {
  return prisma.launchTask.update({
    where: { id },
    data: { title, description }
  });
}

export async function createLaunchTask(title: string, description: string, category: string) {
  const maxOrderTask = await prisma.launchTask.findFirst({
    where: { category, status: 'pending' },
    orderBy: { order: 'desc' }
  });

  const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

  return prisma.launchTask.create({
    data: {
      title,
      description,
      category,
      status: 'pending',
      order: nextOrder
    }
  });
}

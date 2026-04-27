import fs from 'fs';
import path from 'path';

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress';
  priority: string;
}

const BACKLOG_PATH = path.join(process.cwd(), 'BACKLOG.md');

/**
 * Parses BACKLOG.md into a structured format with multi-line support
 */
export async function getBacklog() {
  const content = fs.readFileSync(BACKLOG_PATH, 'utf8');
  const lines = content.split('\n');
  
  const backlog: Record<string, BacklogItem[]> = {
    'Critical': [],
    'High Priority': [],
    'Medium Priority': [],
    'Low Priority': [],
    'Completed': []
  };

  let currentSection = '';
  let currentItem: BacklogItem | null = null;

  for (const line of lines) {
    // 1. Detect Section Headers
    const sectionMatch = line.match(/^## (.*?) [🚨🚀📈📉✅]/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      currentItem = null;
      continue;
    }

    // 2. Detect New Task Items
    const itemMatch = line.match(/^- \[( |x|\/)\] \*\*(.*?)\*\*: (.*)/);
    if (itemMatch && currentSection) {
      const [_, checkbox, title, description] = itemMatch;
      const status = checkbox === 'x' ? 'completed' : checkbox === '/' ? 'in-progress' : 'pending';
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Deduplicate: If an item with this ID already exists, skip it
      const alreadyExists = Object.values(backlog).some(section => section.some(item => item.id === id));
      if (alreadyExists) continue;

      currentItem = {
        id,
        title,
        description,
        status,
        priority: currentSection
      };

      if (status === 'completed') {
        backlog['Completed'].push(currentItem);
      } else if (backlog[currentSection]) {
        backlog[currentSection].push(currentItem);
      }
      continue;
    }

    // 3. Accumulate Multi-line descriptions and sub-bullets
    if (currentItem && line.trim() !== '' && !line.startsWith('##')) {
      // Append line with a newline for formatting, trimming excess indentation but keeping list markers
      const trimmedLine = line.trimStart();
      currentItem.description += '\n' + trimmedLine;
    }
  }

  return backlog;
}

/**
 * Moves an item to a new section or changes its status
 */
export async function moveBacklogItem(id: string, newSection: string, newStatus?: 'pending' | 'completed' | 'in-progress', newIndex?: number) {
  const backlog = await getBacklog();
  
  let foundItem: BacklogItem | undefined;
  
  // Remove from all sections
  for (const section in backlog) {
    const index = backlog[section].findIndex(i => i.id === id);
    if (index !== -1) {
      [foundItem] = backlog[section].splice(index, 1);
      break;
    }
  }

  if (!foundItem) throw new Error('Item not found');

  if (newStatus) foundItem.status = newStatus;
  
  // Update priority metadata strictly based on the target section
  const prioritySections = ['Critical', 'High Priority', 'Medium Priority', 'Low Priority'];
  if (prioritySections.includes(newSection)) {
    foundItem.priority = newSection;
  } else if (newSection === 'Completed') {
    // Keep original priority for unchecking, but move to Completed list
  }

  // Add to new section at specific index
  if (backlog[newSection]) {
    const targetList = backlog[newSection];
    const insertAt = (newIndex !== undefined && newIndex >= 0) ? Math.min(newIndex, targetList.length) : targetList.length;
    targetList.splice(insertAt, 0, foundItem);
  } else {
    // If it was completed and moved back, use its stored priority or default to High
    const target = (foundItem.priority && backlog[foundItem.priority]) 
      ? foundItem.priority 
      : 'High Priority';
    
    foundItem.priority = target;
    const targetList = backlog[target];
    const insertAt = (newIndex !== undefined && newIndex >= 0) ? Math.min(newIndex, targetList.length) : targetList.length;
    targetList.splice(insertAt, 0, foundItem);
  }

  // Reconstruct file
  let newContent = '';
  const sections = [
    { name: 'Critical', emoji: '🚨' },
    { name: 'High Priority', emoji: '🚀' },
    { name: 'Medium Priority', emoji: '📈' },
    { name: 'Low Priority', emoji: '📉' }
  ];

  for (const s of sections) {
    newContent += `## ${s.name} ${s.emoji}\n`;
    for (const item of backlog[s.name]) {
      const box = item.status === 'in-progress' ? '/' : ' ';
      newContent += `- [${box}] **${item.title}**: ${item.description}\n`;
    }
    newContent += '\n';
  }

  newContent += `## Completed ✅\n`;
  for (const item of backlog['Completed']) {
    newContent += `- [x] **${item.title}**: ${item.description}\n`;
  }

  fs.writeFileSync(BACKLOG_PATH, newContent.trim() + '\n');
}

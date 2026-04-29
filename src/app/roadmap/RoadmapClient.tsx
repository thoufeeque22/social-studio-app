"use client";

import React, { useEffect, useState } from 'react';
import { 
  DndContext, 
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  CheckCircle2, 
  Circle, 
  Zap,
  Terminal,
  Loader2,
  GripVertical,
  Timer,
  Plus,
  X,
  Pencil
} from 'lucide-react';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress';
  priority: string;
}

type BacklogData = Record<string, BacklogItem[]>;

// --- Components ---

function SortableItem({ 
  item, 
  index, 
  sections,
  onToggle, 
  onSaveEdit,
  onMove
}: { 
  item: BacklogItem; 
  index: number; 
  sections: string[];
  onToggle: (item: BacklogItem) => void; 
  onSaveEdit: (item: BacklogItem, title: string, desc: string) => Promise<void>;
  onMove: (item: BacklogItem, newSection: string) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description);
  const [isSaving, setIsSaving] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 100 : 1,
    borderBottom: '1px solid hsla(var(--border) / 0.3)',
    background: isDragging ? 'hsla(var(--primary) / 0.1)' : 'transparent',
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <div style={{ padding: '0.75rem', background: 'hsla(var(--primary) / 0.05)' }}>
          <input 
            type="text" 
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid hsla(var(--border) / 0.5)', background: 'hsl(var(--background))', color: 'inherit' }}
            autoFocus
          />
          <textarea 
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid hsla(var(--border) / 0.5)', background: 'hsl(var(--background))', color: 'inherit', minHeight: '60px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button 
              onClick={() => { setIsEditing(false); setEditTitle(item.title); setEditDesc(item.description); }}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px', background: 'none', border: '1px solid hsla(var(--border) / 0.5)', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                setIsSaving(true);
                await onSaveEdit(item, editTitle, editDesc);
                setIsSaving(false);
                setIsEditing(false);
              }}
              disabled={isSaving || !editTitle.trim()}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px', background: 'hsl(var(--primary))', border: 'none', color: 'hsl(var(--primary-foreground))', cursor: editTitle.trim() ? 'pointer' : 'not-allowed', opacity: editTitle.trim() ? 1 : 0.5 }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.4rem 0.75rem' }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', marginTop: '0.25rem' }}>
          <GripVertical size={14} />
        </div>

        <div style={{ fontSize: '0.7rem', color: 'hsla(var(--muted-foreground) / 0.5)', fontWeight: 'bold', width: '1.2rem', marginTop: '0.25rem' }}>
          {index + 1}.
        </div>
        
        <button 
          onClick={() => onToggle(item)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: 0, 
            cursor: 'pointer',
            color: item.status === 'completed' ? 'hsl(var(--primary))' : 
                   item.status === 'in-progress' ? 'hsl(var(--primary))' : 
                   'hsl(var(--muted-foreground))',
            display: 'flex',
            alignItems: 'center',
            marginTop: '0.25rem'
          }}
        >
          {item.status === 'completed' ? <CheckCircle2 size={16} /> : 
           item.status === 'in-progress' ? <Timer size={16} /> : 
           <Circle size={16} />}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: '600',
            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
            color: item.status === 'completed' ? 'hsl(var(--muted-foreground))' : 
                   item.status === 'in-progress' ? 'hsl(var(--primary))' : 'inherit',
          }}>
            {item.title}
          </span>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'hsl(var(--muted-foreground))', 
            lineHeight: '1.3', 
            whiteSpace: 'pre-wrap'
          }}>
            {item.description}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <select
            value={item.status === 'completed' ? 'Completed' : item.priority}
            onChange={(e) => onMove(item, e.target.value)}
            style={{ 
              fontSize: '0.65rem', 
              background: 'hsla(var(--muted) / 0.3)', 
              border: '1px solid hsla(var(--border) / 0.5)', 
              borderRadius: '4px',
              padding: '1px 4px',
              color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {sections.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {item.status === 'pending' && item.priority !== 'Completed' && (
            <Zap size={12} style={{ color: 'hsla(var(--primary) / 0.5)' }} />
          )}
          <button
            onClick={() => setIsEditing(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'hsl(var(--muted-foreground))', display: 'flex' }}
            title="Edit task"
          >
            <Pencil size={12} style={{ opacity: 0.6 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DroppableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', minHeight: '30px', borderRadius: '4px', overflow: 'hidden', border: '1px solid hsla(var(--border) / 0.2)', background: 'hsla(var(--card) / 0.2)' }}>
      {children}
    </div>
  );
}

export default function RoadmapClient() {
  const [backlog, setBacklog] = useState<BacklogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<BacklogItem | null>(null);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchBacklog();
  }, []);

  const fetchBacklog = async () => {
    try {
      const res = await fetch('/api/roadmap');
      const data = await res.json();
      setBacklog(data);
    } catch (err) {
      console.error("Failed to fetch backlog");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = Object.values(backlog || {}).flat().find(i => i.id === active.id);
    if (item) setActiveItem(item);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !backlog) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = Object.keys(backlog).find(key => backlog[key].some(i => i.id === activeId));
    const overContainer = Object.keys(backlog).find(key => key === overId || backlog[key].some(i => i.id === overId));

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setBacklog(prev => {
      if (!prev) return prev;
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.findIndex(i => i.id === activeId);
      const [movedItem] = activeItems.splice(activeIndex, 1);
      
      movedItem.priority = overContainer;
      movedItem.status = overContainer === 'Completed' ? 'completed' : 'pending';

      const overIndex = prev[overContainer].findIndex(i => i.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(newIndex, 0, movedItem);

      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over || !backlog) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = Object.keys(backlog).find(key => backlog[key].some(i => i.id === activeId));
    const overContainer = Object.keys(backlog).find(key => key === overId || backlog[key].some(i => i.id === overId));

    if (activeContainer && overContainer) {
      const items = [...backlog[overContainer]];
      const activeIndex = items.findIndex(i => i.id === activeId);
      const overIndex = items.findIndex(i => i.id === overId);

      if (activeIndex !== overIndex && overIndex !== -1) {
        // Calculate the NEW items list immediately
        const updatedItems = arrayMove(items, activeIndex, overIndex);
        const finalIndex = updatedItems.findIndex(i => i.id === activeId);

        setBacklog(prev => {
          if (!prev) return prev;
          return { ...prev, [overContainer]: updatedItems };
        });

        // Sync with server using the calculated final index
        const item = items.find(i => i.id === activeId);
        if (item) {
          await fetch('/api/roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: item.id, 
              section: overContainer,
              status: item.status,
              index: finalIndex
            })
          });
          await fetchBacklog();
        }
      } else if (activeContainer !== overContainer) {
        // Cross-container moves are handled by handleDragOver
        const item = Object.values(backlog).flat().find(i => i.id === activeId);
        const finalIndex = backlog[overContainer].findIndex(i => i.id === activeId);
        
        if (item) {
          await fetch('/api/roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: item.id, 
              section: overContainer,
              status: item.status,
              index: finalIndex
            })
          });
          await fetchBacklog();
        }
      }
    }
  };

  const toggleStatus = async (item: BacklogItem) => {
    // Cycle: pending -> in-progress -> completed -> pending
    let newStatus: 'pending' | 'in-progress' | 'completed';
    if (item.status === 'pending') newStatus = 'in-progress';
    else if (item.status === 'in-progress') newStatus = 'completed';
    else newStatus = 'pending';

    const newSection = newStatus === 'completed' ? 'Completed' : (item.priority || 'High Priority');
    
    await fetch('/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: item.id, 
        section: newSection, 
        status: newStatus, 
        index: newStatus === 'completed' ? -1 : 0 // Bottom for completed, top for restored
      })
    });
    await fetchBacklog();
  };

  const handleMoveTask = async (item: BacklogItem, newSection: string) => {
    const newStatus = newSection === 'Completed' ? 'completed' : 'pending';
    
    await fetch('/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: item.id, 
        section: newSection, 
        status: newStatus, 
        index: 0 // Move to top of new section
      })
    });
    await fetchBacklog();
  };

  const handleCreateTask = async (section: string) => {
    if (!newTaskTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/roadmap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTaskTitle, 
          description: newTaskDesc, 
          section 
        })
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setAddingTaskTo(null);
      await fetchBacklog();
    } catch (error) {
      console.error('Failed to create task', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = async (item: BacklogItem, newTitle: string, newDesc: string) => {
    try {
      await fetch('/api/roadmap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: item.id,
          title: newTitle, 
          description: newDesc
        })
      });
      await fetchBacklog();
    } catch (error) {
      console.error('Failed to edit task', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 style={{ width: '40px', height: '40px', color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />
        <style jsx>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  const sections = ['Critical', 'High Priority', 'Medium Priority', 'Low Priority', 'On-Hold', 'Completed'];

  return (
    <div style={{ maxWidth: '1400px', margin: '-1rem auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', opacity: 0.8 }}>
        <Terminal size={16} style={{ color: 'hsl(var(--primary))' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Roadmap Manager</span>
        <div style={{ height: '1px', flex: 1, background: 'hsla(var(--border) / 0.2)' }} />
      </div>
      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '2rem', lineHeight: '1.5' }}>
        Track technical tasks, SEO improvements, and upcoming features. Drag and drop items to re-prioritize or mark them as completed.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sections.map((section) => (
            <section key={section} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.75rem', fontWeight: '800', color: section === 'Critical' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {section} ({backlog?.[section]?.length || 0})
                </h2>
                {section !== 'Completed' && (
                  <button
                    onClick={() => { setAddingTaskTo(section); setNewTaskTitle(''); setNewTaskDesc(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'hsl(var(--primary))' }}
                  >
                    <Plus size={14} /> Add Task
                  </button>
                )}
              </div>

              <SortableContext
                id={section}
                items={backlog?.[section]?.map(i => i.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <DroppableSection id={section}>
                  {backlog?.[section]?.map((item, idx) => (
                    <SortableItem 
                      key={item.id} 
                      item={item} 
                      index={idx} 
                      sections={sections}
                      onToggle={toggleStatus} 
                      onSaveEdit={handleEditTask}
                      onMove={handleMoveTask}
                    />
                  ))}
                  {(!backlog?.[section] || backlog[section].length === 0) && addingTaskTo !== section && (
                    <div style={{ padding: '0.5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem', opacity: 0.5 }}>
                      No items
                    </div>
                  )}

                  {addingTaskTo === section && (
                    <div style={{ padding: '0.75rem', background: 'hsla(var(--primary) / 0.05)', borderBottom: '1px solid hsla(var(--border) / 0.3)' }}>
                      <input 
                        type="text" 
                        placeholder="Task title..." 
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid hsla(var(--border) / 0.5)', background: 'hsl(var(--background))', color: 'inherit' }}
                        autoFocus
                      />
                      <textarea 
                        placeholder="Description (optional)..." 
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid hsla(var(--border) / 0.5)', background: 'hsl(var(--background))', color: 'inherit', minHeight: '60px', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => setAddingTaskTo(null)}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px', background: 'none', border: '1px solid hsla(var(--border) / 0.5)', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleCreateTask(section)}
                          disabled={isSubmitting || !newTaskTitle.trim()}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px', background: 'hsl(var(--primary))', border: 'none', color: 'hsl(var(--primary-foreground))', cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed', opacity: newTaskTitle.trim() ? 1 : 0.5 }}
                        >
                          {isSubmitting ? 'Saving...' : 'Save Task'}
                        </button>
                      </div>
                    </div>
                  )}
                </DroppableSection>
              </SortableContext>
            </section>
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.4' } }
          })
        }}>
          {activeItem ? (
            <div style={{ 
              padding: '0.4rem 0.75rem', 
              width: '100%', 
              cursor: 'grabbing', 
              background: 'hsl(var(--popover))', 
              border: '1px solid hsl(var(--primary))',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              borderRadius: '4px'
            }}>
              <GripVertical size={14} style={{ color: 'hsl(var(--primary))' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{activeItem.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

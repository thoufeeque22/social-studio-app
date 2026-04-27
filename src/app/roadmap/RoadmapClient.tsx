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
  GripVertical
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

function SortableItem({ item, index, onToggle }: { item: BacklogItem; index: number; onToggle: (item: BacklogItem) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 100 : 1,
    borderBottom: '1px solid hsla(var(--border) / 0.3)',
    background: isDragging ? 'hsla(var(--primary) / 0.1)' : 'transparent',
  };

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
            color: item.status === 'completed' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            display: 'flex',
            alignItems: 'center',
            marginTop: '0.25rem'
          }}
        >
          {item.status === 'completed' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: '600',
            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
            color: item.status === 'completed' ? 'hsl(var(--muted-foreground))' : 'inherit',
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

        {item.status === 'pending' && item.priority !== 'Completed' && (
          <div style={{ marginTop: '0.25rem' }}>
            <Zap size={12} style={{ color: 'hsla(var(--primary) / 0.5)' }} />
          </div>
        )}
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
      const items = backlog[overContainer];
      const activeIndex = items.findIndex(i => i.id === activeId);
      const overIndex = items.findIndex(i => i.id === overId);

      if (activeIndex !== overIndex && overIndex !== -1) {
        setBacklog(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex)
          };
        });
      }

      // Sync with server
      const item = items.find(i => i.id === activeId);
      if (item) {
        await fetch('/api/roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: item.title, 
            section: overContainer,
            status: item.status
          })
        });
      }
    }
  };

  const toggleStatus = async (item: BacklogItem) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    const newSection = newStatus === 'completed' ? 'Completed' : (item.priority || 'High Priority');
    
    await fetch('/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, section: newSection, status: newStatus })
    });
    await fetchBacklog();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 style={{ width: '40px', height: '40px', color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />
        <style jsx>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  const sections = ['Critical', 'High Priority', 'Medium Priority', 'Low Priority', 'Completed'];

  return (
    <div style={{ maxWidth: '1400px', margin: '-1rem auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', opacity: 0.8 }}>
        <Terminal size={16} style={{ color: 'hsl(var(--primary))' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Roadmap Manager</span>
        <div style={{ height: '1px', flex: 1, background: 'hsla(var(--border) / 0.2)' }} />
      </div>

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
              <h2 style={{ fontSize: '0.75rem', fontWeight: '800', color: section === 'Critical' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {section} ({backlog?.[section]?.length || 0})
              </h2>

              <SortableContext
                id={section}
                items={backlog?.[section]?.map(i => i.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <DroppableSection id={section}>
                  {backlog?.[section]?.map((item, idx) => (
                    <SortableItem key={item.id} item={item} index={idx} onToggle={toggleStatus} />
                  ))}
                  {(!backlog?.[section] || backlog[section].length === 0) && (
                    <div style={{ padding: '0.5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem', opacity: 0.5 }}>
                      No items
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

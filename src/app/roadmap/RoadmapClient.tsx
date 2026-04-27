"use client";

import React, { useEffect, useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  LayoutDashboard, 
  Zap,
  Terminal,
  Loader2,
  GripVertical
} from 'lucide-react';
import Link from 'next/link';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress';
  priority: string;
}

type BacklogData = Record<string, BacklogItem[]>;

// --- Components ---

function SortableItem({ item, onToggle }: { item: BacklogItem; onToggle: (item: BacklogItem) => void }) {
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
    opacity: isDragging ? 0.5 : (item.status === 'completed' ? 0.6 : 1),
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem' }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
          <GripVertical size={18} />
        </div>
        
        <button 
          onClick={() => onToggle(item)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: 0, 
            cursor: 'pointer',
            color: item.status === 'completed' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            marginTop: '0.2rem'
          }}
        >
          {item.status === 'completed' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>

        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '1rem', 
            fontWeight: '600',
            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
            color: item.status === 'completed' ? 'hsl(var(--muted-foreground))' : 'inherit'
          }}>
            {item.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RoadmapClient() {
  const [backlog, setBacklog] = useState<BacklogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<BacklogItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

    // Find containers
    const activeContainer = Object.keys(backlog).find(key => backlog[key].some(i => i.id === activeId));
    const overContainer = Object.keys(backlog).find(key => key === overId || backlog[key].some(i => i.id === overId));

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setBacklog(prev => {
      if (!prev) return prev;
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.findIndex(i => i.id === activeId);
      const [movedItem] = activeItems.splice(activeIndex, 1);
      
      // Update item metadata optimistically
      movedItem.priority = overContainer;
      if (overContainer === 'Completed') movedItem.status = 'completed';
      else if (activeContainer === 'Completed') movedItem.status = 'pending';

      const overIndex = prev[overContainer].findIndex(i => i.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(newIndex, 0, movedItem);

      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over || !backlog) return;

    const overId = over.id;
    const container = Object.keys(backlog).find(key => key === overId || backlog[key].some(i => i.id === overId));
    
    if (container) {
      const item = Object.values(backlog).flat().find(i => i.id === active.id);
      if (item) {
        await fetch('/api/roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: item.title, 
            section: container,
            status: container === 'Completed' ? 'completed' : 'pending'
          })
        });
        await fetchBacklog();
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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Terminal size={24} style={{ color: 'hsl(var(--primary))' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Project Roadmap</h1>
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
            Drag and drop tasks to prioritize.
          </p>
        </div>
        <Link href="/" className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', textDecoration: 'none' }}>
          <LayoutDashboard size={18} />
          Back to Dashboard
        </Link>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {sections.map((section) => (
            <section key={section} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: section === 'Critical' ? 'hsl(var(--destructive))' : 'inherit' }}>
                  {section}
                </h2>
                <div style={{ height: '1px', flex: 1, background: 'hsla(var(--border) / 0.3)' }} />
              </div>

              <SortableContext
                id={section}
                items={backlog?.[section]?.map(i => i.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: 'grid', gap: '0.75rem', minHeight: '50px' }}>
                  {backlog?.[section]?.map((item) => (
                    <SortableItem key={item.id} item={item} onToggle={toggleStatus} />
                  ))}
                  {(!backlog?.[section] || backlog[section].length === 0) && (
                    <div style={{ padding: '1.5rem', border: '1px dashed hsla(var(--border) / 0.3)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
                      Drop items here
                    </div>
                  )}
                </div>
              </SortableContext>
            </section>
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } }
          })
        }}>
          {activeItem ? (
            <div className="glass-card" style={{ padding: '1rem', width: '100%', cursor: 'grabbing', border: '1px solid hsl(var(--primary))' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <GripVertical size={18} style={{ color: 'hsl(var(--primary))' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{activeItem.title}</h3>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

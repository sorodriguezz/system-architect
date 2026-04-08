'use client';
import React, { useState, useCallback } from 'react';
import { COMPONENT_TEMPLATES, CATEGORIES } from '@/lib/componentTemplates';
import { COMPONENT_COLORS } from '@/lib/simulation';
import * as Icons from 'lucide-react';

interface ComponentLibraryProps {
  onDragStart: (event: React.DragEvent, type: string) => void;
}

export default function ComponentLibrary({ onDragStart }: ComponentLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Traffic & Edge');
  const [search, setSearch] = useState('');

  const filtered = COMPONENT_TEMPLATES.filter(t => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch = !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/5">
        <h2 className="text-white/90 font-semibold text-sm mb-2 flex items-center gap-2">
          <Icons.Boxes size={14} className="text-indigo-400" />
          Components
        </h2>
        {/* Search */}
        <div className="relative">
          <Icons.Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-white/5">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-indigo-500/80 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            {cat === 'Traffic & Edge' ? 'Traffic' : cat}
          </button>
        ))}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {filtered.map(template => {
          const color = COMPONENT_COLORS[template.type] || '#6366f1';
          const IconComp = (Icons as any)[template.icon || 'Server'];
          return (
            <div
              key={template.type}
              draggable
              onDragStart={e => onDragStart(e, template.type)}
              className="flex items-center gap-2.5 p-2.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/8 hover:border-white/15 cursor-grab active:cursor-grabbing transition-all group"
              title={template.description}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}22`, border: `1px solid ${color}33` }}
              >
                {IconComp && <IconComp size={15} style={{ color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/90 text-xs font-medium truncate">{template.label}</div>
                <div className="text-white/35 text-xs truncate leading-tight">{template.description}</div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Icons.GripVertical size={12} className="text-white/30" />
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-white/30 text-xs py-6">
            No components found
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="p-2 border-t border-white/5">
        <p className="text-white/25 text-xs text-center">Drag to canvas to add</p>
      </div>
    </div>
  );
}

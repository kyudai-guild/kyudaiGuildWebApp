'use client';
import { motion } from 'framer-motion';
import { X, MapPin, Clock, Users, ExternalLink, Tag } from 'lucide-react';
import { GuildEvent, CATEGORY_COLORS, fmtDateLong, fmtTime } from './types';

export default function EventDetailModal({ event, onClose }: { event: GuildEvent; onClose: () => void }) {
  const cat = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS['その他'];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Colored top bar */}
        <div style={{ height: 6, background: cat.color, borderRadius: '1.25rem 1.25rem 0 0' }} />

        <div style={{ padding: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: cat.color, background: cat.bg, marginBottom: '0.5rem' }}>
                {event.category}
              </span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{event.title}</h2>
            </div>
            <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', transition: 'background 0.2s', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            ><X size={18} /></button>
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {fmtDateLong(event.event_date)}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                  {fmtTime(event.event_date)}
                  {event.event_end_date && ` 〜 ${fmtTime(event.event_end_date)}`}
                </p>
              </div>
            </div>
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{event.location}</p>
                  {event.location_url && (
                    <a href={event.location_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.25rem' }}
                    >地図を見る <ExternalLink size={11} /></a>
                  )}
                </div>
              </div>
            )}
            {event.capacity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={15} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>定員 {event.capacity}名</p>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{event.description}</p>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
              {event.tags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <Tag size={10} />#{tag}
                </span>
              ))}
            </div>
          )}

          {/* Organizer */}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
            主催: {event.organizer?.display_name ?? '九大ギルド運営'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

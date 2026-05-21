import React, { useState, useMemo } from 'react';
import { AppState } from '../types';
import { Syringe, Milk, DollarSign, Baby, Search } from 'lucide-react';

interface Props {
  state: AppState;
  filterType?: string;
}

type FeedEvent = {
  id: string;
  date: string;
  type: 'TREATMENT' | 'EXPENSE' | 'BIRTH' | 'MILK' | 'WEIGHT';
  title: string;
  description: string;
  cost?: number;
  user: string;
  icon: any;
  colorClass: string;
  bgClass: string;
  timestamp: number;
};

export const ActivityFeed: React.FC<Props> = ({ state, filterType }) => {
  const [expanded, setExpanded] = useState(false);

  const feedEvents = useMemo(() => {
    const events: FeedEvent[] = [];

    // 1. Treatment Logs
    state.livestock.forEach(animal => {
      (animal.medicalHistory || []).forEach(m => {
        events.push({
          id: m.id,
          date: m.date,
          type: 'TREATMENT',
          title: `Treated ${animal.tagId}`,
          description: `Administered ${m.medicineName} (${m.type}). ${m.notes || ''}`,
          cost: m.cost,
          user: m.doctorName || 'Manager',
          icon: Syringe,
          colorClass: 'text-blue-600',
          bgClass: 'bg-blue-100',
          timestamp: new Date(m.date + (m.time ? `T${m.time}` : '')).getTime()
        });
      });
    });

    // 2. Expenses (that aren't already captured as treatments, or just all expenses)
    state.expenses.forEach(e => {
      if (e.category !== 'MEDICAL') {
        events.push({
          id: e.id,
          date: e.date,
          type: 'EXPENSE',
          title: `Recorded Expense: ${e.category}`,
          description: e.description,
          cost: e.amount,
          user: 'Finance Admin',
          icon: DollarSign,
          colorClass: 'text-emerald-600',
          bgClass: 'bg-emerald-100',
          timestamp: new Date(e.date).getTime()
        });
      }
    });

    // 3. Births
    state.livestock.forEach(animal => {
      (animal.breedingHistory || []).forEach(b => {
        if (b.status === 'COMPLETED' && b.birthRecord) {
          events.push({
            id: b.birthRecord.id,
            date: b.birthRecord.date,
            type: 'BIRTH',
            title: `Birth Logged (${animal.tagId})`,
            description: `${b.birthRecord.count} offspring(s) born. Health: ${b.birthRecord.healthStatus}.`,
            user: 'Breeding Manager',
            icon: Baby,
            colorClass: 'text-pink-600',
            bgClass: 'bg-pink-100',
            timestamp: new Date(b.birthRecord.date).getTime()
          });
        }
      });
    });

    // 4. Milking
    state.livestock.forEach(animal => {
      (animal.milkProductionHistory || []).forEach(m => {
        events.push({
          id: m.id,
          date: m.date,
          type: 'MILK',
          title: `Milking Session (${animal.tagId})`,
          description: `Yielded ${m.quantity}L during ${m.session} session.`,
          user: 'Dairy Worker',
          icon: Milk,
          colorClass: 'text-sky-600',
          bgClass: 'bg-sky-100',
          timestamp: new Date(m.date).getTime()
        });
      });
    });

    // Sort descending by timestamp. Cap at 30 (was 50) — anything older sits behind the "Show all"
    // toggle so the feed doesn't dominate the dashboard.
    const sortedEvents = events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);

    if (filterType === 'HEALTH') return sortedEvents.filter(e => e.type === 'TREATMENT');
    if (filterType === 'MILK') return sortedEvents.filter(e => e.type === 'MILK');
    if (filterType === 'FINANCE') return sortedEvents.filter(e => e.type === 'EXPENSE');
    return sortedEvents;
  }, [state, filterType]);

  // Type pill colors so the user can scan event type at a glance without spending a 48px icon block.
  const typeStyles: Record<FeedEvent['type'], { dot: string; label: string }> = {
    TREATMENT: { dot: 'bg-blue-500', label: 'Health' },
    EXPENSE: { dot: 'bg-emerald-500', label: 'Expense' },
    BIRTH: { dot: 'bg-pink-500', label: 'Birth' },
    MILK: { dot: 'bg-sky-500', label: 'Milk' },
    WEIGHT: { dot: 'bg-amber-500', label: 'Weight' },
  };

  const visibleEvents = expanded ? feedEvents : feedEvents.slice(0, 8);

  return (
    <div className="space-y-2">
      {/* Feed Stream — compact, scrollable, scannable.
          Cards are intentionally dense (one row per event) so the dashboard stays usable. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Recent activity</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{feedEvents.length} {feedEvents.length === 1 ? 'event' : 'events'}</span>
          </div>
        </div>

        <ul className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {visibleEvents.map(event => {
            const style = typeStyles[event.type];
            return (
              <li key={event.id} className="group px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${event.bgClass} ${event.colorClass}`}>
                    <event.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">
                        {event.title}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 tabular-nums">{event.date}</span>
                    </div>
                    <p className="text-[12px] text-slate-500 leading-snug line-clamp-1">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                      <span className="text-slate-300 text-[10px]">•</span>
                      <span className="text-[10px] font-medium text-slate-400 truncate">{event.user}</span>
                      {event.cost ? (
                        <>
                          <span className="text-slate-300 text-[10px]">•</span>
                          <span className="text-[10px] font-bold text-slate-600 tabular-nums">PKR {event.cost.toLocaleString()}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}

          {feedEvents.length === 0 && (
            <li className="text-center py-10 px-4">
              <Search className="mx-auto text-slate-300 mb-2" size={24} />
              <p className="text-xs text-slate-400 font-medium">No activity recorded yet.</p>
            </li>
          )}
        </ul>

        {feedEvents.length > 8 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/60 py-2 border-t border-slate-100 transition-colors uppercase tracking-wider"
          >
            {expanded ? 'Show less' : `Show ${feedEvents.length - 8} more`}
          </button>
        )}
      </div>
    </div>
  );
};

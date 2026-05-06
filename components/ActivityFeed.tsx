import React, { useState, useMemo } from 'react';
import { AppState } from '../types';
import { Plus, MessageSquare, Heart, Share2, Syringe, Milk, DollarSign, Baby, Calendar, CheckCircle, Search, Edit2 } from 'lucide-react';

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
  const [activeChip, setActiveChip] = useState<string | null>(null);

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

    // Sort descending by timestamp
    const sortedEvents = events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50); // Limit to 50 for performance
    
    if (filterType === 'HEALTH') return sortedEvents.filter(e => e.type === 'TREATMENT');
    if (filterType === 'MILK') return sortedEvents.filter(e => e.type === 'MILK');
    if (filterType === 'FINANCE') return sortedEvents.filter(e => e.type === 'EXPENSE');
    return sortedEvents;
  }, [state, filterType]);

  const quickChips = [
    { id: 'vaccinate', label: 'Vaccinated', icon: Syringe, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
    { id: 'fed', label: 'Fed', icon: Milk, color: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100' },
    { id: 'purchased', label: 'Purchased', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
    { id: 'born', label: 'Birth', icon: Baby, color: 'text-pink-600', bg: 'bg-pink-50 hover:bg-pink-100' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post Box */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 premium-card relative z-10">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
            Me
          </div>
          <div className="flex-1 space-y-3">
            <input 
              type="text" 
              placeholder="What happened today?" 
              className="w-full bg-slate-50 border-none focus:ring-0 text-slate-800 font-medium placeholder-slate-400 py-2 outline-none text-lg"
              onClick={() => setActiveChip('text')}
            />
            
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {quickChips.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  title={`Quick action: log a ${chip.label.toLowerCase()} event`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${chip.bg} ${chip.color} ${activeChip === chip.id ? 'ring-2 ring-offset-1 ring-emerald-500' : ''}`}
                >
                  <chip.icon size={14} />
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Inline Form Expand (Mock) */}
            {activeChip && activeChip !== 'text' && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">New {activeChip} Entry</h4>
                  <button onClick={() => setActiveChip(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Cancel</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Animal Tag ID" className="input-premium py-2 text-sm" />
                  <input type="date" className="input-premium py-2 text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
                  <input type="text" placeholder="Details / Notes" className="input-premium py-2 text-sm col-span-2" />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors">
                    Post Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Stream */}
      <div className="space-y-4">
        {feedEvents.map(event => (
          <div key={event.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 premium-card group">
            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${event.bgClass} ${event.colorClass}`}>
                <event.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{event.title}</h3>
                    <p className="text-xs font-medium text-slate-500">{event.user} • {event.date}</p>
                  </div>
                  {event.cost && (
                    <span className="text-xs font-black bg-slate-50 text-slate-600 px-2 py-1 rounded-lg">
                      PKR {event.cost.toLocaleString()}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {event.description}
                </p>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50 text-slate-400">
                  <button title="Acknowledge this action" className="flex items-center gap-1.5 text-xs font-bold hover:text-emerald-500 transition-colors">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button title="Comment on this entry" className="flex items-center gap-1.5 text-xs font-bold hover:text-blue-500 transition-colors">
                    <MessageSquare size={14} /> Comment
                  </button>
                  <button title="Edit this entry" className="flex items-center gap-1.5 text-xs font-bold hover:text-amber-500 transition-colors ml-auto opacity-0 group-hover:opacity-100">
                    <Edit2 size={14} /> Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {feedEvents.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
            <Search className="mx-auto text-slate-300 mb-3" size={32} />
            <p className="text-slate-500 font-medium">No activity recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

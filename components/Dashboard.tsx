
import React, { useState } from 'react';
import { User, TargetSection, Badge } from '../types';

interface DashboardProps {
  user: User;
  onStartExam: () => void;
  onStartTargetPractice: (section: TargetSection) => void;
}

const TARGET_SECTIONS: { id: TargetSection; title: string; subtitle: string; icon: string; questions: number; color: string }[] = [
  { id: 'PART_1', title: '大問1：語彙・文法', subtitle: 'Vocab & Grammar', icon: 'fa-spell-check', questions: 15, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'PART_2', title: '大問2：対話文', subtitle: 'Dialogue', icon: 'fa-comments', questions: 5, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'PART_3', title: '大問3：並び替え', subtitle: 'Ordering', icon: 'fa-puzzle-piece', questions: 5, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { id: 'PART_4', title: '大問4：読解問題', subtitle: 'Reading', icon: 'fa-book-open', questions: 10, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
];

const BadgeModal: React.FC<{ badge: Badge; onClose: () => void }> = ({ badge, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg border-4 border-white dark:border-slate-700 ${badge.color}`}>
          <i className={`fa-solid ${badge.icon}`}></i>
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white text-center mb-2 tracking-tight">{badge.name}</h3>
        <p className="text-indigo-600 dark:text-indigo-400 font-bold text-center mb-6 text-sm">
          <i className="fa-solid fa-calendar-day mr-2 text-jec-yellow"></i>
          Unlocked: {new Date(badge.earnedAt).toLocaleDateString()}
        </p>
        
        <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 mb-8 space-y-4">
          <div>
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">日本語解説 / Achievement</p>
             <p className="text-slate-800 dark:text-slate-100 font-bold leading-relaxed">{badge.jpDescription}</p>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">English Detail</p>
             <p className="text-slate-500 dark:text-slate-400 text-sm italic">{badge.description}</p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

const ConfirmModal: React.FC<{ 
  title: string; 
  cost: number; 
  currentCredits: number; 
  onConfirm: () => void; 
  onCancel: () => void 
}> = ({ title, cost, currentCredits, onConfirm, onCancel }) => {
  const projectedCredits = Math.max(0, Math.round((currentCredits - cost) * 10) / 10);
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
          <i className="fa-solid fa-ticket text-jec-yellow"></i>
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white text-center mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm">Confirm ticket usage for this session.</p>
        
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-8 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Cost</span>
            <span className="text-rose-600 dark:text-rose-400 font-black">-{cost.toFixed(1)} Tickets</span>
          </div>
          <div className="h-px bg-slate-200 dark:bg-slate-600"></div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Balance After</span>
            <div className="flex items-center text-indigo-900 dark:text-indigo-200 font-black">
              <i className="fa-solid fa-ticket mr-1.5 text-jec-yellow text-xs"></i>
              {projectedCredits.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onCancel} 
            className="py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, onStartExam, onStartTargetPractice }) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [pendingAction, setPendingAction] = useState<{ 
    type: 'exam' | 'target'; 
    section?: TargetSection; 
    cost: number;
    title: string;
  } | null>(null);

  const avgScore = user.history.length > 0 
    ? Math.round(user.history.reduce((acc, h) => acc + (h.score / h.total), 0) / user.history.length * 100)
    : 0;

  // Fix: Ensure school users (non-home users) always see the infinity symbol
  const creditsDisplay = (!user.isHomeUser || user.hasSubscription) ? '∞' : user.credits.toFixed(1);
  const isExamBlocked = user.isHomeUser && !user.hasSubscription && user.credits < 1;

  const handleStartExamClick = () => {
    if (user.isHomeUser && !user.hasSubscription) {
      setPendingAction({ type: 'exam', cost: 1.0, title: 'Full Mock Exam' });
    } else {
      onStartExam();
    }
  };

  const handleStartTargetClick = (section: TargetSection, title: string) => {
    if (user.isHomeUser && !user.hasSubscription) {
      setPendingAction({ type: 'target', section, cost: 0.2, title: title.split('：')[1] || title });
    } else {
      onStartTargetPractice(section);
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-12 transition-colors duration-300">
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}
      
      {pendingAction && (
        <ConfirmModal 
          title={pendingAction.title}
          cost={pendingAction.cost}
          currentCredits={user.credits}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            if (pendingAction.type === 'exam') onStartExam();
            else if (pendingAction.section) onStartTargetPractice(pendingAction.section);
            setPendingAction(null);
          }}
        />
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 text-center transition-all hover:shadow-md">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Expertise</p>
           <p className="text-3xl font-black text-jec-green">{avgScore}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 text-center transition-all hover:shadow-md">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Completed</p>
           <p className="text-3xl font-black text-slate-800 dark:text-white">{user.history.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 text-center transition-all hover:shadow-md">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Streak</p>
           <p className="text-3xl font-black text-jec-orange">{user.stats?.streakCount || 0} Days</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 text-center transition-all hover:shadow-md">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Tickets</p>
           <div className="flex items-center justify-center text-3xl font-black text-jec-yellow drop-shadow-sm">
             <i className="fa-solid fa-ticket mr-2"></i>
             <span>{creditsDisplay}</span>
           </div>
        </div>
      </div>

      {/* Main Mode: Full Exam */}
      <section>
        <div className="flex items-center space-x-2 mb-6">
          <i className="fa-solid fa-star text-jec-yellow"></i>
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">I Can! Challenge</h2>
        </div>
        <div className={`relative overflow-hidden ${isExamBlocked ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600 dark:bg-indigo-900'} rounded-[3rem] p-8 md:p-12 text-white shadow-2xl transition-all`}>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="text-center lg:text-left">
              <div className="inline-flex px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Official Mock Series</div>
              <h3 className="text-4xl font-black mb-4">Full Mock Exam / 模擬試験</h3>
              <p className="text-indigo-100 dark:text-indigo-200 text-lg max-w-xl leading-relaxed">
                Take the complete exam under real test conditions. Challenge yourself and see your "I Can!" score!
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm font-bold opacity-90 justify-center lg:justify-start">
                <span className="flex items-center"><i className="fa-solid fa-clock mr-2 text-jec-yellow"></i> 35 Mins</span>
                <span className="flex items-center"><i className="fa-solid fa-list-check mr-2 text-jec-green"></i> Full Sections</span>
                {user.isHomeUser && <span className="flex items-center bg-white/10 px-3 py-1.5 rounded-xl"><i className="fa-solid fa-ticket mr-2 text-jec-yellow"></i> 1.0 Ticket</span>}
              </div>
            </div>
            <button 
              onClick={handleStartExamClick}
              disabled={isExamBlocked}
              className={`whitespace-nowrap px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${isExamBlocked ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed text-white' : 'bg-white dark:bg-slate-100 text-indigo-600 dark:text-indigo-900 hover:bg-jec-yellow hover:text-slate-900'}`}
            >
              {isExamBlocked ? 'Locked' : 'START EXAM'}
            </button>
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-jec-yellow opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-jec-green opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-jec-orange opacity-10 rounded-full blur-xl"></div>
        </div>
      </section>

      {/* Mode 2: Target Practice */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-bullseye text-jec-orange"></i>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Skill Training / 弱点補強</h2>
          </div>
          {user.isHomeUser && (
            <span className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <i className="fa-solid fa-ticket mr-2 text-jec-yellow"></i> 0.2 Tickets
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TARGET_SECTIONS.map((section) => {
            const isBlocked = user.isHomeUser && !user.hasSubscription && user.credits < 0.2;
            const completions = user.stats?.targetCompletions?.[section.id] || 0;
            return (
              <button 
                key={section.id}
                onClick={() => handleStartTargetClick(section.id, section.title)}
                disabled={isBlocked}
                className={`flex items-center p-7 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 border-transparent shadow-sm transition-all text-left hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 group relative overflow-hidden ${isBlocked ? 'opacity-50 grayscale' : ''}`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-inner mr-6 group-hover:scale-110 group-hover:rotate-6 transition-all ${section.color}`}>
                  <i className={`fa-solid ${section.icon}`}></i>
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800 dark:text-white text-xl leading-tight">{section.title}</h4>
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-bold uppercase tracking-wide mt-1">{section.subtitle}</p>
                </div>
                <div className="text-right z-10">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Rank</div>
                  <div className={`text-2xl font-black ${completions > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {completions > 9 ? 'S' : completions > 5 ? 'A' : completions > 0 ? 'B' : '-'}
                  </div>
                </div>
                {/* Subtle section completion progress indicator */}
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all opacity-20" style={{ width: `${Math.min(100, completions * 10)}%` }}></div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Badges Display */}
      <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center tracking-tight">
             <i className="fa-solid fa-medal text-jec-yellow mr-3 text-2xl"></i> Achievement Medals
           </h3>
           <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.badges.length} Unlocked</span>
        </div>
        {user.badges.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
            {user.badges.map(badge => (
              <button 
                key={badge.id} 
                onClick={() => setSelectedBadge(badge)}
                className="flex flex-col items-center text-center group transition-all"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${badge.color} mb-3 text-2xl shadow-lg border-4 border-white dark:border-slate-700 group-hover:scale-110 group-hover:-translate-y-1 transition-all`}>
                  <i className={`fa-solid ${badge.icon}`}></i>
                </div>
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 leading-tight px-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{badge.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-[2rem]">
            <i className="fa-solid fa-lock text-slate-200 dark:text-slate-700 text-4xl mb-4"></i>
            <p className="text-slate-400 dark:text-slate-500 font-bold">Earn medals by completing training sessions!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;

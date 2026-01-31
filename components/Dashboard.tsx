
import React, { useState } from 'react';
import { User, TargetSection, Badge, EikenGrade } from '../types';

interface DashboardProps {
  user: User;
  grade: EikenGrade | null;
  onStartExam: (theme?: string) => void;
  onStartTargetPractice: (section: TargetSection, theme?: string) => void;
  onBackToGrades: () => void;
  onOpenShop: () => void;
}

const TARGET_SECTIONS: { id: TargetSection; title: string; subtitle: string; icon: string; color: string }[] = [
  { id: 'PART_1', title: '大問1：語彙・文法', subtitle: 'Vocab & Grammar', icon: 'fa-spell-check', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'PART_2', title: '大問2：対話文', subtitle: 'Dialogue', icon: 'fa-comments', color: 'bg-blue-50 text-blue-600' },
  { id: 'PART_3', title: '大問3：並び替え', subtitle: 'Ordering', icon: 'fa-puzzle-piece', color: 'bg-violet-50 text-violet-600' },
  { id: 'PART_4', title: '大問4：読解問題', subtitle: 'Reading', icon: 'fa-book-open', color: 'bg-amber-50 text-amber-600' },
];

const TRAINING_THEMES = [
  "キャンプとアウトドア (Camping)", 
  "動物と自然 (Animals & Nature)", 
  "スポーツと健康 (Sports & Health)", 
  "学校と教室 (School & Classroom)", 
  "買い物とファッション (Shopping)", 
  "旅行とバケーション (Travel)",
  "料理とレストラン (Cooking)", 
  "ロボットと未来の技術 (Future Tech)", 
  "音楽と映画 (Music & Movies)",
  "毎日の習慣 (Daily Routines)", 
  "いろいろな仕事 (Occupations)", 
  "天気と季節 (Weather & Seasons)"
];

const ALL_POSSIBLE_BADGES: Omit<Badge, 'earnedAt' | 'count'>[] = [
  { id: 'first_step', name: 'First Step', description: 'Complete your first session.', jpDescription: '初めてのトレーニングを完了しました。', icon: 'fa-shoe-prints', color: 'bg-blue-500 text-white' },
  { id: 'perfect_100', name: 'Mock Perfect', description: 'Get 100% on a full mock exam.', jpDescription: '模擬試験で100点を獲得しました！完璧です。', icon: 'fa-crown', color: 'bg-yellow-500 text-white' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Finish full exam in record time.', jpDescription: '模擬試験を制限時間内にクリア！', icon: 'fa-gauge-high', color: 'bg-red-500 text-white' },
  { id: 'skill_speedster', name: 'Quick Learner', description: 'Pass skill training in under 5 mins.', jpDescription: '5分以内にスキル練習に合格しました。', icon: 'fa-bolt-lightning', color: 'bg-amber-400 text-slate-900' },
  { id: 'perfect_part_1', name: 'Vocab Master', description: 'Get 100% on Part 1 training.', jpDescription: '語彙・文法練習で満点を獲得しました！', icon: 'fa-spell-check', color: 'bg-emerald-500 text-white' },
  { id: 'perfect_part_2', name: 'Dialogue Master', description: 'Get 100% on Part 2 training.', jpDescription: '対話文練習で満点を獲得しました！', icon: 'fa-comments', color: 'bg-blue-500 text-white' },
  { id: 'perfect_part_3', name: 'Order Master', description: 'Get 100% on Part 3 training.', jpDescription: '並び替え練習で満点を獲得しました！', icon: 'fa-puzzle-piece', color: 'bg-violet-500 text-white' },
  { id: 'perfect_part_4', name: 'Reading Master', description: 'Get 100% on Part 4 training.', jpDescription: '読解練習で満点を獲得しました！', icon: 'fa-book-open', color: 'bg-amber-600 text-white' },
  
  // Daily & Streak Badges
  { id: 'daily_mock_2', name: 'Double Down', description: '2 mocks in 1 day.', jpDescription: '1日2回の模擬試験を達成しました。', icon: 'fa-dice-two', color: 'bg-indigo-500 text-white' },
  { id: 'daily_mock_5', name: 'Power of Five', description: '5 mocks in 1 day.', jpDescription: '1日5回の模擬試験を達成！', icon: 'fa-5', color: 'bg-emerald-500 text-white' },
  { id: 'daily_mock_10', name: 'Mock Marathon', description: '10 mocks in 1 day.', jpDescription: '1日10回！伝説の記録です！', icon: 'fa-trophy', color: 'bg-rose-600 text-white' },
  { id: 'daily_sweep', name: 'Daily Sweep', description: 'Pass all skills in one day.', jpDescription: '1日で全スキルの練習に合格しました！', icon: 'fa-broom', color: 'bg-emerald-600 text-white' },
  
  { id: 'streak_3', name: '3-Day Streak', description: 'Study for 3 days in a row.', jpDescription: '3日連続学習！継続は力なり。', icon: 'fa-fire', color: 'bg-orange-400 text-white' },
  { id: 'streak_5', name: 'High Five Streak', description: 'Study for 5 days in a row.', jpDescription: '5日連続学習達成！', icon: 'fa-hand', color: 'bg-orange-500 text-white' },
  { id: 'streak_10', name: 'Double Digits', description: 'Study for 10 days in a row.', jpDescription: '10日連続学習達成！', icon: 'fa-fire-flame-curved', color: 'bg-rose-500 text-white' },
  { id: 'streak_15', name: 'Fortnight Fighter', description: 'Study for 15 days in a row.', jpDescription: '15日連続学習達成！半月突破です！', icon: 'fa-calendar-check', color: 'bg-violet-500 text-white' },
  { id: 'streak_30', name: 'Monthly Warrior', description: 'Study for 30 days in a row.', jpDescription: '30日連続学習達成！一ヶ月皆勤です！', icon: 'fa-trophy', color: 'bg-violet-600 text-white' },

  // Skill Daily Milestones
  { id: 'skill_5_PART_1', name: 'Vocab Enthusiast', description: '5 Part 1 sessions in a day.', jpDescription: '1日で語彙練習を5回達成しました。', icon: 'fa-bolt', color: 'bg-emerald-400 text-white' },
  { id: 'skill_10_PART_1', name: 'Vocab Legend', description: '10 Part 1 sessions in a day.', jpDescription: '1日で語彙練習を10回達成！伝説級です。', icon: 'fa-fire-flame-simple', color: 'bg-emerald-600 text-white' },
  
  { id: 'skill_5_PART_2', name: 'Dialogue Enthusiast', description: '5 Part 2 sessions in a day.', jpDescription: '1日で対話文練習を5回達成しました。', icon: 'fa-bolt', color: 'bg-blue-400 text-white' },
  { id: 'skill_10_PART_2', name: 'Dialogue Legend', description: '10 Part 2 sessions in a day.', jpDescription: '1日で対話文練習を10回達成！伝説級です。', icon: 'fa-fire-flame-simple', color: 'bg-blue-600 text-white' },
  
  { id: 'skill_5_PART_3', name: 'Ordering Enthusiast', description: '5 Part 3 sessions in a day.', jpDescription: '1日で並び替え練習を5回達成しました。', icon: 'fa-bolt', color: 'bg-violet-400 text-white' },
  { id: 'skill_10_PART_3', name: 'Ordering Legend', description: '10 Part 3 sessions in a day.', jpDescription: '1日で並び替え練習を10回達成！伝説級です。', icon: 'fa-fire-flame-simple', color: 'bg-violet-600 text-white' },
  
  { id: 'skill_5_PART_4', name: 'Reading Enthusiast', description: '5 Part 4 sessions in a day.', jpDescription: '1日で読解練習を5回達成しました。', icon: 'fa-bolt', color: 'bg-amber-400 text-white' },
  { id: 'skill_10_PART_4', name: 'Reading Legend', description: '10 Part 4 sessions in a day.', jpDescription: '1日で読解練習を10回達成！伝説級です。', icon: 'fa-fire-flame-simple', color: 'bg-amber-600 text-white' },
];

const BadgeModal: React.FC<{ badge: Omit<Badge, 'earnedAt' | 'count'> & { earnedAt?: number; count?: number }; onClose: () => void }> = ({ badge, onClose }) => (
  <div 
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn"
    onClick={onClose}
  >
    <div 
      className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className={`w-full h-full rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-white ${badge.earnedAt ? badge.color : 'bg-slate-200 text-slate-400'}`}>
          <i className={`fa-solid ${badge.icon}`}></i>
        </div>
        {badge.count && badge.count > 1 && (
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black border-4 border-white shadow-lg animate-bounce">
            {badge.count}
          </div>
        )}
      </div>
      <h3 className="text-2xl font-black text-center mb-2 tracking-tight">{badge.name}</h3>
      <p className="text-indigo-600 dark:text-indigo-400 font-bold text-center mb-6 text-sm">{badge.earnedAt ? `Unlocked: ${new Date(badge.earnedAt).toLocaleDateString()}` : 'Locked / 未獲得'}</p>
      <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-3xl border mb-8 space-y-4">
        <p className="text-slate-800 dark:text-slate-100 font-bold leading-relaxed">{badge.jpDescription}</p>
        <div className="pt-4 border-t"><p className="text-slate-500 dark:text-slate-400 text-sm italic">{badge.description}</p></div>
      </div>
      <button 
        onClick={onClose} 
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all active:scale-95"
      >
        Got it!
      </button>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, grade, onStartExam, onStartTargetPractice, onBackToGrades, onOpenShop }) => {
  const [selectedBadge, setSelectedBadge] = useState<(Omit<Badge, 'earnedAt' | 'count'> & { earnedAt?: number; count?: number }) | null>(null);
  const [useThemeFocus, setUseThemeFocus] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(TRAINING_THEMES[0]);

  const today = new Date().toISOString().split('T')[0];
  const examsTakenToday = user.stats?.lastExamDate === today ? (user.stats?.examsTakenToday || 0) : 0;
  const examsRemaining = Math.max(0, 10 - examsTakenToday);

  const targetExamsTakenToday = user.stats?.lastExamDate === today ? (user.stats?.targetExamsTakenToday || 0) : 0;
  const targetExamsRemaining = Math.max(0, 10 - targetExamsTakenToday);

  const filteredSections = TARGET_SECTIONS.filter(s => !(grade === 'GRADE_5' && s.id === 'PART_4'));

  const themeMasterBadges: Omit<Badge, 'earnedAt' | 'count'>[] = TRAINING_THEMES.map(theme => ({
    id: `theme_${theme}`,
    name: `${theme.split(' ')[0]} Master`,
    description: `Complete all required sections for the "${theme}" topic.`,
    jpDescription: `${theme}テーマの全セクションを制覇しました！`,
    icon: 'fa-medal',
    color: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
  }));

  const allBadges = [...ALL_POSSIBLE_BADGES, ...themeMasterBadges];

  const examTimeDisplay = grade === 'GRADE_5' ? '25 Mins' : '35 Mins';
  const examTimeJpDisplay = grade === 'GRADE_5' ? '本番形式の25分間チャレンジ！' : '本番形式の35分間チャレンジ！';

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}
      <button onClick={onBackToGrades} className="text-[11px] font-black uppercase text-indigo-500 flex items-center group mb-4 transition-colors"><i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Back to Grades</button>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 text-center shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed</p>
           <p className="text-3xl font-black">{user.history.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 text-center shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expertise</p>
           <p className="text-3xl font-black text-jec-green">{user.history.length > 0 ? Math.round(user.history.reduce((acc, h) => acc + (h.score/h.total), 0) / user.history.length * 100) : 0}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 text-center shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Streak</p>
           <p className="text-3xl font-black text-jec-orange">{user.stats?.streakCount || 0}</p>
        </div>
        <button onClick={onOpenShop} className={`p-6 rounded-[2rem] text-center transition-all group active:scale-95 flex flex-col items-center justify-center relative ${user.hasSubscription ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 border-4 border-yellow-100 shadow-xl' : 'bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 shadow-sm'}`}>
           <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${user.hasSubscription ? 'text-amber-800/80' : 'text-slate-400'}`}>Tickets</p>
           <div className={`flex items-center text-3xl font-black ${user.hasSubscription ? 'text-slate-900' : 'text-jec-yellow'}`}><i className="fa-solid fa-ticket mr-2"></i>{user.id.startsWith('school') ? '∞' : user.credits.toFixed(1)}</div>
           <p className={`text-[8px] font-black mt-2 uppercase px-3 py-0.5 rounded-full ${user.hasSubscription ? 'bg-white/50 text-amber-900' : 'text-indigo-400 bg-indigo-50 dark:bg-indigo-900'}`}>SHOP</p>
        </button>
      </div>

      <section>
        <h2 className="text-xl font-black mb-6 flex items-center px-2 dark:text-white"><i className="fa-solid fa-star text-jec-yellow mr-3"></i> I Can! Challenge</h2>
        <div className={`relative overflow-hidden ${examsRemaining === 0 ? 'bg-slate-400' : 'bg-indigo-600'} rounded-[3rem] p-8 md:p-12 text-white shadow-2xl transition-all`}>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-center md:text-left">
              <h3 className="text-4xl font-black mb-4 tracking-tight">Full Mock Exam</h3>
              <p className="text-indigo-100 text-lg mb-4 font-bold">{examTimeJpDisplay}</p>
              <div className="flex gap-6 text-sm font-black uppercase">
                <span className="bg-white/20 px-3 py-1 rounded-xl">{examTimeDisplay}</span>
                <span className="bg-white/20 px-3 py-1 rounded-xl">Today Left: {examsRemaining}</span>
              </div>
            </div>
            <button 
              onClick={() => onStartExam(useThemeFocus ? selectedTheme : undefined)} 
              disabled={examsRemaining === 0} 
              className="px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl bg-white text-indigo-600 hover:bg-jec-yellow hover:text-slate-900 transform active:scale-95 disabled:opacity-50"
            >
              START EXAM
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-black flex items-center dark:text-white"><i className="fa-solid fa-bullseye text-jec-orange mr-3"></i> Skill Training</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 ml-9">Today Left: {targetExamsRemaining}</p>
          </div>
          
          <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-3 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex items-center">
                <span className={`text-[10px] font-black uppercase tracking-wider mr-3 ${useThemeFocus ? 'text-indigo-500' : 'text-slate-400'}`}>
                  テーマ集中モード / Theme Focus
                </span>
                <button 
                  onClick={() => setUseThemeFocus(!useThemeFocus)}
                  className={`w-14 h-7 rounded-full transition-all relative ${useThemeFocus ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${useThemeFocus ? 'left-8' : 'left-1'}`}></div>
                </button>
             </div>
             {useThemeFocus && (
               <select 
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="bg-slate-50 dark:bg-slate-700 border-none text-[11px] font-black rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500 transition-all dark:text-white"
               >
                 {TRAINING_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
             )}
          </div>
        </div>

        {useThemeFocus && (
          <div className="mx-2 p-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-[2rem] flex items-start animate-fadeIn">
            <i className="fa-solid fa-circle-info text-indigo-500 mt-1 mr-4 text-xl"></i>
            <div>
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 leading-relaxed">
                <b>テーマ集中モード ON:</b> AIが「<u>{selectedTheme}</u>」に関連する単語やシチュエーションを中心に問題を作成します。特定のトピックを集中して学び、語彙力を一気に高めるのに最適です。
              </p>
              {/* Progress Tracker for Theme */}
              <div className="mt-4 flex gap-2">
                {filteredSections.map(s => {
                  const done = user.stats.thematicProgress?.[selectedTheme]?.[s.id];
                  return (
                    <div key={s.id} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${done ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                      {s.id.replace('PART_', 'P')} {done ? '✓' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSections.map((section) => (
            <button 
              key={section.id} 
              disabled={targetExamsRemaining === 0}
              onClick={() => onStartTargetPractice(section.id, useThemeFocus ? selectedTheme : undefined)} 
              className={`flex items-center p-7 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 border-transparent shadow-sm group transform active:scale-95 transition-all ${targetExamsRemaining === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-xl hover:border-indigo-400'}`}
            >
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl mr-6 ${section.color}`}><i className={`fa-solid ${section.icon}`}></i></div>
              <div className="text-left">
                <h4 className="font-black text-xl dark:text-white">{section.title}</h4>
                <p className="text-slate-400 text-[11px] font-black uppercase mt-1">{section.subtitle}</p>
              </div>
              <div className="ml-auto text-xs font-black text-amber-500 bg-amber-50 dark:bg-amber-900/40 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <i className="fa-solid fa-ticket mr-1"></i>0.2
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black mb-8 flex items-center px-2 dark:text-white"><i className="fa-solid fa-award text-jec-green mr-3"></i> Achievements</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {allBadges.map((badge) => {
            const earned = user.badges.find(b => b.id === badge.id);
            return (
              <button key={badge.id} onClick={() => setSelectedBadge({ ...badge, earnedAt: earned?.earnedAt, count: earned?.count })} className={`flex flex-col items-center p-5 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border-2 group relative transition-all active:scale-95 ${earned ? 'border-indigo-100 dark:border-indigo-900/30' : 'border-transparent opacity-40 grayscale hover:grayscale-0'}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 shadow-md group-hover:scale-110 ${earned ? badge.color : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}><i className={`fa-solid ${badge.icon}`}></i></div>
                {earned && earned.count > 1 && <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">{earned.count}</div>}
                <p className="text-[9px] font-black uppercase text-center dark:text-white">{badge.name}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
export default Dashboard;

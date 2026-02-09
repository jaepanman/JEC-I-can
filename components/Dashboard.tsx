
import React, { useState } from 'react';
import { User, TargetSection, EikenGrade, Badge } from '../types';

interface DashboardProps {
  user: User;
  grade: EikenGrade | null;
  onStartExam: (theme?: string) => void;
  onStartTargetPractice: (section: TargetSection, theme?: string) => void;
  onBackToGrades: () => void;
  onOpenShop: () => void;
}

const SECTIONS: { id: TargetSection; title: string; icon: string; color: string }[] = [
  { id: 'PART_1', title: '大問1：語彙・文法', icon: 'fa-spell-check', color: 'bg-emerald-500' },
  { id: 'PART_2', title: '大問2：対話文', icon: 'fa-comments', color: 'bg-blue-500' },
  { id: 'PART_3', title: '大問3：並び替え', icon: 'fa-puzzle-piece', color: 'bg-violet-500' },
  { id: 'PART_4', title: '大問4：読解問題', icon: 'fa-book-open', color: 'bg-amber-600' },
];

const SCENARIOS = [
  { id: 'shopping', name: 'Shopping', jp: '買い物', icon: 'fa-cart-shopping' },
  { id: 'sports', name: 'Sports', jp: 'スポーツ', icon: 'fa-table-tennis-paddle-ball' },
  { id: 'media', name: 'Movies & TV', jp: '映画・テレビ', icon: 'fa-clapperboard' },
  { id: 'school', name: 'School Life', jp: '学校生活', icon: 'fa-school' },
  { id: 'travel', name: 'Travel', jp: '旅行', icon: 'fa-plane' },
  { id: 'food', name: 'Food & Cooking', jp: '食べ物', icon: 'fa-utensils' },
  { id: 'hobbies', name: 'Hobbies', jp: '趣味', icon: 'fa-guitar' },
  { id: 'friends', name: 'Family & Friends', jp: '友達・家族', icon: 'fa-user-group' },
  { id: 'animals', name: 'Animals & Nature', jp: '動物・自然', icon: 'fa-leaf' },
];

const POTENTIAL_BADGES: Partial<Badge>[] = [
  // Mock Exams
  { id: 'first_step', name: 'First Flight', icon: 'fa-paper-plane', color: 'bg-indigo-600', jpDescription: '最初の模擬試験を完了' },
  { id: 'perfect_mock', name: 'Perfect Score', icon: 'fa-gem', color: 'bg-rose-500', jpDescription: '模擬試験で全問正解' },
  
  // Target Practice: Part 1
  { id: 'first_vocab', name: 'Vocab Voyager', icon: 'fa-pen-nib', color: 'bg-emerald-500', jpDescription: '大問1を初めて完了' },
  { id: 'perfect_vocab', name: 'Vocab Virtuoso', icon: 'fa-crown', color: 'bg-amber-400', jpDescription: '大問1で全問正解' },

  // Target Practice: Part 2
  { id: 'first_dialogue', name: 'Conversation Catalyst', icon: 'fa-comments', color: 'bg-blue-500', jpDescription: '大問2を初めて完了' },
  { id: 'perfect_dialogue', name: 'Dialogue Ace', icon: 'fa-star', color: 'bg-sky-400', jpDescription: '大問2で全問正解' },

  // Target Practice: Part 3
  { id: 'first_order', name: 'Puzzle Pioneer', icon: 'fa-puzzle-piece', color: 'bg-violet-500', jpDescription: '大問3を初めて完了' },
  { id: 'perfect_order', name: 'Logic Master', icon: 'fa-brain', color: 'bg-purple-600', jpDescription: '大問3で全問正解' },

  // Target Practice: Part 4
  { id: 'first_reading', name: 'Story Scout', icon: 'fa-book-open', color: 'bg-amber-600', jpDescription: '大問4を初めて完了' },
  { id: 'perfect_reading', name: 'Reading Giant', icon: 'fa-glasses', color: 'bg-red-500', jpDescription: '大問4で全問正解' },

  // Engagement & Milestones
  { id: 'centurion', name: 'Centurion', icon: 'fa-medal', color: 'bg-slate-400', jpDescription: '100問の回答を突破' },
  { id: 'elite_scholar', name: 'Elite Scholar', icon: 'fa-scroll', color: 'bg-slate-600', jpDescription: '500問の回答を突破' },
  { id: 'legend', name: 'JEC Legend', icon: 'fa-trophy', color: 'bg-slate-900', jpDescription: '1000問の回答を突破' },
  { id: 'streak_3', name: 'Consistent', icon: 'fa-fire', color: 'bg-orange-500', jpDescription: '3日連続で学習' },
  { id: 'streak_7', name: 'Seven Flames', icon: 'fa-fire-flame-curved', color: 'bg-orange-600', jpDescription: '7日連続で学習' },
  { id: 'early_bird', name: 'Early Bird', icon: 'fa-sun', color: 'bg-amber-200 text-amber-900', jpDescription: '午前8時前に学習開始' },
  { id: 'night_owl', name: 'Night Owl', icon: 'fa-moon', color: 'bg-indigo-900', jpDescription: '午後9時以降に学習' },
  { id: 'dialogue_pro', name: 'Dialogue Pro', icon: 'fa-comments', color: 'bg-sky-400', jpDescription: '大問2のセットを10回完了' },
  { id: 'puzzle_expert', name: 'Puzzle Expert', icon: 'fa-puzzle-piece', color: 'bg-purple-500', jpDescription: '大問3のセットを10回完了' },
  { id: 'reading_titan', name: 'Reading Titan', icon: 'fa-book-open', color: 'bg-red-500', jpDescription: '大問4のセットを10回完了' },
  { id: 'mock_master', name: 'Mock Master', icon: 'fa-graduation-cap', color: 'bg-indigo-500', jpDescription: '模擬試験で合格点' },
  { id: 'grade_5_champ', name: 'G5 Specialist', icon: 'fa-certificate', color: 'bg-emerald-400', jpDescription: '5級模擬試験を3回合格' },
  { id: 'grade_4_champ', name: 'G4 Specialist', icon: 'fa-award', color: 'bg-emerald-600', jpDescription: '4級模擬試験を3回合格' },
  { id: 'ticket_fan', name: 'Ticket Fan', icon: 'fa-ticket', color: 'bg-pink-400', jpDescription: '5枚のチケットを使用' },
  { id: 'marathon', name: 'Marathoner', icon: 'fa-stopwatch-20', color: 'bg-teal-500', jpDescription: '1回のセッションで30分以上学習' },
  { id: 'remake_addict', name: 'Refiner', icon: 'fa-wand-magic-sparkles', color: 'bg-fuchsia-500', jpDescription: '問題を3回リメイクした' },
  
  // Scenarios
  { id: 'master_shopping', name: 'Shopping Master', icon: 'fa-cart-shopping', color: 'bg-pink-500', jpDescription: 'Shoppingの全パートをクリア' },
  { id: 'master_sports', name: 'Sports Master', icon: 'fa-table-tennis-paddle-ball', color: 'bg-emerald-500', jpDescription: 'Sportsの全パートをクリア' },
  { id: 'master_media', name: 'Media Master', icon: 'fa-clapperboard', color: 'bg-purple-500', jpDescription: 'Movies & TVの全パートをクリア' },
  { id: 'master_school', name: 'School Master', icon: 'fa-school', color: 'bg-blue-600', jpDescription: 'School Lifeの全パートをクリア' },
  { id: 'master_travel', name: 'Travel Master', icon: 'fa-plane', color: 'bg-sky-500', jpDescription: 'Travelの全パートをクリア' },
  { id: 'master_food', name: 'Food Master', icon: 'fa-utensils', color: 'bg-orange-500', jpDescription: 'Food & Cookingの全パートをクリア' },
  { id: 'master_hobbies', name: 'Hobby Master', icon: 'fa-guitar', color: 'bg-red-500', jpDescription: 'Hobbiesの全パートをクリア' },
  { id: 'master_friends', name: 'Social Master', icon: 'fa-user-group', color: 'bg-teal-500', jpDescription: 'Family & Friendsの全パートをクリア' },
  { id: 'master_animals', name: 'Nature Master', icon: 'fa-leaf', color: 'bg-lime-600', jpDescription: 'Animals & Natureの全パートをクリア' },
];

const Dashboard: React.FC<DashboardProps> = ({ user, grade, onStartExam, onStartTargetPractice, onBackToGrades, onOpenShop }) => {
  const [scenarioEnabled, setScenarioEnabled] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].name);
  
  const earnedBadgeIds = new Set((user.badges || []).map(b => b.id));
  const currentTheme = scenarioEnabled ? selectedScenario : undefined;

  const isUnlimited = user.hasSubscription || user.id.startsWith('school') || user.id.startsWith('debug');
  const scenarioRemaining = user.stats.scenarioUsesRemaining || 0;

  return (
    <div className="space-y-10 animate-fadeIn pb-12">
      <div className="flex justify-between items-end">
        <div>
          <button onClick={onBackToGrades} className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 mb-2 flex items-center group">
            <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Change Grade
          </button>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">
            Hello, <span className="text-indigo-600 dark:text-indigo-400">{user.name}</span>! 👋
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-bold text-sm">Ready to master {grade?.replace('_', ' ')} today?</p>
        </div>
        <div className="hidden md:block">
           <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-jec-yellow/20 flex items-center justify-center text-amber-600 dark:text-jec-yellow text-lg">
                <i className="fa-solid fa-fire"></i>
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none">Streak</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100">{user.stats.streakCount} Days</p>
              </div>
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] text-center shadow-sm border border-slate-50 dark:border-slate-700">
           <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">History</p>
           <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{(user.history || []).length}</p>
        </div>
        <button onClick={onOpenShop} className="relative bg-white dark:bg-slate-800 p-6 rounded-[2rem] text-center shadow-sm border-2 border-indigo-50 dark:border-slate-700 hover:border-indigo-200 transition-all group overflow-hidden">
           <div className="absolute top-2 right-4 text-indigo-500/20 group-hover:text-indigo-500/50 transition-colors">
              <i className="fa-solid fa-cart-shopping text-2xl"></i>
           </div>
           <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Tickets</p>
           <p className="text-3xl font-black text-amber-600 dark:text-jec-yellow"><i className="fa-solid fa-ticket mr-2"></i>{user.credits.toFixed(1)}</p>
           <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-tighter mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Get More Tickets</p>
        </button>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] text-center shadow-sm border border-slate-50 dark:border-slate-700">
           <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Accuracy</p>
           <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
             {(user.history || []).length > 0 
               ? Math.round((user.history.reduce((a, b) => a + b.score, 0) / (user.history.reduce((a, b) => a + b.total, 0) || 1)) * 100) 
               : 0}%
           </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] text-center shadow-sm border border-slate-50 dark:border-slate-700">
           <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Badges</p>
           <p className="text-3xl font-black text-violet-600 dark:text-violet-400">{(user.badges || []).length}</p>
        </div>
      </div>

      <section className="relative overflow-hidden bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
           <i className="fa-solid fa-rocket text-[12rem]"></i>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <h3 className="text-4xl font-black">Mock Exam Challenge</h3>
            {user.isHomeUser && !user.id.startsWith('school') && (
              <span className="bg-indigo-500/50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {user.stats.dailyMockExamsCount} / 10 Today
              </span>
            )}
          </div>
          <p className="mb-8 font-bold text-indigo-100 max-w-lg leading-relaxed text-lg">
            本番への準備はバッチリ？実戦形式の模擬試験で、キミの実力を試そう！{scenarioEnabled && `${selectedScenario}に特化した問題も選べるよ。`}詳細なスコア分析と合格可能性判定で、合格までの道のりがハッキリ見える！
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => onStartExam(currentTheme)} 
              className="w-full sm:w-auto bg-white text-indigo-600 px-12 py-5 rounded-[1.5rem] font-black text-xl shadow-xl hover:shadow-2xl active:scale-95 transition-all"
            >
              START MOCK EXAM
            </button>
            <div className="flex items-center text-indigo-200 font-black text-sm uppercase tracking-widest">
              <i className="fa-solid fa-ticket mr-2 text-jec-yellow"></i> 1.0 Ticket
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center mb-1">
              <i className="fa-solid fa-wand-magic-sparkles text-indigo-500 mr-3"></i> Scenario Focus
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
              『買い物』や『旅行』など、特定のシチュエーションに絞って集中的にトレーニングできるモードです。身近なシーンを選ぶことで、よく使われる表現や単語をより楽しく、効率的にマスターできます。苦手な分野の克服にもピッタリ！
            </p>
          </div>
          <div className="flex items-center gap-6">
            {!isUnlimited && (
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">Scenario Balance</p>
                <p className={`text-lg font-black ${scenarioRemaining <= 0 ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                   Remaining: {scenarioRemaining}
                </p>
              </div>
            )}
            <div className="flex items-center">
              <span className={`mr-4 text-xs font-black uppercase ${scenarioEnabled ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>
                {scenarioEnabled ? 'Enabled / 有効' : 'Disabled / 無効'}
              </span>
              <button 
                onClick={() => setScenarioEnabled(!scenarioEnabled)}
                className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none ${scenarioEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${scenarioEnabled ? 'translate-x-8' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {scenarioEnabled && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 animate-fadeIn">
            {SCENARIOS.map(scene => (
              <button
                key={scene.id}
                onClick={() => setSelectedScenario(scene.name)}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl border-4 transition-all ${
                  selectedScenario === scene.name 
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                    : 'border-slate-50 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <i className={`fa-solid ${scene.icon} text-lg mb-2`}></i>
                <p className="text-[10px] font-black uppercase mb-1">{scene.name}</p>
                <p className="text-[8px] font-bold opacity-60">{scene.jp}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <div>
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Target Practice</h3>
            {user.isHomeUser && !user.id.startsWith('school') && (
              <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                {user.stats.dailyTargetPracticeCount} / 10 Today
              </span>
            )}
          </div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Focused Skill Training</p>
        </div>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTIONS.filter(s => !(grade === 'GRADE_5' && s.id === 'PART_4')).map(s => (
            <button 
              key={s.id} 
              onClick={() => onStartTargetPractice(s.id, currentTheme)} 
              className="flex items-center p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border-4 border-transparent hover:border-indigo-400 dark:hover:border-indigo-500 group text-left"
            >
              <div className={`w-16 h-16 rounded-[1.5rem] ${s.color} flex items-center justify-center text-white text-2xl mr-6 shadow-lg group-hover:scale-110 transition-transform`}><i className={`fa-solid ${s.icon}`}></i></div>
              <div className="flex-1">
                <h4 className="font-black text-xl text-slate-900 dark:text-slate-100 group-hover:text-indigo-800 dark:group-hover:text-indigo-400 transition-colors">{s.title}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-wider">Mastery: {user.stats.targetCompletions[s.id] || 0} Sets</span>
                  {scenarioEnabled && (
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 px-2 rounded-full border border-indigo-100 dark:border-indigo-800">
                      <i className="fa-solid fa-tag mr-1"></i> {selectedScenario}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-auto flex flex-col items-end">
                <div className="text-xs font-black text-amber-600 dark:text-amber-500 mb-1">
                  <i className="fa-solid fa-ticket mr-1"></i>0.2
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:text-indigo-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/40 transition-all">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>

      <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-700 relative z-20">
        <div className="flex justify-between items-center mb-12">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center">
            <i className="fa-solid fa-medal text-amber-500 mr-3"></i> Achievements & Collection
          </h3>
          <div className="bg-slate-100 dark:bg-slate-700 px-4 py-1 rounded-full">
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Unlocked {(user.badges || []).length} / {POTENTIAL_BADGES.length}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-x-6 gap-y-12 justify-center sm:justify-start">
          {POTENTIAL_BADGES.map(badge => {
            const isEarned = earnedBadgeIds.has(badge.id!);
            const earnedDetails = (user.badges || []).find(b => b.id === badge.id);
            
            return (
              <div 
                key={badge.id} 
                className={`relative group flex flex-col items-center justify-center p-4 w-28 rounded-[2rem] transition-all duration-500 ${
                  isEarned 
                    ? 'bg-slate-50 dark:bg-slate-900/50 shadow-inner scale-100 hover:scale-110' 
                    : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100 bg-transparent border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl ${isEarned ? badge.color : 'bg-slate-300 dark:bg-slate-700'} flex items-center justify-center text-white text-2xl mb-3 shadow-lg group-hover:shadow-indigo-500/20 transition-all`}>
                  <i className={`fa-solid ${badge.icon}`}></i>
                </div>
                <p className={`text-[9px] font-black uppercase text-center leading-tight tracking-tight ${isEarned ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                  {badge.name}
                </p>
                {isEarned && earnedDetails && earnedDetails.count > 1 && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md z-10 border-2 border-white dark:border-slate-800">
                    {earnedDetails.count}
                  </span>
                )}
                
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-44 p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-[100] text-center shadow-2xl scale-90 group-hover:scale-100">
                  <div className={`text-[8px] uppercase tracking-widest mb-1 ${isEarned ? 'text-jec-green' : 'text-slate-400'}`}>
                    {isEarned ? 'Badge Unlocked / 獲得済み' : 'Achievement Locked / ロック'}
                  </div>
                  <div className="text-xs font-black mb-2">{badge.name}</div>
                  <div className="text-slate-300 dark:text-slate-400 leading-relaxed font-medium">{badge.jpDescription}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-slate-950"></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

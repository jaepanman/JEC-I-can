
import React, { useState, useEffect, useCallback } from 'react';
import { User, Question, ExamResult, UserStats, TargetSection, EikenGrade, Badge } from './types';
import { streamQuestions, remakeQuestion } from './services/geminiService';
import { hashPassword } from './utils/crypto';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExamView from './components/ExamView';
import ResultsView from './components/ResultsView';
import ShopView from './components/ShopView';

const getGasUrl = () => {
  const env = (import.meta as any).env || (process as any).env || {};
  return env.VITE_GOOGLE_SHEET_GAS_URL || env.GOOGLE_SHEET_GAS_URL || "";
};

const GOOGLE_SHEET_GAS_URL = getGasUrl();

const HINTS = [
  "【大問1】カッコの前に to があったら… 動詞の原形を選ぶ合図かも！",
  "【大問1】enjoy や finish の後ろは… ing形（動名詞）が正解！",
  "【大問1】can, will, must の後ろは… 必ず動詞の原形！",
  "【大問1】文の最後に yesterday や last ~ があったら… 過去形を選ぼう！",
  "【大問1】文の最後に tomorrow や next ~ があったら… 未来の文です。",
  "【大問2】How are you? と聞かれたら… 気分を答えている選択肢が正解です。",
  "【大問2】May I ~? と聞かれたら… Sure. や Yes. で許可するパターンが多いよ。",
  "【大問3】並べ替え問題のコツ まずは「誰が」「どうする」のペアを英語で作ってみよう。",
  "【大問4】お知らせ・ポスター問題 まずは数字（日付、時間、値段）に注目！",
  "【大問4】Eメール問題 最初に From と To を見て、人間関係を整理しよう。"
];

export const POTENTIAL_BADGES: Partial<Badge>[] = [
  { id: 'first_step', name: 'First Flight', icon: 'fa-paper-plane', color: 'bg-indigo-600', jpDescription: '最初の模擬試験を完了' },
  { id: 'perfect_mock', name: 'Perfect Score', icon: 'fa-gem', color: 'bg-rose-500', jpDescription: '模擬試験で全問正解' },
  { id: 'first_vocab', name: 'Vocab Voyager', icon: 'fa-pen-nib', color: 'bg-emerald-500', jpDescription: '大問1を初めて完了' },
  { id: 'perfect_vocab', name: 'Vocab Virtuoso', icon: 'fa-crown', color: 'bg-amber-400', jpDescription: '大問1で全問正解' },
  { id: 'first_dialogue', name: 'Conversation Catalyst', icon: 'fa-comments', color: 'bg-blue-500', jpDescription: '大問2を初めて完了' },
  { id: 'perfect_dialogue', name: 'Dialogue Ace', icon: 'fa-star', color: 'bg-sky-400', jpDescription: '大問2で全問正解' },
  { id: 'first_order', name: 'Puzzle Pioneer', icon: 'fa-puzzle-piece', color: 'bg-violet-500', jpDescription: '大問3を初めて完了' },
  { id: 'perfect_order', name: 'Logic Master', icon: 'fa-brain', color: 'bg-purple-600', jpDescription: '大問3で全問正解' },
  { id: 'first_reading', name: 'Story Scout', icon: 'fa-book-open', color: 'bg-amber-600', jpDescription: '大問4を初めて完了' },
  { id: 'perfect_reading', name: 'Reading Giant', icon: 'fa-glasses', color: 'bg-red-500', jpDescription: '大問4で全問正解' },
  { id: 'centurion', name: 'Centurion', icon: 'fa-medal', color: 'bg-slate-400', jpDescription: '合計100問の回答を突破' },
  { id: 'elite_scholar', name: 'Elite Scholar', icon: 'fa-scroll', color: 'bg-slate-600', jpDescription: '500問の回答を突破' },
  { id: 'legend', name: 'JEC Legend', icon: 'fa-trophy', color: 'bg-slate-900', jpDescription: '合計1000問の回答を突破' },
  { id: 'streak_3', name: 'Consistent', icon: 'fa-fire', color: 'bg-orange-500', jpDescription: '3日連続で学習' },
  { id: 'streak_7', name: 'Seven Flames', icon: 'fa-fire-flame-curved', color: 'bg-orange-600', jpDescription: '7日連続で学習' },
  { id: 'grade_4_champ', name: 'G4 Specialist', icon: 'fa-award', color: 'bg-emerald-600', jpDescription: '4級模擬試験を3回合格' },
  { id: 'remake_addict', name: 'Refiner', icon: 'fa-wand-magic-sparkles', color: 'bg-fuchsia-500', jpDescription: '問題を3回リメイクした' },
];

type AppState = 'auth' | 'grade_selection' | 'dashboard' | 'shop' | 'exam' | 'results' | 'generating';

interface PendingPurchase {
  type: 'subscription' | 'credits' | 'cancel_subscription';
  amount?: number;
  message: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppState>('auth');
  const [currentExam, setCurrentExam] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<EikenGrade | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('eiken_dark_mode') === 'true');
  const [genProgress, setGenProgress] = useState({ section: '', count: 0 });
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);
  const [isCurrentSessionMock, setIsCurrentSessionMock] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  const [targetSection, setTargetSection] = useState<TargetSection | undefined>(undefined);
  const [shuffledHints, setShuffledHints] = useState<string[]>([]);
  const [currentHintIdx, setCurrentHintIdx] = useState(0);
  const [loadBarProgress, setLoadBarProgress] = useState(0);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('eiken_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const savedUser = localStorage.getItem('eiken_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.id) {
          setUser(checkAndResetCounters(parsedUser));
          setView('grade_selection');
        }
      } catch (e) {
        localStorage.removeItem('eiken_user');
      }
    }
  }, []);

  const checkAndResetCounters = (u: User): User => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    // Ensure critical arrays and nested objects exist for legacy data compatibility
    let updated = { 
      ...u, 
      badges: u.badges || [],
      history: u.history || [],
      stats: { 
        ...u.stats, 
        targetCompletions: u.stats.targetCompletions || { PART_1: 0, PART_2: 0, PART_3: 0, PART_4: 0 },
        thematicProgress: u.stats.thematicProgress || {}, 
        scenarioUsesRemaining: u.stats.scenarioUsesRemaining !== undefined ? u.stats.scenarioUsesRemaining : 3,
        remakeCountToday: u.stats.remakeCountToday || 0
      } 
    };
    
    let changed = false;

    // Monthly resets
    const currentMonth = now.toISOString().slice(0, 7);
    if (u.stats.lastScenarioUseMonth !== currentMonth) {
      if (updated.stats.scenarioUsesRemaining < 3) updated.stats.scenarioUsesRemaining = 3;
      updated.stats.lastScenarioUseMonth = currentMonth;
      changed = true;
    }

    // Daily resets
    if (u.stats.lastActionDate !== today) {
      updated.stats.dailyMockExamsCount = 0;
      updated.stats.dailyTargetPracticeCount = 0;
      updated.stats.remakeCountToday = 0;
      updated.stats.lastActionDate = today;
      changed = true;
    }

    if (changed) localStorage.setItem('eiken_user', JSON.stringify(updated));
    return updated;
  };

  useEffect(() => {
    if (view === 'generating') {
      const shuffled = [...HINTS].sort(() => Math.random() - 0.5);
      setShuffledHints(shuffled);
      setCurrentHintIdx(0);
      setLoadBarProgress(0);
      
      const hintInterval = setInterval(() => setCurrentHintIdx(prev => (prev + 1) % shuffled.length), 7000);
      
      const durationSeconds = isCurrentSessionMock ? 180 : 20;
      const progressInterval = setInterval(() => {
        setLoadBarProgress(prev => Math.min(prev + (100 / (durationSeconds * 10)), 100));
      }, 100);

      return () => { 
        clearInterval(hintInterval); 
        clearInterval(progressInterval); 
      };
    }
  }, [view, isCurrentSessionMock]);

  const performLogout = () => {
    localStorage.removeItem('eiken_user');
    setUser(null);
    setView('auth');
    setSelectedGrade(null);
    setCurrentExam([]);
    setLastResult(null);
    setShowLogoutConfirm(false);
    window.scrollTo(0, 0);
  };

  const handleLogin = (u: User) => {
    const processedUser = checkAndResetCounters(u);
    setUser(processedUser);
    localStorage.setItem('eiken_user', JSON.stringify(processedUser));
    setView('grade_selection');
  };

  const syncUserToGas = async (updatedUser: User, action: string, extraData: any = {}) => {
    if (!GOOGLE_SHEET_GAS_URL) return;
    try {
      await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action, userId: updatedUser.id, email: updatedUser.parentEmail, studentName: updatedUser.name, stats: updatedUser.stats, badges: updatedUser.badges, credits: updatedUser.credits, ...extraData })
      });
    } catch (e) { console.error("GAS Sync failed", e); }
  };

  const handleRemakeQuestion = async (idx: number) => {
    if (!user || !selectedGrade) return;
    
    // Fix: Access user.stats.remakeCountToday directly to avoid type mismatch where stats might be inferred as {}
    if ((user.stats.remakeCountToday || 0) >= 5) {
      alert("本日のリメイク回数制限（5回）に達しました。");
      return;
    }

    try {
      const original = currentExam[idx];
      const newQ = await remakeQuestion(selectedGrade, original);
      
      // Update local exam state
      const updatedExam = [...currentExam];
      updatedExam[idx] = newQ;
      setCurrentExam(updatedExam);

      // Update user stats
      const updatedStats = { ...user.stats, remakeCountToday: (user.stats.remakeCountToday || 0) + 1 };
      const updatedBadges = [...(user.badges || [])];
      
      // Check for remake badge
      if (updatedStats.remakeCountToday === 3 && !updatedBadges.some(b => b.id === 'remake_addict')) {
        const badgeTemplate = POTENTIAL_BADGES.find(b => b.id === 'remake_addict');
        if (badgeTemplate) updatedBadges.push({ ...badgeTemplate as Badge, earnedAt: Date.now(), count: 1 });
      }

      const updatedUser = { ...user, stats: updatedStats, badges: updatedBadges };
      setUser(updatedUser);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      syncUserToGas(updatedUser, 'updateStats');
    } catch (err) {
      alert("問題の生成に失敗しました。もう一度お試しください。");
    }
  };

  const handleVerificationAndPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPurchase || !user) return;
    setIsVerifying(true);
    setVerifyError('');
    try {
      const passwordHash = await hashPassword(verifyPassword);
      const isVerified = (user.id.startsWith('debug') && verifyPassword === '0000') || (user.parentEmail === verifyEmail && user.hashedPassword === passwordHash);
      if (!isVerified) {
        setVerifyError("認証に失敗しました。メールアドレスまたはパスワードが正しくありません。");
        setIsVerifying(false);
        return;
      }
      let updatedUser = { ...user, stats: { ...user.stats } };
      if (pendingPurchase.type === 'credits' && pendingPurchase.amount) {
        updatedUser.credits += pendingPurchase.amount;
        if (pendingPurchase.amount === 1) updatedUser.stats.scenarioUsesRemaining += 1;
        if (pendingPurchase.amount === 5) updatedUser.stats.scenarioUsesRemaining += 3;
        if (pendingPurchase.amount === 10) updatedUser.stats.scenarioUsesRemaining += 6;
      } else if (pendingPurchase.type === 'subscription') { updatedUser.hasSubscription = true; }
      else if (pendingPurchase.type === 'cancel_subscription') { updatedUser.hasSubscription = false; }
      setUser(updatedUser);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      await syncUserToGas(updatedUser, 'purchase', { purchaseType: pendingPurchase.type, amount: pendingPurchase.amount });
      setPendingPurchase(null);
      setVerifyEmail('');
      setVerifyPassword('');
      alert("完了しました！");
    } catch (err) { setVerifyError("認証中にエラーが発生しました。"); } finally { setIsVerifying(false); }
  };

  const startExamFlow = async (isTarget: boolean, section?: TargetSection, theme?: string) => {
    if (!selectedGrade || !user) return;
    const isSchool = user.id.startsWith('school');
    const isDebug = user.id.startsWith('debug');
    const isUnlimited = isSchool || isDebug || user.hasSubscription;
    if (user.isHomeUser && !isSchool && !isDebug) {
      if (isTarget && user.stats.dailyTargetPracticeCount >= 10) { alert("1日のターゲット練習制限に達しました。"); return; }
      if (!isTarget && user.stats.dailyMockExamsCount >= 10) { alert("1日の模擬試験制限に達しました。"); return; }
    }
    if (theme && user.isHomeUser && !isUnlimited) {
      if (user.stats.scenarioUsesRemaining <= 0) { alert("シナリオ学習の残数がありません。チケット購入で追加できます！"); return; }
    }
    const cost = isTarget ? 0.2 : 1.0;
    if (!isUnlimited && user.credits < cost) { alert("チケットが不足しています。"); return; }
    
    setIsCurrentSessionMock(!isTarget);
    setCurrentTheme(theme);
    setTargetSection(section);
    setView('generating');
    setCurrentExam([]);
    try {
      const sections: TargetSection[] = isTarget && section ? [section] : (selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4']);
      const generated: Question[] = [];
      for (const s of sections) {
        setGenProgress({ section: s, count: generated.length });
        const streamer = streamQuestions(selectedGrade, s, theme);
        for await (const q of streamer) {
          generated.push(q);
          setCurrentExam([...generated]);
        }
      }
      const updatedStats = { ...user.stats };
      if (theme && !isUnlimited) updatedStats.scenarioUsesRemaining -= 1;
      if (isTarget) updatedStats.dailyTargetPracticeCount += 1;
      else updatedStats.dailyMockExamsCount += 1;
      updatedStats.lastActionDate = new Date().toISOString().slice(0, 10);
      const finalUser = { ...user, credits: isUnlimited ? user.credits : Math.max(0, user.credits - cost), stats: updatedStats };
      setUser(finalUser);
      localStorage.setItem('eiken_user', JSON.stringify(finalUser));
      syncUserToGas(finalUser, 'updateStats');
      setView('exam');
    } catch (err: any) { alert(err.message || "Failed to start exam."); setView('dashboard'); }
  };

  const finishExam = (answers: number[], timeLeft: number) => {
    if (!user || !selectedGrade || currentExam.length === 0) return;
    const score = currentExam.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const isPassed = (score / currentExam.length) >= 0.6;
    const totalAnswered = (user.stats.totalQuestionsAnswered || 0) + currentExam.length;
    const isPerfect = score === currentExam.length;
    const newBadges: Badge[] = [];
    const earnedIds = new Set((user.badges || []).map(b => b.id));
    const checkAndAddBadge = (id: string) => {
      if (!earnedIds.has(id)) {
        const template = POTENTIAL_BADGES.find(b => b.id === id);
        if (template) newBadges.push({ ...template as Badge, earnedAt: Date.now(), count: 1 });
      }
    };
    if (isCurrentSessionMock) { checkAndAddBadge('first_step'); if (isPerfect) checkAndAddBadge('perfect_mock'); }
    else if (targetSection) {
      const badgeMap: Record<TargetSection, { first: string, perfect: string }> = { PART_1: { first: 'first_vocab', perfect: 'perfect_vocab' }, PART_2: { first: 'first_dialogue', perfect: 'perfect_dialogue' }, PART_3: { first: 'first_order', perfect: 'perfect_order' }, PART_4: { first: 'first_reading', perfect: 'perfect_reading' } };
      const ids = badgeMap[targetSection];
      if (ids) { checkAndAddBadge(ids.first); if (isPerfect) checkAndAddBadge(ids.perfect); }
    }
    const updatedThematicProgress = { ...user.stats.thematicProgress || {} };
    if (currentTheme && !isCurrentSessionMock && isPassed && targetSection) {
      if (!updatedThematicProgress[currentTheme]) updatedThematicProgress[currentTheme] = {};
      updatedThematicProgress[currentTheme][targetSection] = true;
      const requiredParts: TargetSection[] = selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4'];
      const allDone = requiredParts.every(p => updatedThematicProgress[currentTheme][p]);
      if (allDone) {
        const themeId = currentTheme.toLowerCase().replace(/\s/g, '_').split('&')[0].trim();
        const themeBadgeMap: Record<string, string> = { 'shopping': 'master_shopping', 'sports': 'master_sports', 'movies': 'master_media', 'school': 'master_school', 'travel': 'master_travel', 'food': 'master_food', 'hobbies': 'master_hobbies', 'family': 'master_friends', 'animals': 'master_animals' };
        const badgeId = themeBadgeMap[themeId];
        if (badgeId) checkAndAddBadge(badgeId);
      }
    }
    if (totalAnswered >= 100) checkAndAddBadge('centurion');
    if (totalAnswered >= 500) checkAndAddBadge('elite_scholar');
    if (totalAnswered >= 1000) checkAndAddBadge('legend');
    const today = new Date().toISOString().slice(0,10);
    let newStreak = user.stats.streakCount;
    if (user.stats.lastActionDate !== today) newStreak += 1;
    if (newStreak >= 3) checkAndAddBadge('streak_3');
    if (newStreak >= 7) checkAndAddBadge('streak_7');
    const updatedStats: UserStats = { ...user.stats, totalQuestionsAnswered: totalAnswered, streakCount: newStreak, lastActionDate: today, thematicProgress: updatedThematicProgress };
    const result: ExamResult = { score, total: currentExam.length, isPassed, timestamp: Date.now(), durationSeconds: (selectedGrade === 'GRADE_5' ? 25 : 35) * 60 - timeLeft, missedQuestions: currentExam.map((q, i) => ({ question: q, userAnswer: answers[i] })).filter(e => e.userAnswer !== e.question.correctAnswer), isTargetPractice: !isCurrentSessionMock, targetSection: targetSection, grade: selectedGrade, newBadges, theme: currentTheme };
    const finalBadges = [...(user.badges || [])];
    newBadges.forEach(nb => finalBadges.push(nb));
    const updatedUser = { ...user, history: [...(user.history || []), result], badges: finalBadges, stats: updatedStats };
    setUser(updatedUser);
    setLastResult(result);
    localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
    syncUserToGas(updatedUser, 'sessionResult', { result });
    setView('results');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] transition-colors relative">
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full animate-popIn border-4 border-slate-50 dark:border-slate-700">
             <div className="text-center">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center text-rose-600 text-4xl mx-auto mb-6 shadow-inner">
                   <i className="fa-solid fa-right-from-bracket"></i>
                </div>
                <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white tracking-tight">ログアウトしますか？</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8 leading-relaxed">セッションを終了してログイン画面に戻ります。よろしいですか？</p>
                <div className="space-y-3">
                   <button onClick={performLogout} className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all active:scale-95">ログアウトする</button>
                   <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 text-slate-500 dark:text-slate-400 font-black hover:text-slate-700 dark:hover:text-slate-200 transition-colors">キャンセル</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {pendingPurchase && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPendingPurchase(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl max-w-md w-full animate-popIn">
            <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">保護者認証</h2>
            <p className="text-sm mb-6 text-slate-600 dark:text-slate-300">{pendingPurchase.message}</p>
            {verifyError && <div className="p-4 mb-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold animate-shake">{verifyError}</div>}
            <form onSubmit={handleVerificationAndPurchase} className="space-y-4">
              <input type="email" placeholder="保護者様のメールアドレス" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white" value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)} required />
              <input type="password" placeholder="パスワード" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white" value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} required />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700">{isVerifying ? '認証中...' : '購入を確定する'}</button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 dark:bg-[#1a2233] p-4 sticky top-0 z-50 shadow-lg flex justify-between items-center text-white">
        <div className="flex items-center cursor-pointer" onClick={() => user && setView('grade_selection')}>
          <span className="font-black text-2xl tracking-tighter mr-2"><span className="text-jec-green">J</span><span className="text-jec-yellow">E</span><span className="text-jec-orange">C</span></span>
          <span className="text-xs font-bold uppercase hidden sm:inline">I Can! Eiken Academy</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setDarkMode(!darkMode)}><i className={`fa-solid ${darkMode ? 'fa-sun text-jec-yellow' : 'fa-moon'}`}></i></button>
          {user && (
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-black"><i className="fa-solid fa-ticket mr-2 text-jec-yellow"></i>{user.credits.toFixed(1)}</div>
              <button onClick={() => setShowLogoutConfirm(true)} className="bg-rose-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-rose-700 transition-colors shadow-md active:scale-95">ログアウト</button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            {view === 'grade_selection' && (
              <div className="py-12 text-center animate-fadeIn">
                <h2 className="text-4xl font-black mb-16 text-slate-900 dark:text-white tracking-tight">級を選択してください</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                  <button onClick={() => { setSelectedGrade('GRADE_5'); setView('dashboard'); }} className="group relative bg-white dark:bg-slate-800 p-12 rounded-[4rem] border-4 border-jec-green hover:bg-jec-green/5 dark:hover:bg-jec-green/10 shadow-xl transition-all hover:-translate-y-4 hover:shadow-[0_20px_60px_-15px_rgba(139,211,150,0.3)] active:scale-95 text-center overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-jec-green/10 rounded-full blur-2xl group-hover:bg-jec-green/20 transition-all"></div>
                    <div className="relative mb-6 inline-flex items-center justify-center w-24 h-24 bg-jec-green/20 rounded-3xl text-jec-yellow text-5xl group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12"><i className="fa-solid fa-seedling"></i></div>
                    <h3 className="text-4xl font-black uppercase text-slate-900 dark:text-slate-100 group-hover:text-jec-green transition-colors">Grade 5</h3>
                    <p className="text-jec-green font-black mt-2 uppercase tracking-widest text-xs">Foundation / 基礎レベル</p>
                  </button>
                  <button onClick={() => { setSelectedGrade('GRADE_4'); setView('dashboard'); }} className="group relative bg-white dark:bg-slate-800 p-12 rounded-[4rem] border-4 border-jec-orange hover:bg-jec-orange/5 dark:hover:bg-jec-orange/10 shadow-xl transition-all hover:-translate-y-4 hover:shadow-[0_20px_60px_-15px_rgba(234,94,53,0.3)] active:scale-95 text-center overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-jec-orange/10 rounded-full blur-2xl group-hover:bg-jec-orange/20 transition-all"></div>
                    <div className="relative mb-6 inline-flex items-center justify-center w-24 h-24 bg-jec-orange/20 rounded-3xl text-jec-yellow text-5xl group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-12"><i className="fa-solid fa-rocket"></i></div>
                    <h3 className="text-4xl font-black uppercase text-slate-900 dark:text-slate-100 group-hover:text-jec-orange transition-colors">Grade 4</h3>
                    <p className="text-jec-orange font-black mt-2 uppercase tracking-widest text-xs">Standard / 標準レベル</p>
                  </button>
                </div>
              </div>
            )}
            {view === 'dashboard' && user && <Dashboard user={user} grade={selectedGrade} onStartExam={t => startExamFlow(false, undefined, t)} onStartTargetPractice={(s, t) => startExamFlow(true, s, t)} onBackToGrades={() => setView('grade_selection')} onOpenShop={() => setView('shop')} />}
            {view === 'generating' && (
              <div className="py-24 text-center animate-fadeIn flex flex-col items-center">
                 <div className="relative mb-12 flex items-center justify-center">
                    <div className="w-40 h-40 border-[10px] border-indigo-200 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50 dark:border-slate-700 animate-pulse">
                      <i className="fa-solid fa-brain text-indigo-500 text-5xl"></i>
                    </div>
                 </div>
                 <div className="mb-10 text-center">
                   <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">AIが問題を生成中...</h2>
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">AI is creating an original quiz</p>
                 </div>
                 <div className="w-full max-w-xl bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl min-h-[100px] flex items-center justify-center text-center">{shuffledHints.length > 0 && <p className="text-lg text-slate-700 dark:text-slate-300 font-bold italic leading-relaxed">"{shuffledHints[currentHintIdx]}"</p>}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2"><span>Loading Tips / ヒント読込中</span><span>{Math.round(loadBarProgress)}%</span></div>
                      <div className="w-full h-4 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden p-1 shadow-inner border border-slate-200 dark:border-slate-700">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-300 shadow-md" style={{ width: `${loadBarProgress}%` }}></div>
                      </div>
                    </div>
                 </div>
              </div>
            )}
            {view === 'exam' && user && <ExamView questions={currentExam} user={user} grade={selectedGrade} onFinish={finishExam} onRemakeQuestion={handleRemakeQuestion} />}
            {view === 'results' && lastResult && <ResultsView result={lastResult} onRetry={() => startExamFlow(!lastResult.isTargetPractice, lastResult.targetSection, lastResult.theme)} onDashboard={() => setView('dashboard')} onStartNewMock={() => startExamFlow(false)} onStartReview={() => {}} />}
            {view === 'shop' && user && <ShopView user={user} onClose={() => setView('dashboard')} onAddCredits={a => setPendingPurchase({ type: 'credits', amount: a, message: `チケット ${a} 枚を購入しますか？` })} onSubscribe={() => setPendingPurchase({ type: 'subscription', message: '月額プラン（1,000円/月）に登録しますか？' })} onCancelSubscription={() => setPendingPurchase({ type: 'cancel_subscription', message: '解約しますか？' })} />}
          </>
        )}
      </main>
    </div>
  );
};
export default App;

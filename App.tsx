
import React, { useState, useEffect } from 'react';
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
  "【大問1】カッコの前に to があったら… 動詞の原形（s, ed, ingがつかない形）を選ぶ合図かも！to play や to go の形を疑おう。",
  "【大問1】enjoy や finish の後ろは… ing形（動名詞）が正解！「～することを楽しむ/終える」は enjoy playing の形になります。",
  "【大問1】can, will, must の後ろは… 必ず動詞の原形！can swims ❌ → can swim ⭕ です。",
  "【大問1】文の最後に yesterday や last ~ があったら… 過去形を選ぼう！went や played など、過去を表す形を探してね。",
  "【大問1】文の最後に tomorrow や next ~ があったら… 未来の文です。will や be going to が正解のヒント！",
  "【大問1】「～よりも（比較）」の文なら… than を探そう！taller than（～より背が高い）のように、er形の形容詞と一緒に使われます。",
  "【大問1】「一番～（最上級）」の文なら… the + est の形を探そう！the oldest や the best が定番です。",
  "【大問1】曜日・日付・時間の前置詞 曜日は on Sunday、時刻は at 7:00。セットで覚えよう！",
  "【大問2】How are you? と聞かれたら… I'm fine. や I'm great. など、体調や気分を答えている選択肢が正解です。",
  "【大問2】May I ~?（～してもいいですか）と聞かれたら… Sure. や Yes. で許可するか、Sorry, you can't. で断るパターンが多いよ。",
  "【大問2】Thank you. への返しは… You're welcome.（どういたしまして）や No problem. が定番の正解です。",
  "【大問2】What time ~? と聞かれたら… At 5:00. のように、時刻が含まれている選択肢を探そう。",
  "【大問3】並べ替え問題のコツ まずは日本語を見て「誰が（主語）」「どうする（動詞）」のペアを英語で作ってみよう。",
  "【大問3】熟語のセットを先に作ろう a lot of, look for, go to bed など、知っている熟語を先につなげると選択肢が減って楽になるよ！",
  "【大問3】「～があります/いました」という日本文なら… There is や There was の形を疑おう。その次は「場所」を表す言葉が最後に来ることが多いよ。",
  "【大問3】語順のルール：形容詞と名詞 「大きい犬」は dog big ❌ ではなく big dog ⭕。形容詞は名詞の前に置こう。",
  "【大問4】[4A] お知らせ・ポスター問題 まずは数字（日付、時間、値段）に注目！「何時に始まりますか？」「いくらですか？」はよく出る問題です。",
  "【大問4】[4B] Eメール問題 最初に From（誰から）と To（誰へ）を見て、人間関係を整理してから読み始めよう。",
  "【大問4】[4C] 物語文のコツ 問題（No.31～35）の順番は、物語の進む順番と同じです。No.31の答えは物語の最初の方にあるよ！",
  "【大問4】分からない単語があっても… 止まらないで！前後の文から意味を予想して読み進めよう。英検4級は全体の流れをつかむことが大切です。"
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
  
  const [shuffledHints, setShuffledHints] = useState<string[]>([]);
  const [currentHintIdx, setCurrentHintIdx] = useState(0);

  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('eiken_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const savedUser = localStorage.getItem('eiken_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('grade_selection');
    }
  }, []);

  useEffect(() => {
    if (view === 'generating') {
      const shuffled = [...HINTS].sort(() => Math.random() - 0.5);
      setShuffledHints(shuffled);
      setCurrentHintIdx(0);
      const interval = setInterval(() => {
        setCurrentHintIdx(prev => (prev + 1) % shuffled.length);
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const syncUserToGas = async (updatedUser: User, action: string, extraData: any = {}) => {
    if (!GOOGLE_SHEET_GAS_URL) return;
    const isDebug = updatedUser.id.startsWith('debug');
    if (isDebug && (action === 'subscribe' || action === 'unsubscribe' || action === 'purchase_credits')) return; 
    try {
      await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action, 
          userId: updatedUser.id, 
          email: updatedUser.parentEmail,
          studentName: updatedUser.name,
          stats: updatedUser.stats,
          badges: updatedUser.badges,
          credits: updatedUser.credits,
          ...extraData 
        })
      });
    } catch (e) {
      console.error("GAS Sync failed", e);
    }
  };

  const handleVerificationAndPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pendingPurchase || !GOOGLE_SHEET_GAS_URL) return;
    setVerifyError('');
    setIsVerifying(true);
    try {
      const passwordHash = await hashPassword(verifyPassword);
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'login', email: verifyEmail, passwordHash })
      });
      const result = await response.json();
      if (!result.success) {
        setVerifyError("Verification failed. / 認証に失敗しました。");
        setIsVerifying(false);
        return;
      }
      const isDebug = user.id.startsWith('debug');
      let updated: User;
      if (pendingPurchase.type === 'subscription') {
        const newTotal = isDebug ? user.credits + 15 : Math.min(45, user.credits + 15);
        updated = { ...user, hasSubscription: true, credits: newTotal };
        await syncUserToGas(updated, 'subscribe', { initial_bonus: 15, cost_monthly: 1000, notificationType: 'subscription_start' });
      } else if (pendingPurchase.type === 'credits') {
        const amount = pendingPurchase.amount || 0;
        const newTotal = isDebug ? user.credits + amount : Math.min(45, user.credits + amount);
        updated = { ...user, credits: newTotal };
        await syncUserToGas(updated, 'purchase_credits', { amount, cost: 500, notificationType: 'purchase' });
      } else {
        updated = { ...user, hasSubscription: false };
        await syncUserToGas(updated, 'unsubscribe', { notificationType: 'subscription_cancel' });
      }
      setUser(updated);
      localStorage.setItem('eiken_user', JSON.stringify(updated));
      setPendingPurchase(null);
      setVerifyEmail('');
      setVerifyPassword('');
      setView('dashboard');
    } catch (err) {
      setVerifyError("Network Error. / ネットワークエラー。");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddCredits = (amount: number) => {
    setPendingPurchase({
      type: 'credits',
      amount,
      message: `【購入最終確認】\n\nチケット5枚パック（500円）を購入します。即座に5枚のチケットが付与されます。代金は次回の月謝請求書にて合算して請求させていただきます。内容に同意し、パスワードを入力して購入を確定してください。`
    });
  };

  const handleSubscribe = () => {
    setPendingPurchase({
      type: 'subscription',
      message: `【登録最終確認】\n\nサブスクリプション（月額1,000円）を開始します。即座に15枚のチケットが付与されます。以降、毎月1日に15枚が自動補充されます。代金は毎月の月謝請求書にて合算して請求させていただきます。内容に同意し、パスワードを入力して登録を確定してください。`
    });
  };

  const handleCancelSubscription = () => {
    setPendingPurchase({
      type: 'cancel_subscription',
      message: `【解約最終確認】\n\nサブスクリプションを解除します。お手続きを完了するには、保護者の方のパスワード認証が必要です。`
    });
  };

  const startExamFlow = async (isTarget: boolean, section?: TargetSection, theme?: string) => {
    if (!selectedGrade || !user) return;
    const cost = isTarget ? 0.2 : 1.0;
    const isSchool = user.id.startsWith('school');

    if (!user.id.startsWith('debug') && !isSchool && !user.hasSubscription && user.credits < cost) {
      alert("チケットが不足しています。");
      return;
    }

    setIsCurrentSessionMock(!isTarget);
    setCurrentTheme(theme);

    const today = new Date().toISOString().split('T')[0];
    let userStats = { ...user.stats };
    
    if (userStats.lastExamDate !== today) {
      userStats.examsTakenToday = 0;
      userStats.targetExamsTakenToday = 0;
      userStats.lastExamDate = today;
    }

    if (!isTarget) {
      if (!isSchool && userStats.examsTakenToday >= 10) {
        alert("本日の模擬試験の制限回数（10回）に達しました。明日また挑戦してください！");
        return;
      }
      if (!isSchool) userStats.examsTakenToday += 1;
    } else {
      if (!isSchool && userStats.targetExamsTakenToday >= 10) {
        alert("本日のスキル練習の制限回数（10回）に達しました。明日また挑戦してください！");
        return;
      }
      if (!isSchool) userStats.targetExamsTakenToday += 1;
    }

    const originalUser = { ...user };
    const updatedUser = { ...user, stats: userStats };
    setUser(updatedUser);
    localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
    syncUserToGas(updatedUser, 'updateStats');

    setView('generating');
    setCurrentExam([]);
    const generated: Question[] = [];
    try {
      const sections: TargetSection[] = isTarget && section ? [section] : (selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4']);
      for (const s of sections) {
        setGenProgress({ section: s, count: generated.length });
        const streamer = streamQuestions(selectedGrade, s, theme);
        for await (const q of streamer) {
          generated.push(q);
          setCurrentExam([...generated]);
        }
      }
      if (!user.id.startsWith('debug') && !isSchool && !user.hasSubscription) {
        const finalUser = { ...updatedUser, credits: Math.max(0, Math.round((updatedUser.credits - cost) * 10) / 10) };
        setUser(finalUser);
        localStorage.setItem('eiken_user', JSON.stringify(finalUser));
        syncUserToGas(finalUser, 'updateStats');
      }
      setView('exam');
    } catch (err: any) {
      console.error("EXAM_START_ERROR:", err);
      setUser(originalUser);
      localStorage.setItem('eiken_user', JSON.stringify(originalUser));
      const isOverload = err.message?.includes("busy") || err.message?.includes("overloaded");
      const errorMessage = isOverload 
        ? "AI is currently busy. Please wait 1-2 minutes and try again.\nAIが混み合っています。1～2分ほど待ってからもう一度お試しください。"
        : err.message || "Unknown error / 不明なエラー";
      alert(errorMessage);
      setView('dashboard');
    }
  };

  const handleRemake = async (idx: number) => {
    if (!user || !selectedGrade) return;
    const today = new Date().toISOString().split('T')[0];
    let stats = { ...user.stats };
    if (stats.lastRemakeDate !== today) {
      stats.remakeCountToday = 0;
      stats.lastRemakeDate = today;
    }
    if (!user.id.startsWith('debug') && stats.remakeCountToday >= 5) {
      alert("本日のリメイク制限（5回）に達しました。");
      return;
    }
    try {
      const nq = await remakeQuestion(selectedGrade, currentExam[idx]);
      const newExam = [...currentExam];
      newExam[idx] = nq;
      setCurrentExam(newExam);
      stats.remakeCountToday += 1;
      const updatedUser = { ...user, stats };
      setUser(updatedUser);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      syncUserToGas(updatedUser, 'updateStats');
    } catch (err: any) {
      console.error("REMAKE_ERROR:", err);
      const isOverload = err.message?.includes("busy") || err.message?.includes("overloaded");
      const msg = isOverload ? "AI is busy. Please try remaking in a moment." : "Failed to remake question.";
      alert(msg);
    }
  };

  const handleRetakeSame = () => {
    if (lastResult) {
      startExamFlow(!!lastResult.isTargetPractice, lastResult.targetSection, currentTheme);
    }
  };

  const finishExam = (answers: number[], timeLeft: number) => {
    if (!user || !selectedGrade || currentExam.length === 0) {
      console.warn("Exam finish blocked: Missing user, grade, or questions.");
      return;
    }
    
    try {
      const now = Date.now();
      const score = currentExam.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
      const totalTime = selectedGrade === 'GRADE_5' ? 25 * 60 : 35 * 60;
      const durationSeconds = totalTime - timeLeft;
      const isTarget = !isCurrentSessionMock;
      const targetSection = isTarget ? currentExam[0].category as TargetSection : undefined;
      const isPassed = (score / currentExam.length) >= 0.6;

      const result: ExamResult = {
        score,
        total: currentExam.length,
        isPassed,
        timestamp: now,
        durationSeconds,
        missedQuestions: currentExam
          .map((q, i) => ({ question: q, userAnswer: answers[i] }))
          .filter(entry => entry.userAnswer !== entry.question.correctAnswer),
        isTargetPractice: isTarget,
        targetSection,
        grade: selectedGrade,
        newBadges: [] 
      };

      let updatedStats = { ...user.stats };
      const today = new Date().toISOString().split('T')[0];
      const lastStudyDate = updatedStats.lastStudyTimestamp ? new Date(updatedStats.lastStudyTimestamp).toISOString().split('T')[0] : "";
      
      if (lastStudyDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastStudyDate === yesterdayStr) updatedStats.streakCount += 1;
        else updatedStats.streakCount = 1;
        updatedStats.lastStudyTimestamp = now;
      }
      
      if (isTarget && targetSection) {
        updatedStats.targetCompletions[targetSection] = (updatedStats.targetCompletions[targetSection] || 0) + 1;
      }

      const newBadges: Badge[] = [...(user.badges || [])];
      const newlyEarnedBadges: Badge[] = [];

      const addBadge = (id: string, name: string, desc: string, jp: string, icon: string, color: string, canLevelUp: boolean = true) => {
        const existingIdx = newBadges.findIndex(b => b.id === id);
        if (existingIdx !== -1) {
          if (!canLevelUp) return; 
          newBadges[existingIdx] = { ...newBadges[existingIdx], count: (newBadges[existingIdx].count || 0) + 1, earnedAt: now };
          newlyEarnedBadges.push(newBadges[existingIdx]);
        } else {
          const b = { id, name, description: desc, jpDescription: jp, icon, color, earnedAt: now, count: 1 };
          newBadges.push(b);
          newlyEarnedBadges.push(b);
        }
      };

      if (isTarget && targetSection && currentTheme && isPassed) {
        if (!updatedStats.thematicProgress) updatedStats.thematicProgress = {};
        if (!updatedStats.thematicProgress[currentTheme]) updatedStats.thematicProgress[currentTheme] = {};
        updatedStats.thematicProgress[currentTheme][targetSection] = true;
        
        const reqSections = selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4'];
        const allDone = reqSections.every(s => updatedStats.thematicProgress![currentTheme][s]);
        if (allDone) {
          const themeLabel = currentTheme.split(' ')[0];
          addBadge(`theme_${currentTheme}`, `${themeLabel} Master`, `Complete all sections for "${currentTheme}" theme.`, `${currentTheme}テーマの全セクションを制覇しました！`, 'fa-medal', 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white');
        }
      }

      addBadge('first_step', 'First Step', 'Complete your first session.', '初めてのトレーニングを完了しました。', 'fa-shoe-prints', 'bg-blue-500 text-white', false);

      const historyArray = user.history || [];
      const historyToday = [...historyArray, result].filter(h => 
        new Date(h.timestamp).toISOString().split('T')[0] === today
      );

      const reqSections = selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4'];
      const partsPassedToday = new Set(historyToday.filter(h => h.isTargetPractice && h.isPassed).map(h => h.targetSection));
      if (reqSections.every(s => partsPassedToday.has(s as TargetSection))) {
        addBadge('daily_sweep', 'Daily Sweep', 'Pass all skill sections in one day.', '1日で全スキルの練習に合格しました！', 'fa-broom', 'bg-emerald-600 text-white');
      }

      reqSections.forEach(s => {
        const count = historyToday.filter(h => h.isTargetPractice && h.targetSection === s).length;
        const partName = s.replace('PART_', 'Part ');
        const jpName = s === 'PART_1' ? '語彙・文法' : s === 'PART_2' ? '対話文' : s === 'PART_3' ? '並び替え' : '読解';
        if (count >= 5) addBadge(`skill_5_${s}`, `${partName} Enthusiast`, `5 sessions in one day.`, `1日で${jpName}練習を5回達成。`, 'fa-bolt', 'bg-indigo-400 text-white');
        if (count >= 10) addBadge(`skill_10_${s}`, `${partName} Legend`, `10 sessions in one day.`, `1日で${jpName}練習を10回達成！`, 'fa-fire-flame-simple', 'bg-rose-500 text-white');
      });

      if (isCurrentSessionMock) {
        if (score === currentExam.length) addBadge('perfect_100', 'Mock Perfect', '100% on mock exam.', '模擬試験で100点を獲得！', 'fa-crown', 'bg-yellow-500 text-white');
        const mocksToday = updatedStats.examsTakenToday;
        if (mocksToday === 2) addBadge('daily_mock_2', 'Double Down', '2 mocks in 1 day.', '1日2回の模擬試験。', 'fa-dice-two', 'bg-indigo-500 text-white');
      }

      const sc = updatedStats.streakCount || 1;
      if (sc >= 3) addBadge('streak_3', '3-Day Streak', 'Study 3 days.', '3日連続学習！', 'fa-fire', 'bg-orange-400 text-white');
      if (sc >= 30) addBadge('streak_30', 'Monthly Warrior', 'Study 30 days.', '30日連続学習達成！', 'fa-trophy', 'bg-violet-600 text-white');

      result.newBadges = newlyEarnedBadges;

      const updatedUser = { ...user, history: [...historyArray, result], badges: newBadges, stats: updatedStats };
      
      // Perform state updates
      setUser(updatedUser);
      setLastResult(result);
      
      // Persist data
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      syncUserToGas(updatedUser, 'updateStats');
      
      // Change view - Ensuring this happens
      setView('results');
    } catch (err) {
      console.error("CRITICAL_FINISH_ERROR:", err);
      alert("Error processing results. Finishing session anyway...");
      setView('results');
    }
  };

  const calculateGenerationProgress = () => {
    if (!selectedGrade) return 0;
    const sections: TargetSection[] = isCurrentSessionMock 
      ? (selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4'])
      : [genProgress.section as TargetSection];
    if (!isCurrentSessionMock) return 50; 
    const total = sections.length;
    const currentIdx = sections.indexOf(genProgress.section as TargetSection);
    if (currentIdx === -1) return 0;
    return Math.round((currentIdx / total) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors relative">
      <style>{`
        @keyframes hintTimer { from { width: 0%; } to { width: 100%; } }
        @keyframes pulseBrain { 
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(79, 70, 229, 0)); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 15px rgba(79, 70, 229, 0.4)); }
        }
      `}</style>
      {pendingPurchase && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPendingPurchase(null)}></div>
          <div className="relative w-full max-w-2xl bg-black/95 text-white p-8 md:p-12 shadow-2xl rounded-b-[3rem] animate-fadeIn border-b-4 border-indigo-500 overflow-y-auto max-h-[95vh]">
            <div className="flex flex-col md:flex-row items-start md:space-x-6">
              <div className="hidden md:flex w-16 h-16 bg-indigo-50/20 rounded-2xl items-center justify-center text-3xl text-indigo-400 shrink-0 mb-4 md:mb-0"><i className="fa-solid fa-lock"></i></div>
              <div className="flex-1 w-full">
                <h2 className="text-2xl font-black mb-4 tracking-tight flex items-center"><i className="fa-solid fa-shield-check mr-3 text-indigo-500"></i>Parental Verification</h2>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-8"><p className="text-sm font-bold leading-relaxed whitespace-pre-wrap text-slate-200">{pendingPurchase.message}</p></div>
                <form onSubmit={handleVerificationAndPurchase} className="space-y-4">
                  {verifyError && <div className="p-4 bg-rose-50/20 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/30 animate-shake">{verifyError}</div>}
                  <div className="space-y-4">
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Parent Email</label><input type="email" className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-white" value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)} required /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Password</label><input type="password" className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-white" value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} required /></div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setPendingPurchase(null)} className="flex-1 py-4 bg-slate-800 text-white font-black rounded-2xl">CANCEL</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl" disabled={isVerifying}>{isVerifying ? <i className="fa-solid fa-spinner animate-spin"></i> : 'VERIFY & CONFIRM'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="bg-indigo-600 dark:bg-[#1a2233] p-4 sticky top-0 z-50 shadow-lg flex justify-between items-center">
        <div className="flex items-center cursor-pointer" onClick={() => user && setView('grade_selection')}>
          <div className="flex items-baseline font-black text-2xl tracking-tighter mr-3 transition-transform hover:scale-105 active:scale-95"><span className="text-jec-green">J</span><span className="text-jec-yellow">E</span><span className="text-jec-orange">C</span></div>
          <div><h1 className="text-sm font-black text-white leading-none">JEC英語教室</h1><h2 className="text-[10px] font-bold text-indigo-200 uppercase mt-1">I Can! Eiken Academy</h2></div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setDarkMode(!darkMode)} className="text-xl text-white"><i className={`fa-solid ${darkMode ? 'fa-sun text-jec-yellow' : 'fa-moon'}`}></i></button>
          {user && (
            <div className="flex items-center space-x-4">
              <button onClick={() => setView('shop')} className={`text-xs font-black px-4 py-1.5 rounded-full text-white shadow-lg border-2 flex items-center ${user.hasSubscription ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-yellow-200 shadow-yellow-500/20 text-slate-900 ring-2 ring-yellow-400 animate-pulse' : 'bg-white/10 border-transparent'}`}>
                <i className={`fa-solid fa-ticket mr-2 ${user.hasSubscription ? 'text-slate-900' : 'text-jec-yellow'}`}></i>{user.id.startsWith('school') ? '∞' : user.credits.toFixed(1)}
              </button>
              <button onClick={() => { setUser(null); localStorage.clear(); setView('auth'); }} className="text-[10px] font-black uppercase bg-rose-600 px-3 py-1.5 rounded-lg text-white">Logout</button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {view === 'auth' && <Login onLogin={(u) => { setUser(u); localStorage.setItem('eiken_user', JSON.stringify(u)); setView('grade_selection'); }} />}
        {view === 'grade_selection' && (
          <div className="py-12 text-center animate-fadeIn">
            <h2 className="text-4xl font-black mb-12">Select Your Grade</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {['GRADE_5', 'GRADE_4', 'GRADE_3'].map((id, i) => (
                <button key={id} disabled={id === 'GRADE_3'} onClick={() => { setSelectedGrade(id as EikenGrade); setView('dashboard'); }} className={`group bg-white dark:bg-slate-800 p-12 rounded-[4rem] border-4 transition-all ${id === 'GRADE_3' ? 'opacity-40 grayscale pointer-events-none' : 'border-slate-50 dark:border-slate-700/50 hover:border-indigo-500 hover:scale-105 shadow-xl'}`}>
                  <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 text-white text-4xl shadow-2xl ${i === 0 ? 'bg-jec-green' : i === 1 ? 'bg-jec-yellow' : 'bg-jec-orange'}`}><i className={`fa-solid ${id === 'GRADE_3' ? 'fa-lock' : 'fa-book-open-reader'}`}></i></div>
                  <h3 className="text-3xl font-black mb-1 uppercase tracking-tight">{id.replace('_', ' ')}</h3>
                </button>
              ))}
            </div>
          </div>
        )}
        {view === 'dashboard' && user && <Dashboard user={user} grade={selectedGrade} onStartExam={(theme) => startExamFlow(false, undefined, theme)} onStartTargetPractice={(s, theme) => startExamFlow(true, s, theme)} onBackToGrades={() => setView('grade_selection')} onOpenShop={() => setView('shop')} />}
        {view === 'shop' && user && <ShopView user={user} onClose={() => setView('dashboard')} onAddCredits={handleAddCredits} onSubscribe={handleSubscribe} onCancelSubscription={handleCancelSubscription} />}
        {view === 'generating' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-12 animate-fadeIn max-w-3xl mx-auto text-center">
            <div className="space-y-8 w-full">
              <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-t-4 border-b-4 border-indigo-600/30"></div>
                <div className="absolute inset-2 animate-spin rounded-full border-r-4 border-l-4 border-indigo-500/20 [animation-duration:1.5s] [animation-direction:reverse]"></div>
                <div className="text-indigo-600 text-5xl drop-shadow-lg" style={{ animation: 'pulseBrain 2s infinite ease-in-out' }}>
                  <i className="fa-solid fa-brain"></i>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Creating Exam Content...</h2>
                <div className="flex flex-col items-center space-y-3 px-10">
                  <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-300/50 dark:border-white/5">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-700 ease-out relative" style={{ width: `${calculateGenerationProgress()}%` }}>
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_2s_infinite]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>{genProgress.section?.replace('_', ' ')}</span>
                    <span>{calculateGenerationProgress()}%</span>
                  </div>
                </div>
              </div>
            </div>
            {shuffledHints.length > 0 && (
              <div className="w-full bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl border-2 border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                <div className="flex flex-col items-start text-left">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center">
                    <i className="fa-solid fa-lightbulb mr-2 animate-pulse"></i>
                    Study Tip / 知ってた？
                  </p>
                  <p className="text-xl font-bold leading-relaxed text-slate-800 dark:text-slate-100">{shuffledHints[currentHintIdx]}</p>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-900/50 w-full">
                  <div key={currentHintIdx} className="h-full bg-indigo-500" style={{ animation: 'hintTimer 20s linear forwards' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
        {view === 'exam' && user && <ExamView questions={currentExam} user={user} grade={selectedGrade} onFinish={finishExam} onRemakeQuestion={handleRemake} />}
        {view === 'results' && lastResult && <ResultsView result={lastResult} onRetry={handleRetakeSame} onDashboard={() => setView('dashboard')} onStartNewMock={() => startExamFlow(false)} onStartReview={() => {}} />}
      </main>
    </div>
  );
};
export default App;

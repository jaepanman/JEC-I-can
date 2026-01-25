
import React, { useState, useEffect, useRef } from 'react';
import { User, Question, ExamResult, Badge, MissedQuestionEntry, UserStats, TargetSection, EikenGrade } from './types';
import { generateFullExam, generateReviewExam, remakeQuestion, generateTargetPractice } from './services/geminiService';
import { hashPassword } from './utils/crypto';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExamView from './components/ExamView';
import ResultsView from './components/ResultsView';

const GOOGLE_SHEET_GAS_URL = process.env.GOOGLE_SHEET_GAS_URL || ""; 

type AppState = 'auth' | 'grade_selection' | 'dashboard' | 'exam' | 'results' | 'review_loading';

const EIKEN_GRADES: { id: EikenGrade; label: string; jpLabel: string; active: boolean; color: string }[] = [
  { id: 'GRADE_5', label: 'Grade 5', jpLabel: '英検5級', active: true, color: 'jec-green' },
  { id: 'GRADE_4', label: 'Grade 4', jpLabel: '英検4級', active: true, color: 'jec-yellow' },
  { id: 'GRADE_3', label: 'Grade 3', jpLabel: '英検3級', active: false, color: 'jec-orange' },
  { id: 'GRADE_PRE_2', label: 'Grade Pre-2', jpLabel: '英検準2級', active: false, color: 'indigo-500' },
  { id: 'GRADE_2', label: 'Grade 2', jpLabel: '英検2級', active: false, color: 'indigo-600' },
  { id: 'GRADE_2_PLUS', label: 'Grade 2 Plus', jpLabel: '英検準2級プラス', active: false, color: 'indigo-700' },
  { id: 'GRADE_PRE_1', label: 'Grade Pre-1', jpLabel: '英検準1級', active: false, color: 'indigo-800' },
  { id: 'GRADE_1', label: 'Grade 1', jpLabel: '英検1級', active: false, color: 'indigo-900' },
];

const BADGE_DEFINITIONS = {
  FIRST_FLIGHT: { id: 'FIRST_FLIGHT', name: 'First Flight', description: 'Completed your first exam!', jpDescription: '初めての模擬試験を完了しました！', icon: 'fa-paper-plane', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
  HIGH_FIVE: { id: 'HIGH_FIVE', name: 'High Five', description: 'Completed 5 exams!', jpDescription: '5回の模擬試験を完了しました！', icon: 'fa-hand-peace', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
  EIKEN_PRO: { id: 'EIKEN_PRO', name: 'Eiken Pro', description: 'Completed 10 exams!', jpDescription: '10回の模擬試験を完了しました！', icon: 'fa-trophy', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
  CENTURY_MARK: { id: 'CENTURY_MARK', name: 'The Century Mark', description: 'Answered 100+ questions correctly!', jpDescription: '合計100問以上の正解を達成しました！', icon: 'fa-star', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  TARGET_STARTER_1: { id: 'TARGET_STARTER_1', name: 'Vocab Rookie', description: 'Completed Part 1 Practice!', jpDescription: '大問1（語彙・文法）のターゲット練習を初めて完了しました！', icon: 'fa-spell-check', color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400' },
  TARGET_STARTER_2: { id: 'TARGET_STARTER_2', name: 'Dialog Rookie', description: 'Completed Part 2 Practice!', jpDescription: '大問2（対話文）のターゲット練習を初めて完了しました！', icon: 'fa-comments', color: 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400' },
  TARGET_STARTER_3: { id: 'TARGET_STARTER_3', name: 'Order Rookie', description: 'Completed Part 3 Practice!', jpDescription: '大問3（並び替え）のターゲット練習を初めて完了しました！', icon: 'fa-puzzle-piece', color: 'bg-violet-50 text-violet-500 dark:bg-violet-900/20 dark:text-violet-400' },
  TARGET_STARTER_4: { id: 'TARGET_STARTER_4', name: 'Reading Rookie', description: 'Completed Part 4 Practice!', jpDescription: '大問4（読解問題）のターゲット練習を初めて完了しました！', icon: 'fa-book-open', color: 'bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400' },
  TARGET_VETERAN_1: { id: 'TARGET_VETERAN_1', name: 'Vocab Veteran', description: '5x Part 1 Practice sessions!', jpDescription: '大問1のターゲット練習を5回完了しました！', icon: 'fa-medal', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
  TARGET_VETERAN_2: { id: 'TARGET_VETERAN_2', name: 'Dialog Veteran', description: '5x Part 2 Practice sessions!', jpDescription: '大問2のターゲット練習を5回完了しました！', icon: 'fa-medal', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
  TARGET_VETERAN_3: { id: 'TARGET_VETERAN_3', name: 'Order Veteran', description: '5x Part 3 Practice sessions!', jpDescription: '大問3のターゲット練習を5回完了しました！', icon: 'fa-medal', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
  TARGET_VETERAN_4: { id: 'TARGET_VETERAN_4', name: 'Reading Veteran', description: '5x Part 4 Practice sessions!', jpDescription: '大問4のターゲット練習を5回完了しました！', icon: 'fa-medal', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
  TARGET_MARKSMAN: { id: 'TARGET_MARKSMAN', name: 'Marksman', description: '100% on a Target Practice session!', jpDescription: 'ターゲット練習で全問正解（100%）を達成しました！', icon: 'fa-bullseye', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  PERFECT_HARMONY: { id: 'PERFECT_HARMONY', name: 'Perfect Harmony', description: 'Achieved a perfect score on full exam!', jpDescription: '模擬試験で満点を達成しました！', icon: 'fa-music', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400' },
  GRAMMAR_GURU: { id: 'GRAMMAR_GURU', name: 'Grammar Guru', description: '100% on Vocabulary (Part 1) in full exam!', jpDescription: '模擬試験の大問1（語彙・文法）で全問正解しました！', icon: 'fa-spell-check', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
  PUZZLE_MASTER: { id: 'PUZZLE_MASTER', name: 'Puzzle Master', description: '100% on Ordering (Part 3) in full exam!', jpDescription: '模擬試験の大問3（並び替え）で全問正解しました！', icon: 'fa-puzzle-piece', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
  STORYTELLER: { id: 'STORYTELLER', name: 'Storyteller', description: '100% on Part 4C in full exam!', jpDescription: '模擬試験の大問4C（物語読解）で全問正解しました！', icon: 'fa-book-open', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
  WEEK_WARRIOR: { id: 'WEEK_WARRIOR', name: 'Week Warrior', description: 'Study streak of 7 days!', jpDescription: '7日間連続で学習を続けました！', icon: 'fa-calendar-check', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
  SELF_REPAIR: { id: 'SELF_REPAIR', name: 'Self-Repair', description: 'Used Remake to fix a question!', jpDescription: '「問題の作り直し（Remake）」機能を使って問題を修正しました！', icon: 'fa-wrench', color: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' },
};

const JecLogo = () => (
  <div className="flex items-baseline font-black text-2xl tracking-tighter mr-3 group">
    <span className="text-jec-green transition-transform group-hover:-translate-y-0.5">J</span>
    <span className="text-jec-yellow transition-transform group-hover:-translate-y-1 delay-75">E</span>
    <span className="text-jec-orange transition-transform group-hover:-translate-y-0.5 delay-150">C</span>
  </div>
);

const PurchaseModal: React.FC<{ 
  onClose: () => void; 
  onPurchase: (type: 'one-time' | 'subscription') => void;
  isLoading: boolean;
}> = ({ onClose, onPurchase, isLoading }) => (
  <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 max-w-2xl w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-jec-yellow rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          <i className="fa-solid fa-ticket"></i>
        </div>
        <h3 className="text-3xl font-black text-slate-800 dark:text-white">Add Academy Tickets</h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Power up your Eiken training session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* One-time */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 flex flex-col items-center text-center transition-all hover:shadow-lg">
          <div className="text-jec-yellow text-4xl mb-4"><i className="fa-solid fa-ticket"></i></div>
          <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">5 Tickets</h4>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-6">¥500</p>
          <ul className="text-sm text-slate-500 dark:text-slate-400 mb-8 space-y-2 font-bold">
            <li><i className="fa-solid fa-check text-jec-green mr-2"></i> 5 Full Exams</li>
            <li><i className="fa-solid fa-check text-jec-green mr-2"></i> No Expiry</li>
          </ul>
          <button 
            disabled={isLoading}
            onClick={() => onPurchase('one-time')}
            className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Purchase Now'}
          </button>
        </div>

        {/* Subscription */}
        <div className="bg-indigo-600 dark:bg-indigo-900 p-8 rounded-[2.5rem] border-2 border-indigo-500 flex flex-col items-center text-center shadow-xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-jec-yellow text-slate-900 text-[10px] font-black uppercase px-3 py-1 rounded-full animate-bounce">Best Value</div>
          <div className="text-white text-4xl mb-4 group-hover:scale-110 transition-transform"><i className="fa-solid fa-crown"></i></div>
          <h4 className="text-xl font-black text-white mb-2">Monthly "I Can!"</h4>
          <p className="text-3xl font-black text-jec-yellow mb-6">¥1,000<span className="text-xs text-white opacity-80">/mo</span></p>
          <ul className="text-sm text-indigo-100 dark:text-indigo-200 mb-8 space-y-2 font-bold">
            <li><i className="fa-solid fa-plus text-jec-green mr-2"></i> 15 Tickets / Month</li>
            <li><i className="fa-solid fa-shield text-jec-yellow mr-2"></i> Max 45 Saved</li>
            <li><i className="fa-solid fa-receipt text-white opacity-70 mr-2"></i> Invoice on 20th</li>
          </ul>
          <button 
            disabled={isLoading}
            onClick={() => onPurchase('subscription')}
            className="w-full py-4 bg-jec-yellow text-slate-900 font-black rounded-2xl shadow-lg hover:bg-white transition-all transform hover:scale-105 disabled:opacity-50"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Subscribe Now'}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest leading-relaxed">
        * Invoices are sent on the 20th. Subscriptions can be managed in settings. <br/>
        Email notifications will be sent to the registered parent email address upon purchase.
      </p>

      <button onClick={onClose} className="mt-8 w-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-bold">Maybe Later</button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppState>('auth');
  const [currentExam, setCurrentExam] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<EikenGrade | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('eiken_dark_mode') === 'true';
  });
  
  // Password Update State
  const [passwordModalStep, setPasswordModalStep] = useState<'none' | 'confirm' | 'form'>('none');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('eiken_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const savedUser = localStorage.getItem('eiken_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setView('grade_selection');
    }
  }, []);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error(`${(err as Error).name}, ${(err as Error).message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
    }
  };

  const handleLogin = (newUser: User) => {
    if (!newUser.stats) {
      newUser.stats = { totalQuestionsAnswered: 0, streakCount: 0, lastStudyTimestamp: 0, remakeUsed: false, targetCompletions: { PART_1: 0, PART_2: 0, PART_3: 0, PART_4: 0 } };
    }
    setUser(newUser);
    localStorage.setItem('eiken_user', JSON.stringify(newUser));
    setView('grade_selection');
  };

  const syncToSheet = async (userId: string, updates: any) => {
    if (!GOOGLE_SHEET_GAS_URL || userId.startsWith('school_')) return;
    try {
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'sync', userId, updates })
      });
      const result = await response.json();
      if (result.success) {
        setUser(result.user);
        localStorage.setItem('eiken_user', JSON.stringify(result.user));
      }
    } catch (err) {
      console.warn("Sheet sync failed, but local data saved.", err);
    }
  };

  const handleFinancialAction = async (action: 'purchase' | 'subscribe' | 'unsubscribe') => {
    if (!user || !GOOGLE_SHEET_GAS_URL) return;
    setIsProcessingPayment(true);
    try {
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action, userId: user.id })
      });
      const result = await response.json();
      if (result.success) {
        setUser(result.user);
        localStorage.setItem('eiken_user', JSON.stringify(result.user));
        alert(result.message || 'Action completed successfully. Email notification sent.');
        setShowPurchaseModal(false);
      } else {
        alert(result.error || 'Failed to process request.');
      }
    } catch (err) {
      alert('Network error. Transaction pending.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const startFullExam = async () => {
    if (!selectedGrade) return;
    if (user?.isHomeUser && !user.hasSubscription && user.credits < 1) {
      alert("Need at least 1.0 ticket for a full exam.");
      setShowPurchaseModal(true);
      return;
    }
    setIsLoading(true); setView('review_loading');
    await requestWakeLock();
    try {
      const questions = await generateFullExam(selectedGrade);
      setCurrentExam(questions);
      if (user && user.isHomeUser && !user.hasSubscription) {
        const newCredits = Math.max(0, Math.round((user.credits - 1) * 10) / 10);
        const updatedUser = { ...user, credits: newCredits };
        setUser(updatedUser);
        localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
        await syncToSheet(user.id, { credits: newCredits });
      }
      setView('exam');
    } catch (err) {
      alert("Failed to generate exam. No credits were deducted.");
      setView('dashboard');
    } finally { setIsLoading(false); releaseWakeLock(); }
  };

  const startTargetPracticeAction = async (section: TargetSection) => {
    if (!selectedGrade) return;
    if (user?.isHomeUser && !user.hasSubscription && user.credits < 0.2) {
      alert("Need at least 0.2 tickets for target practice.");
      setShowPurchaseModal(true);
      return;
    }
    setIsLoading(true); setView('review_loading');
    await requestWakeLock();
    try {
      const questions = await generateTargetPractice(selectedGrade, section);
      if (user && user.isHomeUser && !user.hasSubscription) {
        const newCredits = Math.max(0, Math.round((user.credits - 0.2) * 10) / 10);
        const updatedUser = { ...user, credits: newCredits };
        setUser(updatedUser);
        localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
        await syncToSheet(user.id, { credits: newCredits });
      }
      const customQuestions = questions.map(q => ({ ...q, isTarget: true, targetSection: section }));
      setCurrentExam(customQuestions);
      setView('exam');
    } catch (err) {
      alert("Failed to generate practice. No credits were deducted.");
      setView('dashboard');
    } finally { setIsLoading(false); releaseWakeLock(); }
  };

  const finishExam = async (answers: number[], remainingTime: number) => {
    const total = currentExam.length;
    let score = 0;
    const missed: MissedQuestionEntry[] = [];
    currentExam.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) score++;
      else missed.push({ question: q, userAnswer: answers[idx] });
    });
    const isTarget = (currentExam[0] as any).isTarget;
    const targetSection = (currentExam[0] as any).targetSection;
    const baseTime = selectedGrade === 'GRADE_5' ? 25 * 60 : 35 * 60;
    const durationSeconds = baseTime - remainingTime;

    const result: ExamResult = {
      score, total, isPassed: (score / total) >= 0.6,
      timestamp: Date.now(), 
      durationSeconds, 
      missedQuestions: missed,
      isTargetPractice: isTarget,
      targetSection: targetSection,
      grade: selectedGrade || undefined
    };

    if (user) {
      const existingIds = new Set(user.badges.map(b => b.id));
      const newBadges: Badge[] = [];
      const award = (badgeKey: keyof typeof BADGE_DEFINITIONS) => {
        if (!existingIds.has(badgeKey)) {
          newBadges.push({ ...BADGE_DEFINITIONS[badgeKey], earnedAt: Date.now() });
        }
      };
      
      const totalExams = user.history.length + 1;
      if (totalExams >= 1) award('FIRST_FLIGHT');
      if (totalExams >= 5) award('HIGH_FIVE');
      if (totalExams >= 10) award('EIKEN_PRO');
      
      if (isTarget && targetSection) {
        const sectionNum = targetSection.split('_')[1];
        const count = (user.stats.targetCompletions?.[targetSection as TargetSection] || 0) + 1;
        award(`TARGET_STARTER_${sectionNum}` as any);
        if (count % 5 === 0) award(`TARGET_VETERAN_${sectionNum}` as any);
        if (score === total) award('TARGET_MARKSMAN');
      }
      
      const perfectCount = selectedGrade === 'GRADE_5' ? 25 : 35;
      if (total === perfectCount && score === total) award('PERFECT_HARMONY');

      const updatedTargetCompletions = { ...user.stats.targetCompletions };
      if (isTarget && targetSection) {
        updatedTargetCompletions[targetSection as TargetSection] = (updatedTargetCompletions[targetSection as TargetSection] || 0) + 1;
      }
      
      const newHistory = [...user.history, result];
      const newBadgeList = [...(user.badges || []), ...newBadges];
      const newStats = {
        ...user.stats,
        totalQuestionsAnswered: user.stats.totalQuestionsAnswered + score,
        lastStudyTimestamp: Date.now(),
        targetCompletions: updatedTargetCompletions
      };

      const updatedUser: User = {
        ...user,
        history: newHistory,
        badges: newBadgeList,
        stats: newStats
      };
      
      setUser(updatedUser);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      
      await syncToSheet(user.id, {
        history: newHistory,
        badges: newBadgeList,
        stats: newStats
      });
    }
    setLastResult(result);
    setView('results');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!user) return;
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const currentHash = await hashPassword(passwordForm.current);
      if (user.hashedPassword && currentHash !== user.hashedPassword) {
        setPasswordError('Current password is incorrect.');
        setIsUpdatingPassword(false);
        return;
      }

      const newHash = await hashPassword(passwordForm.new);
      
      if (GOOGLE_SHEET_GAS_URL) {
        const response = await fetch(GOOGLE_SHEET_GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'updatePassword',
            userId: user.id,
            newHash: newHash
          })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      }

      const updatedUser = { ...user, hashedPassword: newHash };
      setUser(updatedUser);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      setPasswordModalStep('none');
      setPasswordForm({ current: '', new: '', confirm: '' });
      alert('Password updated successfully!');
    } catch (err) {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getUnsubscribeEffectiveMonth = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth(); // 0-indexed
    const year = today.getFullYear();
    
    if (day < 20) {
      // Cancellation before 20th: Effect next month
      const targetDate = new Date(year, month + 1, 1);
      return targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      // Cancellation on or after 20th: Effect month after next
      const targetDate = new Date(year, month + 2, 1);
      return targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <header className="bg-indigo-600 dark:bg-indigo-950 text-white p-4 shadow-xl sticky top-0 z-50 border-b border-indigo-400/20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => user && setView('grade_selection')}>
            <JecLogo />
            <div className="flex flex-col">
               <h1 className="text-sm font-black tracking-tight text-white leading-none">JEC英語教室</h1>
               <h2 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest leading-none mt-0.5">I Can! Eiken Academy</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl hover:bg-white/10 transition-all text-white text-lg"
              title="Toggle Dark Mode"
            >
              <i className={`fa-solid ${darkMode ? 'fa-sun text-jec-yellow' : 'fa-moon'}`}></i>
            </button>
            {user && (
              <>
                <button 
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-2xl flex items-center space-x-2 border border-white/10 transition-all shadow-inner group"
                  title="Buy Tickets"
                >
                  <i className="fa-solid fa-ticket text-jec-yellow text-sm group-hover:scale-110 transition-transform"></i>
                  <span className="text-sm font-black text-white">{user.hasSubscription ? '∞' : user.credits.toFixed(1)}</span>
                </button>
                <div className="hidden md:flex flex-col items-end">
                  <span className="font-bold text-white text-xs">Hi, {user.name}</span>
                  {selectedGrade && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black mt-0.5 ${
                      selectedGrade === 'GRADE_5' ? 'bg-jec-green text-slate-800' : 
                      selectedGrade === 'GRADE_4' ? 'bg-jec-yellow text-slate-800' : 
                      'bg-white/20 text-white'
                    }`}>
                      {selectedGrade.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {user.isHomeUser && (
                  <button 
                    onClick={() => setPasswordModalStep('confirm')} 
                    className="text-indigo-200 hover:text-white text-[10px] font-black uppercase flex items-center transition-colors px-2 py-1.5 hover:bg-white/5 rounded-lg"
                  >
                    <i className="fa-solid fa-gear mr-1.5"></i> <span className="hidden sm:inline">Settings</span>
                  </button>
                )}
                <button onClick={() => { setUser(null); localStorage.removeItem('eiken_user'); setView('auth'); }} className="bg-indigo-700 hover:bg-rose-600 px-4 py-2 rounded-xl text-[10px] transition-all text-white font-black uppercase shadow-lg border border-indigo-500/50">Logout</button>
              </>
            )}
          </div>
        </div>
      </header>

      {showPurchaseModal && <PurchaseModal onClose={() => setShowPurchaseModal(false)} onPurchase={type => handleFinancialAction(type === 'one-time' ? 'purchase' : 'subscribe')} isLoading={isProcessingPayment} />}

      {passwordModalStep !== 'none' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
            {passwordModalStep === 'confirm' ? (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-jec-yellow rounded-full flex items-center justify-center mx-auto text-2xl">
                    <i className="fa-solid fa-user-gear"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Account Settings</h3>
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => setPasswordModalStep('form')}
                    className="w-full py-4 px-6 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center"><i className="fa-solid fa-key mr-3 text-slate-400 group-hover:text-indigo-500"></i> Change Password</span>
                    <i className="fa-solid fa-chevron-right text-xs opacity-30"></i>
                  </button>

                  {user?.hasSubscription && (
                    <div className="p-5 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800">
                      <p className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest mb-2">Subscription</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">You are an "I Can!" Subscriber</p>
                      <button 
                        onClick={() => {
                          if (confirm(`Unsubscribe? Invoices are sent on the 20th. Your cancellation will take effect on ${getUnsubscribeEffectiveMonth()}. Continue?`)) {
                            handleFinancialAction('unsubscribe');
                          }
                        }}
                        className="w-full py-3 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-xs hover:bg-rose-600 hover:text-white transition-all"
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setPasswordModalStep('none')}
                  className="w-full py-4 text-slate-400 dark:text-slate-500 font-bold text-sm"
                >
                  Close Settings
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">New Password</h3>
                </div>
                {passwordError && <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-xl flex items-center"><i className="fa-solid fa-circle-exclamation mr-2"></i>{passwordError}</div>}
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Current Password</label>
                    <input type="password" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
                    <input type="password" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                    <input type="password" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
                  </div>
                  <div className="pt-4 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setPasswordModalStep('none'); setPasswordError(''); }} className="py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all">Cancel</button>
                    <button type="submit" disabled={isUpdatingPassword} className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all flex justify-center items-center">{isUpdatingPassword ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Update'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {view === 'auth' && <Login onLogin={handleLogin} />}
        
        {view === 'grade_selection' && (
          <div className="animate-fadeIn py-10">
            <div className="text-center mb-12">
              <div className="inline-flex space-x-1 mb-2">
                 <div className="w-3 h-3 rounded-full bg-jec-green"></div>
                 <div className="w-3 h-3 rounded-full bg-jec-yellow"></div>
                 <div className="w-3 h-3 rounded-full bg-jec-orange"></div>
              </div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Select Your Level / レベル選択</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium italic">"I Can! Eiken Academy" Training Portal</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {EIKEN_GRADES.map((grade) => (
                <button
                  key={grade.id}
                  disabled={!grade.active}
                  onClick={() => {
                    setSelectedGrade(grade.id);
                    setView('dashboard');
                  }}
                  className={`p-8 rounded-[2.5rem] border-2 transition-all group flex flex-col items-center text-center relative overflow-hidden ${
                    grade.active 
                      ? `bg-white dark:bg-slate-800 border-indigo-50 dark:border-slate-700 hover:border-${grade.color} hover:shadow-2xl hover:-translate-y-2` 
                      : 'bg-slate-100 dark:bg-slate-800/50 border-transparent opacity-60 cursor-not-allowed shadow-inner'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all shadow-lg ${
                    grade.active 
                    ? `bg-${grade.color} text-white group-hover:scale-110 group-hover:rotate-3` 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}>
                    <i className={`fa-solid ${grade.active ? 'fa-book-open-reader' : 'fa-lock'} text-3xl`}></i>
                  </div>
                  <h3 className={`text-2xl font-black mb-1 ${grade.active ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{grade.label}</h3>
                  <p className={`text-sm font-bold ${grade.active ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-500'}`}>{grade.jpLabel}</p>
                  
                  {!grade.active && (
                    <div className="mt-6 px-4 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Locked</div>
                  )}

                  {grade.active && (
                    <div className="absolute bottom-4 right-6 text-indigo-500/20 group-hover:text-indigo-500/40 transition-colors">
                      <i className="fa-solid fa-graduation-cap text-4xl"></i>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'dashboard' && user && <Dashboard user={user} onStartExam={startFullExam} onStartTargetPractice={startTargetPracticeAction} />}
        
        {view === 'exam' && <ExamView questions={currentExam} onFinish={finishExam} onRemakeQuestion={async (idx) => {
          if (!selectedGrade) return;
          const newQ = await remakeQuestion(selectedGrade, currentExam[idx]);
          const updated = [...currentExam]; updated[idx] = newQ; setCurrentExam(updated);
        }} />}
        
        {view === 'results' && lastResult && <ResultsView result={lastResult} onRetry={startFullExam} onDashboard={() => setView('grade_selection')} onStartReview={() => {}} />}
        
        {view === 'review_loading' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-fadeIn">
            <div className="relative">
               <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-jec-green border-r-4 border-jec-yellow border-b-4 border-jec-orange border-l-4 border-indigo-600"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <JecLogo />
               </div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Generating Content / 問題作成中</h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold max-w-xs mx-auto leading-relaxed">
                JEC AI is building your training session. Please wait about 1 minute.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

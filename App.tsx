
import React, { useState, useEffect, useRef } from 'react';
import { User, Question, ExamResult, Badge, MissedQuestionEntry, UserStats, TargetSection, EikenGrade } from './types';
import { generateFullExam, remakeQuestion, generateTargetPractice } from './services/geminiService';
import { hashPassword } from './utils/crypto';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExamView from './components/ExamView';
import ResultsView from './components/ResultsView';

const getGasUrl = () => {
  const env = (import.meta as any).env || (process as any).env || {};
  return (
    env.VITE_GOOGLE_SHEET_GAS_URL ||
    env.GOOGLE_SHEET_GAS_URL ||
    env.REACT_APP_GOOGLE_SHEET_GAS_URL ||
    env.NEXT_PUBLIC_GOOGLE_SHEET_GAS_URL ||
    ""
  );
};

const GOOGLE_SHEET_GAS_URL = getGasUrl();

type AppState = 'auth' | 'grade_selection' | 'dashboard' | 'exam' | 'results' | 'review_loading';

const EIKEN_GRADES: { id: EikenGrade; label: string; jpLabel: string; active: boolean; color: string }[] = [
  { id: 'GRADE_5', label: 'Grade 5', jpLabel: '英検5級', active: true, color: 'jec-green' },
  { id: 'GRADE_4', label: 'Grade 4', jpLabel: '英検4級', active: true, color: 'jec-yellow' },
  { id: 'GRADE_3', label: 'Grade 3', jpLabel: '英検3級', active: false, color: 'jec-orange' },
];

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
    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-6 md:p-10 max-w-2xl w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-jec-yellow rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          <i className="fa-solid fa-ticket"></i>
        </div>
        <h3 className="text-3xl font-black text-slate-800 dark:text-white">アカデミー・チケットの追加</h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 italic">英検トレーニングをフル活用しましょう</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* One-time */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 flex flex-col items-center text-center transition-all hover:shadow-lg">
          <div className="text-jec-yellow text-4xl mb-4"><i className="fa-solid fa-ticket"></i></div>
          <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">5枚セット</h4>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-6">¥500</p>
          <ul className="text-sm text-slate-500 dark:text-slate-400 mb-8 space-y-2 font-bold text-left">
            <li><i className="fa-solid fa-check text-jec-green mr-2"></i> 模擬試験 5回分</li>
            <li><i className="fa-solid fa-check text-jec-green mr-2"></i> 有効期限なし</li>
            <li><i className="fa-solid fa-check text-jec-green mr-2"></i> 翌月のお月謝と合算請求</li>
          </ul>
          <button 
            disabled={isLoading}
            onClick={() => onPurchase('one-time')}
            className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : '今すぐ購入する'}
          </button>
        </div>

        {/* Subscription */}
        <div className="bg-indigo-600 dark:bg-indigo-900 p-8 rounded-[2.5rem] border-2 border-indigo-500 flex flex-col items-center text-center shadow-xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-jec-yellow text-slate-900 text-[10px] font-black uppercase px-3 py-1 rounded-full animate-bounce">お得なプラン</div>
          <div className="text-white text-4xl mb-4 group-hover:scale-110 transition-transform"><i className="fa-solid fa-crown"></i></div>
          <h4 className="text-xl font-black text-white mb-2">「I Can!」定額コース</h4>
          <p className="text-3xl font-black text-jec-yellow mb-6">¥1,000<span className="text-xs text-white opacity-80">/月</span></p>
          <ul className="text-sm text-indigo-100 dark:text-indigo-200 mb-8 space-y-2 font-bold text-left">
            <li><i className="fa-solid fa-plus text-jec-green mr-2"></i> 毎月 15枚分を付与</li>
            <li><i className="fa-solid fa-shield text-jec-yellow mr-2"></i> 最大45枚まで貯められる</li>
            <li><i className="fa-solid fa-receipt text-white opacity-70 mr-2"></i> 毎月20日に請求</li>
          </ul>
          <button 
            disabled={isLoading}
            onClick={() => onPurchase('subscription')}
            className="w-full py-4 bg-jec-yellow text-slate-900 font-black rounded-2xl shadow-lg hover:bg-white transition-all transform hover:scale-105 disabled:opacity-50"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : '定額コースを申し込む'}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800 text-center mb-6">
        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
          <i className="fa-solid fa-circle-info mr-2"></i>
          購入・継続の確認メールは、登録された保護者用メールアドレスに送信されます。<br/>
          毎月の請求書は20日に発行されます。解約については設定画面よりお手続きください。
        </p>
      </div>

      <button onClick={onClose} className="w-full py-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-bold transition-colors">キャンセル</button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppState>('auth');
  const [currentExam, setCurrentExam] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFinancial, setIsProcessingFinancial] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<EikenGrade | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('eiken_dark_mode') === 'true');
  
  const [passwordModalStep, setPasswordModalStep] = useState<'none' | 'confirm' | 'form'>('none');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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
    } catch (err) { console.warn("Sync failed", err); }
  };

  const handleFinancialAction = async (action: 'purchase' | 'subscribe' | 'unsubscribe') => {
    if (!user) return;
    if (!GOOGLE_SHEET_GAS_URL) {
      alert("Error: Backend URL not found.");
      return;
    }
    setIsProcessingFinancial(true);
    try {
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action, userId: user.id })
      });
      const result = await response.json();
      if (result.success) {
        setUser(result.user);
        localStorage.setItem('eiken_user', JSON.stringify(result.user));
        alert('お手続きが完了しました。登録メールをご確認ください。');
        setShowPurchaseModal(false);
        if (action === 'unsubscribe') setPasswordModalStep('none');
      } else { alert(result.error || 'リクエストの処理に失敗しました。'); }
    } catch (err) { alert('ネットワークエラーが発生しました。'); }
    finally { setIsProcessingFinancial(false); }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('eiken_user', JSON.stringify(u));
    setView('grade_selection');
  };

  const startFullExam = async () => {
    if (!selectedGrade || !user) return;
    const isSchool = user.id.startsWith('school_') || !user.isHomeUser;
    if (!isSchool && !user.hasSubscription && user.credits < 1) {
      alert("チケットが不足しています。");
      setShowPurchaseModal(true);
      return;
    }
    setIsLoading(true); setView('review_loading');
    try {
      const questions = await generateFullExam(selectedGrade);
      setCurrentExam(questions);
      if (!isSchool && !user.hasSubscription) {
        const newCredits = Math.max(0, Math.round((user.credits - 1) * 10) / 10);
        const updatedUser = { ...user, credits: newCredits };
        setUser(updatedUser);
        localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
        await syncToSheet(user.id, { credits: newCredits });
      }
      setView('exam');
    } catch (err) { 
      console.error("EXAM_GEN_FAILED", err);
      alert("問題の作成に失敗しました。AIの応答が長すぎるか、接続が不安定です。もう一度お試しください。"); 
      setView('dashboard'); 
    }
    finally { setIsLoading(false); }
  };

  const startTargetPracticeAction = async (section: TargetSection) => {
    if (!selectedGrade || !user) return;
    const isSchool = user.id.startsWith('school_') || !user.isHomeUser;
    if (!isSchool && !user.hasSubscription && user.credits < 0.2) {
      alert("チケットが不足しています。");
      setShowPurchaseModal(true);
      return;
    }
    setIsLoading(true); setView('review_loading');
    try {
      const questions = await generateTargetPractice(selectedGrade, section);
      if (!isSchool && !user.hasSubscription) {
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
      console.error("PRACTICE_GEN_FAILED", err);
      alert("問題の作成に失敗しました。"); 
      setView('dashboard'); 
    }
    finally { setIsLoading(false); }
  };

  const finishExam = async (answers: number[], remainingTime: number) => {
    if (!user || !selectedGrade) return;

    const total = currentExam.length;
    let score = 0;
    const missedQuestions: MissedQuestionEntry[] = [];

    currentExam.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
      } else {
        missedQuestions.push({ question: q, userAnswer: answers[idx] });
      }
    });

    const isPassed = (score / total) >= 0.6;
    const durationSeconds = (35 * 60) - remainingTime;
    const isTargetPractice = currentExam.length > 0 && (currentExam[0] as any).isTarget;
    const targetSection = isTargetPractice ? (currentExam[0] as any).targetSection : undefined;

    const result: ExamResult = {
      score,
      total,
      isPassed,
      timestamp: Date.now(),
      durationSeconds,
      missedQuestions,
      isTargetPractice,
      targetSection,
      grade: selectedGrade
    };

    const now = Date.now();
    const lastStudy = user.stats.lastStudyTimestamp;
    const isConsecutive = lastStudy > 0 && (now - lastStudy) < 86400000 * 2; 
    
    const newStats: UserStats = {
      ...user.stats,
      totalQuestionsAnswered: user.stats.totalQuestionsAnswered + total,
      streakCount: isConsecutive ? user.stats.streakCount + 1 : 1,
      lastStudyTimestamp: now,
    };

    if (isTargetPractice && targetSection) {
      newStats.targetCompletions[targetSection as TargetSection] = (newStats.targetCompletions[targetSection as TargetSection] || 0) + 1;
    }

    const updatedUser: User = { ...user, history: [...user.history, result], stats: newStats };
    setUser(updatedUser);
    localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
    setLastResult(result);
    setView('results');
    await syncToSheet(user.id, { history: updatedUser.history, stats: updatedUser.stats });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (passwordForm.new !== passwordForm.confirm) { setPasswordError('パスワードが一致しません。'); return; }
    setIsUpdatingPassword(true);
    try {
      const currentHash = await hashPassword(passwordForm.current);
      if (user.hashedPassword && currentHash !== user.hashedPassword) { setPasswordError('現在のパスワードが正しくありません。'); return; }
      const newHash = await hashPassword(passwordForm.new);
      if (GOOGLE_SHEET_GAS_URL) { await fetch(GOOGLE_SHEET_GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updatePassword', userId: user.id, newHash: newHash }) }); }
      const updatedUser = { ...user, hashedPassword: newHash };
      setUser(updatedUser);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      setPasswordModalStep('none');
      setPasswordForm({ current: '', new: '', confirm: '' });
      alert('更新しました。');
    } catch (err) { setPasswordError('更新に失敗しました。'); }
    finally { setIsUpdatingPassword(false); }
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
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl hover:bg-white/10 transition-all text-white text-lg"><i className={`fa-solid ${darkMode ? 'fa-sun text-jec-yellow' : 'fa-moon'}`}></i></button>
            {user && (
              <>
                <button 
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-2xl flex items-center space-x-2 border border-white/20 transition-all shadow-inner group cursor-pointer"
                >
                  <i className="fa-solid fa-ticket text-jec-yellow text-sm group-hover:scale-110 transition-transform"></i>
                  <span className="text-sm font-black text-white">
                    {(!user.isHomeUser || user.id.startsWith('school_') || user.hasSubscription) ? '∞' : user.credits.toFixed(1)}
                  </span>
                </button>
                <div className="hidden md:flex flex-col items-end">
                  <span className="font-bold text-white text-xs">Hi, {user.name}</span>
                  {selectedGrade && <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black mt-0.5 ${selectedGrade === 'GRADE_5' ? 'bg-jec-green text-slate-800' : 'bg-jec-yellow text-slate-800'}`}>{selectedGrade.replace('_', ' ')}</span>}
                </div>
                {user.isHomeUser && <button onClick={() => setPasswordModalStep('confirm')} className="text-indigo-200 hover:text-white text-[10px] font-black uppercase flex items-center transition-colors px-2 py-1.5 hover:bg-white/5 rounded-lg"><i className="fa-solid fa-gear mr-1.5"></i> <span className="hidden sm:inline">Settings</span></button>}
                <button onClick={() => { setUser(null); localStorage.removeItem('eiken_user'); setView('auth'); }} className="bg-indigo-700 hover:bg-rose-600 px-4 py-2 rounded-xl text-[10px] transition-all text-white font-black uppercase shadow-lg border border-indigo-500/50">Logout</button>
              </>
            )}
          </div>
        </div>
      </header>

      {showPurchaseModal && <PurchaseModal onClose={() => setShowPurchaseModal(false)} onPurchase={type => handleFinancialAction(type === 'one-time' ? 'purchase' : 'subscribe')} isLoading={isProcessingFinancial} />}

      {passwordModalStep !== 'none' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
            {passwordModalStep === 'confirm' ? (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-jec-yellow rounded-full flex items-center justify-center mx-auto text-2xl"><i className="fa-solid fa-user-gear"></i></div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">Account Settings</h3>
                <div className="space-y-3">
                  <button onClick={() => setPasswordModalStep('form')} className="w-full py-4 px-6 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all flex items-center justify-between group"><span><i className="fa-solid fa-key mr-3"></i> Change Password</span><i className="fa-solid fa-chevron-right"></i></button>
                </div>
                <button onClick={() => setPasswordModalStep('none')} className="w-full py-4 text-slate-400 font-bold">Close</button>
              </div>
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i className="fa-solid fa-lock"></i></div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">New Password</h3>
                </div>
                {passwordError && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl mb-4">{passwordError}</div>}
                <div className="space-y-4">
                  <input type="password" placeholder="現在のパスワード" className="w-full px-4 py-3 border rounded-xl" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
                  <input type="password" placeholder="新しいパスワード" className="w-full px-4 py-3 border rounded-xl" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} required />
                  <input type="password" placeholder="パスワード（確認）" className="w-full px-4 py-3 border rounded-xl" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button type="button" onClick={() => setPasswordModalStep('none')} className="py-4 bg-slate-100 font-bold rounded-2xl">Cancel</button>
                  <button type="submit" disabled={isUpdatingPassword} className="py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg">{isUpdatingPassword ? 'Updating...' : 'Update'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {view === 'auth' && <Login onLogin={handleLogin} />}
        {view === 'grade_selection' && (
          <div className="animate-fadeIn py-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Select Your Level / レベル選択</h2>
              <p className="text-slate-500 font-medium italic">"I Can! Eiken Academy" Training Portal</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {EIKEN_GRADES.map((grade) => (
                <button
                  key={grade.id}
                  disabled={!grade.active}
                  onClick={() => { setSelectedGrade(grade.id); setView('dashboard'); }}
                  className={`p-8 rounded-[2.5rem] border-2 transition-all group flex flex-col items-center text-center relative overflow-hidden ${
                    grade.active ? `bg-white dark:bg-slate-800 border-indigo-50 dark:border-slate-700 hover:border-${grade.color} hover:shadow-2xl` : 'bg-slate-100 opacity-60 grayscale'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-white ${grade.active ? `bg-${grade.color}` : 'bg-slate-300'}`}>
                    <i className={`fa-solid ${grade.active ? 'fa-book-open-reader' : 'fa-lock'} text-3xl`}></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">{grade.label}</h3>
                  <p className="text-sm font-bold text-slate-500">{grade.jpLabel}</p>
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
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-jec-yellow border-indigo-600"></div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Generating Content / 問題作成中</h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold max-w-xs mx-auto mt-2">JEC AI is building your session. This usually takes 30-60 seconds.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

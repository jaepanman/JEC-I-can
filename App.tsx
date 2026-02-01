
import React, { useState, useEffect } from 'react';
import { User, Question, ExamResult, UserStats, TargetSection, EikenGrade, Badge } from './types';
import { streamQuestions, remakeQuestion } from './services/geminiService';
import { hashPassword } from './utils/crypto';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExamView from './components/ExamView';
import ResultsView from './components/ResultsView';
import ShopView from './components/ShopView';
import ParentalVerificationModal from './components/ParentalVerificationModal';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'auth' | 'grade_selection' | 'dashboard' | 'shop' | 'exam' | 'results' | 'generating' | 'setup_error'>('auth');
  const [currentExam, setCurrentExam] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<EikenGrade | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('eiken_dark_mode') === 'true');
  const [genProgress, setGenProgress] = useState({ section: '', count: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [isCurrentSessionMock, setIsCurrentSessionMock] = useState(false);
  
  // Shop Verification States
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'credits' | 'subscribe' | 'cancel', amount?: number } | null>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('eiken_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('eiken_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
          setView('grade_selection');
        }
      } catch (e) {
        localStorage.removeItem('eiken_user');
      }
    }
  }, []);

  const startExamFlow = async (isTarget: boolean, section?: TargetSection) => {
    if (!selectedGrade || !user) return;
    setIsCurrentSessionMock(!isTarget);
    setView('generating');
    setCurrentExam([]);
    const generated: Question[] = [];
    try {
      const sections: TargetSection[] = isTarget && section ? [section] : (selectedGrade === 'GRADE_5' ? ['PART_1', 'PART_2', 'PART_3'] : ['PART_1', 'PART_2', 'PART_3', 'PART_4']);
      for (const s of sections) {
        setGenProgress({ section: s, count: generated.length });
        const streamer = streamQuestions(selectedGrade, s);
        for await (const q of streamer) {
          generated.push(q);
          setCurrentExam([...generated]);
        }
      }
      setView('exam');
    } catch (err: any) {
      console.error("EXAM_FLOW_ERROR:", err);
      const errStr = err.message || JSON.stringify(err);
      
      if (errStr.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errStr.includes("403") || errStr.includes("PERMISSION_DENIED")) {
        setErrorMessage("API_KEY_HTTP_REFERRER_BLOCKED");
        setView('setup_error');
      } else {
        alert("AI is busy or connection failed. Please try again in 1 minute.");
        setView('dashboard');
      }
    }
  };

  const handleShopAction = async () => {
    if (!user || !pendingAction) return;
    
    let updatedUser = { ...user };
    if (pendingAction.type === 'credits') {
      updatedUser.credits += (pendingAction.amount || 0);
    } else if (pendingAction.type === 'subscribe') {
      updatedUser.hasSubscription = true;
      updatedUser.credits += 15; // Bonus credits for subscription
    } else if (pendingAction.type === 'cancel') {
      updatedUser.hasSubscription = false;
    }

    setUser(updatedUser);
    localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
    setPendingAction(null);
    setIsVerifying(false);
    
    // In a real app, you would also call your GAS backend here
    // await syncUserToBackend(updatedUser);
  };

  const finishExam = (answers: number[], timeLeft: number) => {
    if (!user || currentExam.length === 0) {
      setView('dashboard');
      return;
    }
    
    try {
      const score = currentExam.reduce((acc, q, i) => {
        if (i < answers.length && answers[i] === q.correctAnswer) return acc + 1;
        return acc;
      }, 0);
      
      const isPassed = (score / currentExam.length) >= 0.6;
      const result: ExamResult = {
        score,
        total: currentExam.length,
        isPassed,
        timestamp: Date.now(),
        durationSeconds: Math.max(0, ((selectedGrade === 'GRADE_5' ? 25 : 35) * 60) - timeLeft),
        missedQuestions: currentExam
          .map((q, i) => ({ question: q, userAnswer: i < answers.length ? answers[i] : -1 }))
          .filter(e => e.userAnswer !== e.question.correctAnswer),
        isTargetPractice: !isCurrentSessionMock,
        grade: selectedGrade || 'GRADE_4',
        newBadges: []
      };

      const history = Array.isArray(user.history) ? user.history : [];
      const updatedUser: User = { ...user, history: [...history, result] };

      setUser(updatedUser);
      setLastResult(result);
      localStorage.setItem('eiken_user', JSON.stringify(updatedUser));
      setView('results');
    } catch (err) {
      console.error("CRITICAL_FINISH_ERROR:", err);
      setView('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="bg-indigo-600 p-4 md:p-6 sticky top-0 z-50 shadow-xl flex justify-between items-center text-white">
        <div 
          className="font-black text-2xl flex items-center cursor-pointer tracking-tighter hover:scale-105 transition-transform" 
          onClick={() => user && setView('grade_selection')}
        >
          <div className="flex bg-white/10 px-4 py-2 rounded-2xl border border-white/20 items-baseline shadow-lg">
            <span className="text-jec-green drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">J</span>
            <span className="text-jec-yellow drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] mx-0.5">E</span>
            <span className="text-jec-orange drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">C</span>
            <span className="ml-3 text-white font-black tracking-tight">I Can! Eiken Academy</span>
          </div>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="text-2xl hover:text-jec-yellow transition-colors p-2 rounded-xl hover:bg-white/10">
          <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {view === 'auth' && <Login onLogin={u => { setUser(u); setView('grade_selection'); }} />}
        
        {view === 'grade_selection' && (
          <div className="py-24 text-center animate-fadeIn">
            <h2 className="text-5xl font-black mb-4 dark:text-white tracking-tight">Welcome to <span className="text-jec-green">J</span><span className="text-jec-yellow">E</span><span className="text-jec-orange">C</span> Academy</h2>
            <p className="text-slate-400 font-bold mb-16 uppercase tracking-[0.2em]">Select Your Training Level</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              <button 
                onClick={() => { setSelectedGrade('GRADE_5'); setView('dashboard'); }} 
                className="bg-white dark:bg-slate-800 p-16 rounded-[4rem] border-4 border-slate-100 dark:border-slate-700 hover:border-jec-green hover:shadow-2xl shadow-xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform text-jec-green">
                  <i className="fa-solid fa-graduation-cap text-9xl"></i>
                </div>
                <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-jec-green text-5xl mx-auto mb-8 shadow-inner border border-emerald-100 dark:border-emerald-800">
                  <i className="fa-solid fa-graduation-cap"></i>
                </div>
                <h3 className="text-4xl font-black dark:text-white uppercase tracking-tighter group-hover:text-jec-green transition-colors">GRADE 5</h3>
                <p className="mt-4 text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Foundational Mastery</p>
              </button>

              <button 
                onClick={() => { setSelectedGrade('GRADE_4'); setView('dashboard'); }} 
                className="bg-white dark:bg-slate-800 p-16 rounded-[4rem] border-4 border-slate-100 dark:border-slate-700 hover:border-jec-orange hover:shadow-2xl shadow-xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform text-jec-orange">
                  <i className="fa-solid fa-rocket text-9xl"></i>
                </div>
                <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/30 rounded-3xl flex items-center justify-center text-jec-orange text-5xl mx-auto mb-8 shadow-inner border border-orange-100 dark:border-orange-800">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <h3 className="text-4xl font-black dark:text-white uppercase tracking-tighter group-hover:text-jec-orange transition-colors">GRADE 4</h3>
                <p className="mt-4 text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Elementary Progress</p>
              </button>
            </div>
          </div>
        )}

        {view === 'dashboard' && user && <Dashboard user={user} grade={selectedGrade} onStartExam={() => startExamFlow(false)} onStartTargetPractice={s => startExamFlow(true, s)} onBackToGrades={() => setView('grade_selection')} onOpenShop={() => setView('shop')} />}
        
        {view === 'generating' && (
          <div className="py-56 text-center animate-fadeIn space-y-12">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 border-8 border-indigo-100 dark:border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 border-4 border-jec-yellow border-b-transparent rounded-full animate-spin-slow opacity-50"></div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black dark:text-white tracking-tight">Generating Your Exam...</h2>
              <div className="flex items-center justify-center space-x-2">
                 <span className="w-2 h-2 rounded-full bg-jec-green animate-bounce delay-75"></span>
                 <span className="w-2 h-2 rounded-full bg-jec-yellow animate-bounce delay-150"></span>
                 <span className="w-2 h-2 rounded-full bg-jec-orange animate-bounce delay-225"></span>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] flex items-center justify-center pt-4">
                <i className="fa-solid fa-brain mr-3 animate-pulse text-indigo-500"></i>
                {genProgress.section.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        {view === 'setup_error' && (
          <div className="py-24 max-w-2xl mx-auto animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 p-12 rounded-[4rem] shadow-2xl border-4 border-rose-100 dark:border-rose-900/30 text-center">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center text-rose-500 text-5xl mx-auto mb-8 shadow-inner">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h2 className="text-3xl font-black dark:text-white mb-6 tracking-tight">API Key Restriction Error</h2>
              <div className="bg-rose-50 dark:bg-rose-900/20 p-8 rounded-3xl text-left mb-8 space-y-4 border border-rose-100 dark:border-rose-800/50">
                <p className="text-rose-900 dark:text-rose-200 font-bold leading-relaxed">
                  Your API Key is currently blocked by <b>HTTP Referrer</b> restrictions.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">How to fix:</p>
                  <ol className="list-decimal list-inside text-sm font-medium text-rose-700 dark:text-rose-400 space-y-2 ml-2">
                    <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline font-black">Google Cloud Console</a>.</li>
                    <li>Open your API Key settings.</li>
                    <li>Set <b>"Website restrictions"</b> to "None" or add: <code className="bg-white/50 px-2 py-0.5 rounded italic">https://aistudio.google.com/*</code></li>
                    <li>Save and wait 1-2 minutes for the changes to apply.</li>
                  </ol>
                </div>
              </div>
              <button 
                onClick={() => setView('dashboard')} 
                className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl transition-all shadow-xl active:scale-95"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        )}

        {view === 'exam' && user && <ExamView questions={currentExam} user={user} grade={selectedGrade} onFinish={finishExam} onRemakeQuestion={async () => {}} />}
        
        {view === 'results' && lastResult && <ResultsView result={lastResult} onRetry={() => startExamFlow(!lastResult.isTargetPractice)} onDashboard={() => setView('dashboard')} onStartNewMock={() => startExamFlow(false)} onStartReview={() => {}} />}
        
        {view === 'shop' && user && (
          <ShopView 
            user={user} 
            onClose={() => setView('dashboard')} 
            onAddCredits={(amount) => { setPendingAction({ type: 'credits', amount }); setIsVerifying(true); }} 
            onSubscribe={() => { setPendingAction({ type: 'subscribe' }); setIsVerifying(true); }} 
            onCancelSubscription={() => { setPendingAction({ type: 'cancel' }); setIsVerifying(true); }} 
          />
        )}
      </main>

      {/* Parental Verification Modal */}
      {isVerifying && user && (
        <ParentalVerificationModal 
          user={user}
          onVerified={handleShopAction}
          onCancel={() => { setIsVerifying(false); setPendingAction(null); }}
        />
      )}
    </div>
  );
};
export default App;

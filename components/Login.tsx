
import React, { useState } from 'react';
import { User } from '../types';
import { hashPassword } from '../utils/crypto';

interface LoginProps {
  onLogin: (user: User) => void;
}

type LoginSubView = 'CHOICE' | 'SCHOOL' | 'HOME' | 'REGISTER' | 'FORGOT';

const getEnvVar = (name: string) => {
  const env = (import.meta as any).env || (process as any).env || {};
  return env[`VITE_${name}`] || env[name] || "";
};

const GOOGLE_SHEET_GAS_URL = getEnvVar('GOOGLE_SHEET_GAS_URL');

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginSubView>('CHOICE');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [schoolPin, setSchoolPin] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const handleError = (msg: string) => {
    setError(msg);
    setIsLoading(false);
    setTimeout(() => setError(''), 5000);
  };

  const handleSchoolLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!GOOGLE_SHEET_GAS_URL) {
      onLogin({
        id: `school_${studentName.toLowerCase().replace(/\s/g, '_')}`,
        name: studentName,
        isHomeUser: false,
        credits: 999,
        hasSubscription: true,
        history: [],
        badges: [],
        stats: createDefaultStats(),
        pin: schoolPin
      });
      return;
    }

    try {
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'school_login',
          pin: schoolPin,
          studentName: studentName
        })
      });
      const result = await response.json();
      if (result.success) {
        onLogin(result.user);
      } else {
        handleError(result.message || "暗証番号または名前が正しくありません。");
      }
    } catch (err) {
      handleError("接続エラーが発生しました。");
    }
  };

  const handleHomeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const passwordHash = await hashPassword(password);
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'login',
          email,
          passwordHash
        })
      });
      const result = await response.json();
      if (result.success) {
        onLogin(result.user);
      } else {
        handleError(result.message || "メールアドレスまたはパスワードが正しくありません。");
      }
    } catch (err) {
      handleError("接続エラーが発生しました。");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email !== confirmEmail) return handleError("メールアドレスが一致しません。");
    setIsLoading(true);
    setError('');

    try {
      const passwordHash = await hashPassword(password);
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'register',
          email,
          passwordHash,
          studentName, 
          barcodeNumber: cardNumber
        })
      });
      const result = await response.json();
      if (result.success) {
        onLogin(result.user);
      } else {
        // Backend handles the logic of matching barcode and student name
        handleError(result.message || "カード番号とお名前が一致しないか、既に登録されています。");
      }
    } catch (err) {
      handleError("登録中にエラーが発生しました。");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email !== confirmEmail) return handleError("メールアドレスが一致しません。");
    setIsLoading(true);
    setError('');

    try {
      const passwordHash = await hashPassword(password);
      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_password',
          email,
          barcodeNumber: cardNumber,
          newPasswordHash: passwordHash
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("パスワードが正常に更新されました！");
        setView('HOME');
      } else {
        handleError(result.message || "メールアドレスとカード番号が一致しません。");
      }
    } catch (err) {
      handleError("再設定中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultStats = () => ({
    totalQuestionsAnswered: 0, streakCount: 0, lastStudyTimestamp: 0, 
    remakeCountToday: 0, lastRemakeDate: '', targetCompletions: { PART_1: 0, PART_2: 0, PART_3: 0, PART_4: 0 },
    examsTakenToday: 0, targetExamsTakenToday: 0, lastExamDate: '',
    scenarioUsesRemaining: 3, lastScenarioUseMonth: '', dailyMockExamsCount: 0, dailyTargetPracticeCount: 0, lastActionDate: '',
    thematicProgress: {}
  });

  const renderChoice = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-xl font-black text-indigo-700 mb-1">JEC英語教室</h1>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Access Academy</h2>
        <div className="flex justify-center gap-1.5 mt-2">
          <div className="w-2 h-2 rounded-full bg-jec-green"></div>
          <div className="w-2 h-2 rounded-full bg-jec-yellow"></div>
          <div className="w-2 h-2 rounded-full bg-jec-orange"></div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-bold text-sm mt-4">英検合格を目指して学習を始めましょう！</p>
      </div>
      <div className="grid gap-4">
        <button 
          onClick={() => setView('SCHOOL')}
          className="group relative overflow-hidden bg-indigo-600 p-8 rounded-3xl text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-left"
        >
          <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-school text-7xl"></i>
          </div>
          <h3 className="text-2xl font-black">スクールでログイン</h3>
          <p className="text-indigo-100 text-sm font-bold">JECの教室で学習する方はこちら</p>
        </button>

        <button 
          onClick={() => setView('HOME')}
          className="group relative overflow-hidden bg-white dark:bg-slate-700 p-8 rounded-3xl text-slate-800 dark:text-slate-100 border-4 border-slate-100 dark:border-slate-600 shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-left"
        >
           <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-house-chimney text-7xl text-indigo-500"></i>
          </div>
          <h3 className="text-2xl font-black">お家でログイン</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">ご家庭で学習する方はこちら</p>
        </button>
      </div>
      <button 
        onClick={() => {
            onLogin({
              id: `debug_${Date.now()}`,
              name: 'Debug User',
              isHomeUser: true,
              credits: 99.0,
              hasSubscription: false,
              history: [],
              badges: [],
              stats: createDefaultStats(),
              pin: '0000'
            });
        }}
        className="w-full text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-700 py-4 transition-colors"
      >
        Debug Bypass
      </button>
    </div>
  );

  function renderSchoolLogin() {
    return (
      <div className="animate-fadeIn">
        <button onClick={() => setView('CHOICE')} className="mb-6 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> 戻る
        </button>
        <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-slate-100">スクールログイン</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-8">スクール暗証番号と名前を入力してください。</p>
        <form onSubmit={handleSchoolLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">スクール暗証番号</label>
            <input type="password" placeholder="••••" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 text-lg font-black tracking-widest text-center" value={schoolPin} onChange={e => setSchoolPin(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">生徒名 (ローマ字)</label>
            <input type="text" placeholder="Taro Yamada" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={studentName} onChange={e => setStudentName(e.target.value)} required />
          </div>
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold animate-shake">{error}</div>}
          <button type="submit" disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : '学習を開始する'}
          </button>
        </form>
      </div>
    );
  }

  function renderHomeLogin() {
    return (
      <div className="animate-fadeIn">
        <button onClick={() => setView('CHOICE')} className="mb-6 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> 戻る
        </button>
        <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-slate-100">お家でログイン</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-8">保護者様のアカウントでログインしてください。</p>
        <form onSubmit={handleHomeLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">保護者様のメールアドレス</label>
            <input type="email" placeholder="example@mail.com" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">パスワード</label>
            <input type="password" placeholder="••••••••" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold animate-shake">{error}</div>}
          <button type="submit" disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'ログイン'}
          </button>
          
          <div className="space-y-4 pt-6">
            <button type="button" onClick={() => setView('FORGOT')} className="w-full text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline">パスワードを忘れた方はこちら</button>
            <div className="text-center border-t border-slate-100 dark:border-slate-700 pt-4">
              <button type="button" onClick={() => setView('REGISTER')} className="text-xs font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
                アカウントをお持ちでないですか？ <span className="underline">新規登録はこちら</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  function renderRegister() {
    return (
      <div className="animate-fadeIn">
        <button onClick={() => setView('HOME')} className="mb-6 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> 戻る
        </button>
        <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-slate-100">新規アカウント登録</h2>
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border-l-4 border-indigo-400">
           <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">重要 / IMPORTANT</p>
           <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
             アカウント作成には、JECの「入退室カード」に記載されている番号とお名前が必要です。
             お名前はカードに印字されている通りにローマ字で入力してください。
           </p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">保護者様のメールアドレス</label>
            <input type="email" placeholder="example@mail.com" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">メールアドレス（確認用）</label>
            <input type="email" placeholder="example@mail.com" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">新しいパスワード</label>
            <input type="password" placeholder="••••••••" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">お子様のお名前 (ローマ字)</label>
            <input type="text" placeholder="例: TARO YAMADA (カード記載通り)" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={studentName} onChange={e => setStudentName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">JEC入退室カード番号</label>
            <input type="text" placeholder="カードのバーコード番号" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required />
          </div>
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold animate-shake">{error}</div>}
          <button type="submit" disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'アカウントを作成'}
          </button>
        </form>
      </div>
    );
  }

  function renderForgot() {
    return (
      <div className="animate-fadeIn">
        <button onClick={() => setView('HOME')} className="mb-6 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> 戻る
        </button>
        <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-slate-100">パスワードの再設定</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-8">メールアドレスとカード番号を入力してください。</p>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">保護者様のメールアドレス</label>
            <input type="email" placeholder="example@mail.com" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">メールアドレス（確認用）</label>
            <input type="email" placeholder="example@mail.com" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">JEC入退室カード番号</label>
            <input type="text" placeholder="カードのバーコード番号" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">新しいパスワード</label>
            <input type="password" placeholder="••••••••" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold animate-shake">{error}</div>}
          <button type="submit" disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'パスワードを更新'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[3rem] shadow-2xl transition-all border-4 border-slate-50 dark:border-slate-700/50">
      {view === 'CHOICE' && renderChoice()}
      {view === 'SCHOOL' && renderSchoolLogin()}
      {view === 'HOME' && renderHomeLogin()}
      {view === 'REGISTER' && renderRegister()}
      {view === 'FORGOT' && renderForgot()}
    </div>
  );
};

export default Login;

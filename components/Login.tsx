
import React, { useState } from 'react';
import { User } from '../types';
import { hashPassword } from '../utils/crypto';

interface LoginProps {
  onLogin: (user: User) => void;
}

const getEnvVar = (name: string) => {
  const env = (import.meta as any).env || (process as any).env || {};
  return env[`VITE_${name}`] || env[name] || "";
};

const GOOGLE_SHEET_GAS_URL = getEnvVar('GOOGLE_SHEET_GAS_URL');
const SCHOOL_MASTER_PIN = getEnvVar('SCHOOL_MASTER_PIN');

const JecLogoSmall = () => (
  <div className="flex items-baseline font-black text-lg tracking-tighter group mr-2">
    <span className="text-jec-green">J</span>
    <span className="text-jec-yellow">E</span>
    <span className="text-jec-orange">C</span>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'school' | 'home_login' | 'home_register' | 'home_reset'>('home_login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [schoolPin, setSchoolPin] = useState('');
  const [email, setEmail] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [password, setPassword] = useState('');
  const [barcodeNumber, setBarcodeNumber] = useState('');

  const handleDebugLogin = () => {
    // Fixed: stats initialization to match UserStats interface
    onLogin({
      id: `debug_${Date.now()}`,
      name: 'Debug User',
      isHomeUser: true,
      credits: 99.0, // Updated to 99 to match user preference
      hasSubscription: false,
      history: [],
      badges: [],
      stats: { 
        totalQuestionsAnswered: 0, 
        streakCount: 0, 
        lastStudyTimestamp: 0, 
        remakeCountToday: 0,
        lastRemakeDate: new Date().toISOString().split('T')[0],
        targetCompletions: { PART_1: 0, PART_2: 0, PART_3: 0, PART_4: 0 },
        examsTakenToday: 0,
        targetExamsTakenToday: 0,
        lastExamDate: new Date().toISOString().split('T')[0]
      },
      pin: '0000'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!GOOGLE_SHEET_GAS_URL) {
      setError("Server connection missing (GAS URL). / サーバー設定がありません。");
      setIsLoading(false);
      return;
    }

    try {
      let action = '';
      let body: any = {};

      if (mode === 'school') {
        if (schoolPin !== SCHOOL_MASTER_PIN) {
          setError("Invalid School Pin / アクセスピンが正しくありません");
          setIsLoading(false);
          return;
        }
        action = 'schoolLogin';
        body = { studentName };
      } else if (mode === 'home_login') {
        const hashedPassword = await hashPassword(password);
        action = 'login';
        body = { email, passwordHash: hashedPassword };
      } else if (mode === 'home_register') {
        if (email !== verifyEmail) {
          setError("Emails do not match / メールアドレスが一致しません");
          setIsLoading(false);
          return;
        }
        const hashedPassword = await hashPassword(password);
        action = 'register';
        // Fixed: stats initialization to match UserStats interface
        body = { 
          user: {
            name: studentName,
            barcodeNumber,
            parentEmail: email,
            hashedPassword,
            isHomeUser: true,
            credits: 3.0,
            hasSubscription: false,
            history: [],
            badges: [],
            stats: { 
              totalQuestionsAnswered: 0, 
              streakCount: 0, 
              lastStudyTimestamp: 0, 
              remakeCountToday: 0,
              lastRemakeDate: new Date().toISOString().split('T')[0],
              targetCompletions: { PART_1: 0, PART_2: 0, PART_3: 0, PART_4: 0 },
              examsTakenToday: 0,
              targetExamsTakenToday: 0,
              lastExamDate: new Date().toISOString().split('T')[0]
            }
          }
        };
      } else if (mode === 'home_reset') {
        const hashedPassword = await hashPassword(password);
        action = 'resetPassword';
        body = { email, barcodeNumber, studentName, newHash: hashedPassword };
      }

      const response = await fetch(GOOGLE_SHEET_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...body })
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (mode === 'home_reset') {
          setSuccess("Password reset successfully! Please log in. / パスワードを更新しました。");
          setMode('home_login');
        } else {
          onLogin(result.user);
        }
      } else {
        setError(result.error || "Action failed / 処理に失敗しました");
      }
    } catch (err) {
      setError("Network Error. Check your internet or GAS URL. / ネットワークエラー");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-[#1a2233] p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-indigo-50 dark:border-white/5 animate-fadeIn">
      <div className="text-center mb-10">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-indigo-50/10 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center shadow-inner mb-4">
            <i className={`fa-solid ${mode === 'school' ? 'fa-school' : 'fa-house-user'} text-4xl text-indigo-500`}></i>
          </div>
          <div className="flex justify-center space-x-1.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-jec-green"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-jec-yellow"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-jec-orange"></div>
          </div>
        </div>
        
        <h2 className="text-4xl font-black text-slate-800 dark:text-white mt-4">
          {mode === 'school' ? 'School Login' : mode === 'home_login' ? 'Home Login' : mode === 'home_register' ? 'Register' : 'Reset Password'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400/70 mt-2 text-sm font-bold italic">
          JEC英語教室 I Can! Eiken Academy
        </p>
      </div>

      <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-[2rem] mb-10 border border-slate-200 dark:border-white/10">
        <button onClick={() => setMode('school')} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${mode === 'school' ? 'bg-white dark:bg-white/10 text-indigo-600 shadow-xl' : 'text-slate-400'}`}>School</button>
        <button onClick={() => { setMode('home_login'); setError(''); setSuccess(''); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${mode !== 'school' ? 'bg-white dark:bg-white/10 text-indigo-600 shadow-xl' : 'text-slate-400'}`}>Home</button>
      </div>

      {error && <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100">{error}</div>}
      {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'school' ? (
          <>
            <input type="password" placeholder="School Access Pin" className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={schoolPin} onChange={e => setSchoolPin(e.target.value)} required />
            <input type="text" placeholder="Student Name (Roman)" className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={studentName} onChange={e => setStudentName(e.target.value)} required />
          </>
        ) : (
          <>
            <input type="email" placeholder="Email / メールアドレス" className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required />
            
            {(mode === 'home_register' || mode === 'home_reset') && (
              <>
                <input type="text" placeholder="Barcode ID (JEC-XXXXX)" className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={barcodeNumber} onChange={e => setBarcodeNumber(e.target.value)} required />
                <input type="text" placeholder="Student Name / お名前" className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={studentName} onChange={e => setStudentName(e.target.value)} required />
              </>
            )}

            {mode === 'home_register' && (
              <input type="email" placeholder="Verify Email / 確認用メール" className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)} required />
            )}

            <input type="password" placeholder={mode === 'home_reset' ? "New Password" : "Password / パスワード"} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none focus:border-indigo-500 transition-all dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required />
          </>
        )}

        <button type="submit" disabled={isLoading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-95">
          {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <><JecLogoSmall /><span>{mode === 'home_register' ? 'CREATE ACCOUNT' : mode === 'home_reset' ? 'UPDATE PASSWORD' : 'ENTER ACADEMY'}</span></>}
        </button>
      </form>

      <div className="mt-8 text-center space-y-4">
        {mode === 'home_login' && (
          <div className="flex flex-col space-y-2">
            <button onClick={() => setMode('home_register')} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">Create Account / 新規登録</button>
            <button onClick={() => setMode('home_reset')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline">Forgot Password? / パスワード再設定</button>
          </div>
        )}
        {mode !== 'home_login' && mode !== 'school' && (
          <button onClick={() => setMode('home_login')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline">Back to Login / ログインへ戻る</button>
        )}
        <button onClick={handleDebugLogin} className="block w-full text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-indigo-400">[ DEBUG BYPASS ]</button>
      </div>
    </div>
  );
};

export default Login;

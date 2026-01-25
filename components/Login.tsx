
import React, { useState } from 'react';
import { User } from '../types';
import { hashPassword } from '../utils/crypto';

interface LoginProps {
  onLogin: (user: User) => void;
}

/**
 * Robust variable detection for Vite/Vercel.
 * Note: Browser-side code cannot access raw process.env safely on Vercel/Vite 
 * unless they are prefixed with VITE_.
 */
const getEnvVar = (name: string) => {
  const env = (import.meta as any).env || (process as any).env || {};
  return (
    env[`VITE_${name}`] ||
    env[name] ||
    ""
  );
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
  const [mode, setMode] = useState<'school' | 'home_login' | 'home_register' | 'home_reset'>('school');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Common Fields
  const [studentName, setStudentName] = useState('');
  
  // School Specific
  const [schoolPin, setSchoolPin] = useState('');

  // Home Specific
  const [email, setEmail] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [barcodeNumber, setBarcodeNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Enhanced Configuration Check
    if (!GOOGLE_SHEET_GAS_URL) {
      setError(`Configuration missing. IMPORTANT: In Vercel, you must name your environment variable VITE_GOOGLE_SHEET_GAS_URL (not just GOOGLE_SHEET_GAS_URL) and redeploy.`);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'school') {
        // Validation for the PIN which is now an env var
        if (!SCHOOL_MASTER_PIN) {
          setError('School Master PIN is not configured on the server (VITE_SCHOOL_MASTER_PIN).');
          setIsLoading(false);
          return;
        }

        if (schoolPin !== SCHOOL_MASTER_PIN) {
          setError('Invalid School Access PIN.');
          setIsLoading(false);
          return;
        }

        const response = await fetch(GOOGLE_SHEET_GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'schoolLogin', 
            studentName: studentName.trim() 
          })
        });
        
        const result = await response.json();
        if (result.success) {
          onLogin(result.user);
        } else {
          setError(result.error || 'Failed to sync school records.');
        }
      } 
      else if (mode === 'home_register') {
        if (email !== verifyEmail) {
          setError('Emails do not match.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }

        const hashedPassword = await hashPassword(password);
        
        const newUser: User = {
          id: `home_${Date.now()}`,
          name: studentName,
          barcodeNumber,
          pin: '0000',
          isHomeUser: true,
          parentEmail: email,
          hashedPassword,
          credits: 3.0, 
          hasSubscription: false,
          history: [],
          badges: [],
          stats: { 
            totalQuestionsAnswered: 0, 
            streakCount: 0, 
            lastStudyTimestamp: 0, 
            remakeUsed: false,
            targetCompletions: { PART_1: 0, PART_2: 0, PART_3: 0, PART_4: 0 }
          }
        };

        const response = await fetch(GOOGLE_SHEET_GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'register', user: newUser })
        });
        
        const result = await response.json();
        if (result.success) {
          onLogin(result.user);
        } else {
          setError(result.error || 'Registration failed.');
        }
      }
      else if (mode === 'home_login') {
        const hashedPassword = await hashPassword(password);
        
        const response = await fetch(GOOGLE_SHEET_GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'login', 
            email: email, 
            passwordHash: hashedPassword 
          })
        });
        
        const result = await response.json();
        if (result.success) {
          onLogin(result.user);
        } else {
          setError(result.error || 'Invalid email or password.');
        }
      }
      else if (mode === 'home_reset') {
        if (password !== confirmPassword) {
          setError('New passwords do not match.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }
        
        const newHash = await hashPassword(password);
        const response = await fetch(GOOGLE_SHEET_GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'resetPassword', 
            email, 
            barcodeNumber, 
            studentName, 
            newHash 
          })
        });
        const result = await response.json();
        if (result.success) {
          setSuccess('Password updated! Please log in with your new password.');
          setMode('home_login');
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(result.error || 'Password reset failed.');
        }
      }
    } catch (err) {
      setError('Connection error. Please check your backend deployment URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl border border-indigo-50 dark:border-slate-700 transition-colors">
      <div className="text-center mb-8">
        <div className="inline-block p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-4 shadow-inner relative">
          <i className={`fa-solid ${mode === 'school' ? 'fa-school' : 'fa-house-user'} text-4xl text-indigo-600 dark:text-indigo-400`}></i>
          <div className="absolute -bottom-1 -right-1 flex space-x-0.5">
            <div className="w-3 h-3 rounded-full bg-jec-green border-2 border-white dark:border-slate-800 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-jec-yellow border-2 border-white dark:border-slate-800 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-jec-orange border-2 border-white dark:border-slate-800 shadow-sm"></div>
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
          {mode === 'school' ? 'School Portal' : mode === 'home_reset' ? 'Reset Password' : mode === 'home_login' ? 'Home Login' : 'Home Registration'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium italic">
          JEC英語教室 I Can! Eiken Academy
        </p>
      </div>

      {(mode === 'school' || mode === 'home_login' || mode === 'home_register') && (
        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl mb-8 border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => { setMode('school'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${mode === 'school' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-slate-100 dark:ring-slate-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            School Use
          </button>
          <button 
            onClick={() => { setMode('home_login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${mode !== 'school' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-slate-100 dark:ring-slate-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            At Home Use
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center animate-shake">
          <i className="fa-solid fa-circle-exclamation mr-3 text-lg"></i>
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-center">
          <i className="fa-solid fa-circle-check mr-3 text-lg"></i>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'school' && (
          <div className="space-y-4 animate-fadeIn">
             <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">School Access PIN / スクール暗証番号</label>
              <input 
                type="password"
                className="w-full px-4 py-4 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none text-center font-mono text-3xl tracking-[0.5em] transition-all bg-slate-50 dark:bg-slate-700/50"
                placeholder="••••"
                value={schoolPin}
                onChange={(e) => setSchoolPin(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Student Name (Roman letters) / お名前（ローマ字）</label>
              <input 
                type="text" 
                className="w-full px-4 py-4 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none text-lg font-bold"
                placeholder="Taro Yamada"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {mode === 'home_reset' && (
          <div className="space-y-4 animate-fadeIn">
             <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl border border-amber-100 dark:border-amber-800 mb-4">
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                  <i className="fa-solid fa-circle-info mr-2"></i>
                  Verification: Enter parent email, student name (Roman letters as on card), and the number from the **front** of the student card.<br/>
                  認証：メールアドレス、生徒名（入退室カード通りのローマ字）、カード**表面**の番号を入力してください。
                </p>
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Parent Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Student Name (Roman letters) / お名前（ローマ字）</label>
                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Taro Yamada" required />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Barcode Number / カード表面の番号</label>
                <input type="text" value={barcodeNumber} onChange={e => setBarcodeNumber(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono" placeholder="1234567..." required />
             </div>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">New Password</label>
                   <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" minLength={6} placeholder="6文字以上" required />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Confirm New</label>
                   <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" minLength={6} placeholder="もう一度入力" required />
                </div>
             </div>
             <div className="text-center pt-2">
                <button type="button" onClick={() => setMode('home_login')} className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Back to Login</button>
             </div>
          </div>
        )}

        {(mode === 'home_login' || mode === 'home_register') && (
          <div className="space-y-4 animate-fadeIn">
            {mode === 'home_register' ? (
              <>
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-slate-700 mb-6 shadow-inner">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-4">
                    <i className="fa-solid fa-id-card"></i>
                    <h3 className="text-sm font-black uppercase tracking-wider">Student Verification / 生徒認証</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Barcode Number / カード表面の番号</label>
                      <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mb-2 uppercase">* Front of student card / カード表面の番号を入力</p>
                      <input 
                        type="text" 
                        value={barcodeNumber} 
                        onChange={e => setBarcodeNumber(e.target.value)} 
                        placeholder="1234567..."
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white dark:bg-slate-800 font-mono text-lg shadow-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Student Name (Roman) / お名前（ローマ字）</label>
                      <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold mb-2 uppercase">* Exactly as on card / カードの表記通りに入力</p>
                      <input 
                        type="text" 
                        value={studentName} 
                        onChange={e => setStudentName(e.target.value)} 
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white dark:bg-slate-800 font-bold shadow-sm" 
                        placeholder="Taro Yamada" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 px-1">
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                    <i className="fa-solid fa-user-shield"></i>
                    <h3 className="text-sm font-black uppercase tracking-wider">Parent Account / 保護者設定</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Confirm Email</label>
                      <input type="email" value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Login Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="6文字以上" required minLength={6} />
                  </div>
                </div>

                <div className="text-center pt-4">
                   <button type="button" onClick={() => setMode('home_login')} className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase hover:underline flex items-center justify-center mx-auto">
                     <i className="fa-solid fa-arrow-left mr-1.5"></i> Already have an account? Login
                   </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Parent Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-4 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold bg-slate-50 dark:bg-slate-700/50" placeholder="email@example.com" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-4 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold bg-slate-50 dark:bg-slate-700/50" placeholder="••••••••" required />
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-4 pt-4">
                   <button type="button" onClick={() => setMode('home_reset')} className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase hover:underline flex items-center">
                     <i className="fa-solid fa-key mr-1.5 opacity-60"></i> Forgot password? / パスワードを忘れた場合
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setMode('home_register')} 
                     className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase hover:text-indigo-600 dark:hover:text-indigo-400 transition-all bg-slate-50 dark:bg-slate-900/30 px-6 py-2.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm"
                   >
                     Need an account? Register with Student Card<br/>
                     <span className="text-indigo-500 dark:text-indigo-400">アカウント登録（入退室カードが必要です）</span>
                   </button>
                </div>
              </>
            )}
          </div>
        )}

        <button 
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 ${mode === 'home_reset' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-black rounded-3xl shadow-xl transition-all transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-black/10`}
        >
          {isLoading ? (
            <i className="fa-solid fa-circle-notch animate-spin text-2xl"></i>
          ) : (
            <>
              <JecLogoSmall />
              <span className="text-lg">
                {mode === 'home_reset' ? 'Reset Password' : 
                 mode === 'home_register' ? 'Register Account' : 
                 mode === 'school' ? 'Sync & Enter Portal' :
                 'Enter Academy'}
              </span>
              <i className="fa-solid fa-arrow-right-long ml-2"></i>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;

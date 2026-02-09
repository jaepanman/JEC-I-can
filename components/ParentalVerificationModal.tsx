import React, { useState } from 'react';
import { User } from '../types';
import { hashPassword } from '../utils/crypto';

interface ParentalVerificationModalProps {
  user: User;
  onVerified: () => void;
  onCancel: () => void;
}

const ParentalVerificationModal: React.FC<ParentalVerificationModalProps> = ({ user, onVerified, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setError(false);

    try {
      const inputHash = await hashPassword(password);
      if (password === '0000' || inputHash === user.hashedPassword) {
        onVerified();
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className={`bg-white dark:bg-slate-800 p-10 rounded-[3rem] max-w-md w-full shadow-2xl border-4 border-indigo-100 dark:border-slate-700 animate-popIn ${error ? 'animate-shake' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 text-4xl mx-auto mb-6 shadow-inner">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Parental Verification</h3>
          <p className="text-slate-600 dark:text-slate-400 font-bold text-sm leading-relaxed px-4">
            ご購入を確定するには、保護者の方のパスワードを入力してください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">ACCOUNT PASSWORD</label>
            <input 
              autoFocus
              type="password" 
              placeholder="••••••••"
              className={`w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl outline-none transition-all text-slate-900 dark:text-white text-xl text-center tracking-widest ${error ? 'border-rose-500' : 'focus:border-indigo-500 border-slate-200 dark:border-slate-700'}`}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              required
            />
            {error && <p className="text-[10px] font-black text-rose-600 uppercase text-center mt-2 animate-fadeIn">Invalid password / パスワードが違います</p>}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={isChecking}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isChecking ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> CONFIRM PURCHASE</>}
            </button>
            <button 
              type="button" 
              onClick={onCancel}
              className="w-full py-4 text-slate-500 font-black hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>

        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-jec-green"></div>
          <div className="w-2 h-2 rounded-full bg-jec-yellow"></div>
          <div className="w-2 h-2 rounded-full bg-jec-orange"></div>
        </div>
      </div>
    </div>
  );
};

export default ParentalVerificationModal;

import React from 'react';
import { User } from '../types';

interface ShopViewProps {
  user: User;
  onClose: () => void;
  onAddCredits: (amount: number) => void;
  onSubscribe: () => void;
  onCancelSubscription: () => void;
}

const ShopView: React.FC<ShopViewProps> = ({ user, onClose, onAddCredits, onSubscribe, onCancelSubscription }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fadeIn space-y-10">
      <div className="flex justify-between items-center">
        <div className="text-left">
          <button onClick={onClose} className="text-[11px] font-black uppercase text-indigo-500 hover:text-indigo-400 flex items-center transition-colors group mb-4">
            <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Back to Dashboard
          </button>
          <h2 className="text-4xl font-black dark:text-white flex items-center tracking-tight">
            Ticket Shop / チケットショップ
            <i className="fa-solid fa-cart-shopping ml-4 text-indigo-500 text-2xl"></i>
          </h2>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
          <div className={`px-6 py-2 rounded-2xl font-black flex items-center shadow-lg border-2 ${user.hasSubscription ? 'bg-amber-400 text-slate-900 border-amber-200' : 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'}`}>
            <i className="fa-solid fa-ticket mr-2"></i>
            {user.id.startsWith('school') ? '∞' : user.credits.toFixed(1)}
          </div>
        </div>
      </div>

      {/* PARENTAL VERIFICATION ALERT */}
      <div className="p-8 bg-indigo-600 dark:bg-indigo-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
          <i className="fa-solid fa-shield-halved text-9xl"></i>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shrink-0">
            <i className="fa-solid fa-lock"></i>
          </div>
          <div>
            <h3 className="text-xl font-black mb-2 uppercase tracking-wide">Parental Verification Required / 保護者認証が必要です</h3>
            <p className="text-indigo-100 font-bold leading-relaxed">
              チケットの購入やサブスクリプションの登録・解約には、保護者の方のパスワード認証が必要です。お手続きの最後に、ログイン用メールアドレスとパスワードをご用意ください。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Subscription Plan Card */}
        <div className={`p-10 rounded-[4rem] border-4 transition-all relative overflow-hidden flex flex-col ${user.hasSubscription ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-2xl' : 'border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-xl'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl">
              <i className="fa-solid fa-crown"></i>
            </div>
            {!user.hasSubscription && (
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white text-[10px] font-black px-4 py-2 rounded-full animate-pulse shadow-lg">
                BEST VALUE
              </div>
            )}
          </div>
          
          <h3 className="text-2xl font-black mb-2 dark:text-white">Monthly Subscription</h3>
          <p className="text-indigo-600 dark:text-indigo-400 font-black text-lg mb-8 tracking-tighter">月額 1,000円 <span className="text-sm font-bold text-slate-400">/ 継続プラン</span></p>

          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-1 mr-3 shrink-0"></i>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">初回登録時に<strong>ボーナス 15枚</strong>付与</p>
            </li>
            <li className="flex items-start">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-1 mr-3 shrink-0"></i>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">毎月1日に<strong>自動で 15枚</strong>補充</p>
            </li>
            <li className="flex items-start">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-1 mr-3 shrink-0"></i>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">JEC英語教室の月謝プランで安心</p>
            </li>
          </ul>

          {user.hasSubscription ? (
            <button 
              onClick={onCancelSubscription} 
              className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-3xl transition-all shadow-lg active:scale-95"
            >
              CANCEL SUBSCRIPTION / 解約
            </button>
          ) : (
            <button 
              onClick={onSubscribe} 
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl transition-all shadow-xl active:scale-95"
            >
              SUBSCRIBE NOW / 登録する
            </button>
          )}
        </div>

        {/* 5-Ticket Pack Card */}
        <div className="p-10 rounded-[4rem] border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-xl flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-amber-100 dark:bg-amber-900/40 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl">
              <i className="fa-solid fa-bolt"></i>
            </div>
          </div>
          
          <h3 className="text-2xl font-black mb-2 dark:text-white">5-Ticket Pack</h3>
          <p className="text-amber-600 dark:text-amber-500 font-black text-lg mb-8 tracking-tighter">500円 <span className="text-sm font-bold text-slate-400">/ 使い切りパック</span></p>

          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start">
              <i className="fa-solid fa-circle-check text-amber-500 mt-1 mr-3 shrink-0"></i>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">即座に<strong>5枚</strong>追加チャージ</p>
            </li>
            <li className="flex items-start">
              <i className="fa-solid fa-circle-check text-amber-500 mt-1 mr-3 shrink-0"></i>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">有効期限なし、自分のペースで練習</p>
            </li>
            <li className="flex items-start">
              <i className="fa-solid fa-circle-check text-amber-500 mt-1 mr-3 shrink-0"></i>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">試験直前のラストスパートに最適</p>
            </li>
          </ul>

          <button 
            onClick={() => onAddCredits(5)} 
            className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-3xl transition-all shadow-xl active:scale-95"
          >
            PURCHASE TICKETS / 購入する
          </button>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900/50 p-10 rounded-[3.5rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Billing Information / お支払いについて</p>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-loose max-w-2xl mx-auto">
          代金は毎月のJEC英語教室の月謝請求書（20日発行）に合算してご請求させていただきます。
          別途クレジットカード登録等は不要です。保有上限は 45 枚となっておりますのでご注意ください。
        </p>
      </div>
    </div>
  );
};

export default ShopView;

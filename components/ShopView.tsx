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
    <div className="max-w-5xl mx-auto py-8 animate-fadeIn">
      <div className="flex justify-between items-center mb-10 px-4">
        <div>
          <button onClick={onClose} className="text-xs font-black uppercase text-indigo-600 mb-2 flex items-center group">
            <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Dashboard
          </button>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Ticket Shop</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <i className="fa-solid fa-ticket text-amber-600 dark:text-jec-yellow text-xl"></i>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none">Your Balance</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{user.credits.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 mb-12">
        {/* Monthly Plan - Premium Styled */}
        <div className={`relative flex flex-col bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl border-4 transition-all hover:scale-[1.02] ${user.hasSubscription ? 'border-emerald-500' : 'border-indigo-600'}`}>
          {!user.hasSubscription && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Most Popular / 一番人気
            </div>
          )}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Monthly Plan</h3>
              <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">サブスクリプション</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
               <i className="fa-solid fa-gem text-xl"></i>
            </div>
          </div>
          
          <div className="mb-8">
            <span className="text-4xl font-black text-slate-900 dark:text-white">¥1,000</span>
            <span className="text-slate-700 dark:text-slate-500 font-bold ml-1 text-sm">/ mo</span>
          </div>

          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-300">毎月15枚のチケットを付与</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-300">優先カスタマーサポート</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-black text-indigo-600 dark:text-indigo-400 italic">全シナリオ学習が使い放題</span>
            </li>
          </ul>

          {user.hasSubscription ? (
            <button onClick={onCancelSubscription} className="w-full py-5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition-all">Cancel Plan</button>
          ) : (
            <button onClick={onSubscribe} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95">Subscribe Now</button>
          )}
        </div>

        {/* Individual Packs */}
        {[
          { id: 1, name: 'Starter Pack', price: 120, tickets: 1, color: 'blue', desc: '1回分の学習チケット' },
          { id: 5, name: 'Value Pack', price: 500, tickets: 5, color: 'emerald', desc: '5回分の学習チケット' },
          { id: 10, name: 'Power Pack', price: 900, tickets: 10, color: 'amber', desc: '10回分の学習チケット' }
        ].map(pack => (
          <div key={pack.id} className="flex flex-col bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 dark:border-slate-700 hover:border-indigo-400 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{pack.name}</h3>
                <p className={`text-${pack.color}-600 font-black text-xs uppercase tracking-widest`}>{pack.tickets} チケット</p>
              </div>
              <div className={`w-12 h-12 bg-${pack.color}-50 dark:bg-${pack.color}-900/30 rounded-2xl flex items-center justify-center text-${pack.color}-600 text-xl`}>
                 <i className={`fa-solid ${pack.id === 1 ? 'fa-ticket' : pack.id === 5 ? 'fa-tags' : 'fa-fire-flame-curved'}`}></i>
              </div>
            </div>
            
            <div className="mb-8">
              <span className="text-4xl font-black text-slate-900 dark:text-white">¥{pack.price}</span>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-start gap-3">
                <i className={`fa-solid fa-check text-${pack.color}-600 mt-1`}></i>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-300">{pack.desc}</span>
              </li>
              <li className="flex items-start gap-3">
                <i className="fa-solid fa-plus text-indigo-600 mt-1"></i>
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">シナリオ学習も追加</span>
              </li>
            </ul>

            <button onClick={() => onAddCredits(pack.id)} className={`w-full py-5 bg-${pack.color === 'amber' ? 'amber-600' : pack.color + '-600'} text-white font-black rounded-2xl shadow-xl transition-all active:scale-95`}>Buy Now</button>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm font-black text-slate-800 dark:text-slate-300 leading-relaxed">
            <i className="fa-solid fa-file-invoice-dollar mr-2 text-indigo-600"></i>
            ご購入いただいたチケット代金は、次回の月謝請求に合算されます。<br/>
            <span className="text-[10px] text-slate-600 dark:text-slate-500 mt-1 block uppercase tracking-widest">Purchases will be added to your next monthly invoice.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
export default ShopView;
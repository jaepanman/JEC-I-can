
import React, { useState } from 'react';
import { ExamResult } from '../types';

interface ResultsViewProps {
  result: ExamResult;
  onRetry: () => void;
  onDashboard: () => void;
  onStartNewMock: () => void;
  onStartReview: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onRetry, onDashboard, onStartNewMock, onStartReview }) => {
  const [showExplanations, setShowExplanations] = useState(false);

  const retakeCost = result.isTargetPractice ? 0.2 : 1.0;
  const sameSessionLabel = result.isTargetPractice ? 'この練習をもう一度' : '模擬試験をもう一度';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      <div className={`p-10 rounded-[3rem] text-center shadow-xl border-b-8 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 ${result.isPassed ? 'border-b-emerald-500' : 'border-b-rose-500'}`}>
        <div className={`inline-block p-6 rounded-full mb-6 ${result.isPassed ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
          <i className={`text-6xl ${result.isPassed ? 'fa-solid fa-award' : 'fa-solid fa-circle-exclamation'}`}></i>
        </div>
        <h2 className="text-4xl font-extrabold mb-2 tracking-tight">{result.isPassed ? 'Congratulations!' : 'Almost there!'}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
          You scored <span className="font-black text-indigo-600 dark:text-indigo-400">{result.score} out of {result.total}</span> points.
        </p>
        
        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          {/* Main Action: Retake Same */}
          <button onClick={onRetry} className="w-full px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-lg transition-all hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-3">
             <span>{sameSessionLabel}</span>
             <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center">
               <i className="fa-solid fa-ticket mr-1"></i>{retakeCost}
             </span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Shortcut: Full Mock */}
             <button onClick={onStartNewMock} className="px-6 py-4 bg-amber-400 hover:bg-amber-500 text-amber-900 font-black rounded-3xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                <span>模擬試験に挑戦</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] flex items-center">
                  <i className="fa-solid fa-ticket mr-1"></i>1.0
                </span>
             </button>

             {/* Secondary: Dashboard */}
             <button onClick={onDashboard} className="px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-3xl transition-all hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center gap-2">
                <i className="fa-solid fa-house text-sm"></i>
                <span>ダッシュボード</span>
             </button>
          </div>
        </div>
      </div>

      {result.newBadges && result.newBadges.length > 0 && (
        <div className="bg-gradient-to-r from-amber-400 to-amber-600 rounded-[3rem] p-8 text-slate-900 shadow-2xl relative overflow-hidden animate-popIn">
          <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fa-solid fa-star text-9xl"></i></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-6 flex items-center uppercase tracking-tight"><i className="fa-solid fa-trophy mr-3"></i> Badges Unlocked! / バッジ獲得！</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.newBadges.map((badge, i) => (
                <div key={`${badge.id}-${i}`} className="bg-white/20 backdrop-blur-sm p-4 rounded-3xl flex flex-col items-center border border-white/30 text-center animate-popIn" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg border-4 border-white/50 ${badge.color}`}>
                    <i className={`fa-solid ${badge.icon}`}></i>
                  </div>
                  <p className="font-black text-xs uppercase mb-1 leading-tight">{badge.name}</p>
                  {badge.count > 1 && <span className="text-[10px] font-black bg-white/40 px-2 py-0.5 rounded-full">LEVEL {badge.count}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <button onClick={() => setShowExplanations(!showExplanations)} className="w-full p-8 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <i className="fa-solid fa-book-open"></i>
            </div>
            <div>
              <span className="font-black text-xl dark:text-white block">Review Session</span>
              <span className="text-xs font-bold text-slate-400 uppercase">間違えた問題と解説をチェック</span>
            </div>
          </div>
          <i className={`fa-solid fa-chevron-${showExplanations ? 'up' : 'down'} text-slate-400 text-xl`}></i>
        </button>
        {showExplanations && (
          <div className="p-8 space-y-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
            {result.missedQuestions.length === 0 ? (
               <div className="text-center py-10">
                 <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                   <i className="fa-solid fa-check-double"></i>
                 </div>
                 <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">全問正解！</h4>
                 <p className="text-slate-500">ミスはありませんでした。素晴らしい出来です！</p>
               </div>
            ) : result.missedQuestions.map(({ question: q, userAnswer }, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fadeIn">
                <div className="flex items-center space-x-2 mb-6">
                  <span className="px-4 py-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-black rounded-full uppercase tracking-widest">{q.category.replace('_', ' ')}</span>
                  <span className="text-slate-300 text-[10px] font-mono">#{Math.floor(q.id * 1000)}</span>
                </div>
                {q.context && (
                  <div className="mb-6 text-lg text-slate-600 dark:text-slate-300 p-6 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-serif italic leading-relaxed whitespace-pre-wrap">
                    {q.context}
                  </div>
                )}
                <div className="text-2xl font-black mb-8 whitespace-pre-wrap dark:text-white leading-relaxed">{q.text}</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correctAnswer;
                    const isUserChoice = optIdx === userAnswer;
                    
                    let cardStyles = "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400";
                    if (isCorrect) cardStyles = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 ring-4 ring-emerald-500/10";
                    else if (isUserChoice) cardStyles = "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 ring-4 ring-rose-500/10";
                    
                    return (
                      <div key={optIdx} className={`p-5 rounded-2xl text-lg flex items-center border-4 transition-all ${cardStyles}`}>
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 font-black text-lg ${isCorrect ? 'bg-emerald-500 text-white' : isUserChoice ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                          {optIdx + 1}
                        </span>
                        <span className="font-black flex-1">{opt}</span>
                        {isCorrect && <i className="fa-solid fa-circle-check ml-2 text-emerald-500 text-2xl"></i>}
                        {isUserChoice && !isCorrect && <i className="fa-solid fa-circle-xmark ml-2 text-rose-500 text-2xl"></i>}
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border-l-8 border-indigo-400 shadow-inner">
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-3 flex items-center">
                    <i className="fa-solid fa-lightbulb mr-2"></i> Explanation / 解説
                  </p>
                  <p className="text-slate-800 dark:text-slate-100 text-lg font-bold leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;

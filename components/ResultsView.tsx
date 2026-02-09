
import React from 'react';
import { ExamResult, QuestionType } from '../types';

interface ResultsViewProps {
  result: ExamResult;
  onRetry: () => void;
  onDashboard: () => void;
  onStartNewMock: () => void;
  onStartReview: () => void;
}

const ReadingPassageReview: React.FC<{ context: string }> = ({ context }) => {
  if (!context) return null;
  const isEmail = context.includes('[EMAIL]') || context.includes('From:') || context.includes('Subject:');
  const isPoster = context.includes('[POSTER]') || context.includes('Date:') && context.includes('Place:');

  if (isEmail) {
    const emails = context.replace('[EMAIL]', '').split(/--- Response Email ---|---/);
    return (
      <div className="space-y-4 mb-6">
        {emails.map((emailText, idx) => {
          const lines = emailText.trim().split('\n');
          const headers: string[] = [];
          const body: string[] = [];
          lines.forEach(l => {
            if (l.match(/^(From|To|Subject|Date):/i)) headers.push(l);
            else if (l.trim()) body.push(l);
          });
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700">
                {headers.map((h, i) => (
                  <div key={i} className="text-[10px] text-slate-500"><span className="font-bold text-indigo-500">{h.split(':')[0]}:</span> {h.split(':').slice(1).join(':')}</div>
                ))}
              </div>
              <div className="p-4 whitespace-pre-wrap leading-relaxed">{body.join('\n')}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isPoster) {
    const content = context.replace('[POSTER]', '').trim();
    const lines = content.split('\n');
    return (
      <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-2xl text-xs">
        <h4 className="font-black text-center mb-4 underline uppercase">{lines[0]?.replace(/\[|\]/g, '')}</h4>
        <div className="space-y-2">
          {lines.slice(1).map((l, i) => (
             <p key={i} className="leading-relaxed">{l}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-l-4 border-indigo-400 text-sm font-serif leading-relaxed italic">
      {context.replace('[STORY]', '').trim()}
    </div>
  );
};

const ResultsView: React.FC<ResultsViewProps> = ({ result, onRetry, onDashboard, onStartNewMock }) => {
  const hasNewBadges = result.newBadges && result.newBadges.length > 0;

  return (
    <div className="max-w-4xl mx-auto text-center py-12 animate-fadeIn">
      <div className={`inline-block p-10 rounded-full mb-8 ${result.isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} shadow-lg`}>
        <i className={`text-6xl fa-solid ${result.isPassed ? 'fa-award' : 'fa-circle-xmark'}`}></i>
      </div>
      <h2 className="text-5xl font-black mb-4 dark:text-white uppercase tracking-tighter">{result.isPassed ? 'Exam Passed!' : 'Almost There!'}</h2>
      <div className="flex items-center justify-center gap-4 mb-12">
         <div className="bg-white dark:bg-slate-800 px-6 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase">Correct Answers</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{result.score} / {result.total}</p>
         </div>
         <div className="bg-white dark:bg-slate-800 px-6 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase">Score Rate</p>
            <p className="text-2xl font-black text-indigo-600">{Math.round((result.score / result.total) * 100)}%</p>
         </div>
      </div>

      {hasNewBadges && (
        <div className="mb-16 animate-popIn">
          <div className="inline-block bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl border-4 border-indigo-400 max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"></div>
            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">New Achievements Unlocked! / 新しいバッジ！</h3>
            <div className="flex flex-wrap justify-center gap-6">
              {result.newBadges!.map(badge => (
                <div key={badge.id} className="flex flex-col items-center group">
                  <div className={`w-16 h-16 rounded-2xl ${badge.color} flex items-center justify-center text-white text-2xl shadow-lg animate-bounce`}>
                    <i className={`fa-solid ${badge.icon}`}></i>
                  </div>
                  <p className="mt-2 text-[9px] font-black uppercase dark:text-white">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row justify-center gap-4 max-w-2xl mx-auto mb-20">
        <button onClick={onRetry} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95">RETRY SESSION</button>
        <button onClick={onStartNewMock} className="flex-1 py-5 bg-amber-500 text-white font-black rounded-3xl shadow-xl hover:bg-amber-600 transition-all active:scale-95">NEW MOCK EXAM</button>
        <button onClick={onDashboard} className="flex-1 py-5 bg-slate-200 dark:bg-slate-700 dark:text-white font-black rounded-3xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95">DASHBOARD</button>
      </div>

      <div className="mt-20 text-left space-y-12">
        <div className="flex justify-between items-end border-b-4 border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-3xl font-black dark:text-white">Mistake Review / 復習モード</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-500 mt-1 uppercase tracking-widest">Learn from what you missed</p>
          </div>
          <div className="text-right">
             <span className="text-rose-500 font-black text-2xl">{result.missedQuestions.length}</span>
             <span className="text-slate-400 font-black text-xs ml-1 uppercase">Incorrect</span>
          </div>
        </div>
        
        {result.missedQuestions.length > 0 ? (
          result.missedQuestions.map((e, i) => {
            return (
              <div key={i} className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[3.5rem] shadow-sm animate-fadeIn border border-slate-100 dark:border-slate-700 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-center mb-8">
                   <span className="bg-slate-100 dark:bg-slate-700 px-4 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Question Review</span>
                   <span className="text-rose-600 font-black text-[10px] uppercase flex items-center bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">
                     <i className="fa-solid fa-circle-xmark mr-1.5"></i> Incorrect / 不正解
                   </span>
                </div>

                {/* Context Review */}
                {e.question.context && (
                  e.question.type === QuestionType.READING_COMPREHENSION ? (
                    <ReadingPassageReview context={e.question.context} />
                  ) : (
                    <div className="mb-6 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl italic text-slate-600 dark:text-slate-400 text-sm border-l-4 border-indigo-400">
                      {e.question.context}
                    </div>
                  )
                )}

                <p className="text-2xl font-black mb-10 dark:text-white leading-relaxed whitespace-pre-wrap">{e.question.text}</p>
                
                {/* Answer Choices - Review Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {e.question.options.map((opt, idx) => {
                    const isUserChoice = idx === e.userAnswer;
                    const isCorrect = idx === e.question.correctAnswer;
                    
                    let style = "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 text-slate-500 opacity-60";
                    let statusIcon = null;

                    if (isCorrect) {
                      style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-black opacity-100 shadow-md ring-4 ring-emerald-500/10";
                      statusIcon = <i className="fa-solid fa-check-circle text-emerald-500 ml-2"></i>;
                    } else if (isUserChoice) {
                      style = "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-black opacity-100 shadow-md ring-4 ring-rose-500/10";
                      statusIcon = <i className="fa-solid fa-circle-xmark text-rose-500 ml-2"></i>;
                    }

                    return (
                      <div key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center transition-all ${style}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-xs font-black ${isCorrect ? 'bg-emerald-600 text-white' : isUserChoice ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-900 text-slate-400'}`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 text-sm">{opt}</div>
                        {statusIcon}
                      </div>
                    );
                  })}
                </div>

                {/* Teacher's Explanation */}
                <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border-2 border-indigo-100 dark:border-indigo-800 relative">
                   <div className="absolute top-0 left-10 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                     <i className="fa-solid fa-chalkboard-user"></i>
                     Teacher's Explanation / 解説
                   </div>
                   <div className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed text-lg whitespace-pre-wrap">
                     {e.question.explanation}
                   </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-800 p-20 rounded-[4rem] text-center border-4 border-emerald-500/30 shadow-2xl animate-popIn">
            <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 text-6xl mx-auto mb-8 shadow-inner ring-8 ring-emerald-50 dark:ring-emerald-900/10">
               <i className="fa-solid fa-crown animate-bounce"></i>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white mb-4">PERFECT PERFORMANCE!</p>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-lg max-w-md mx-auto">ミスはありません。この調子で英検合格を勝ち取りましょう！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;

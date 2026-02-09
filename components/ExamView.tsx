
import { Question, QuestionType, User, EikenGrade } from '../types';
import React, { useState, useEffect, useCallback } from 'react';

interface ExamViewProps {
  questions: Question[];
  user: User;
  grade: EikenGrade | null;
  onFinish: (answers: number[], remainingTime: number) => void;
  onRemakeQuestion: (index: number) => Promise<void>;
}

const ReadingPassage: React.FC<{ context: string }> = ({ context }) => {
  if (!context) return null;

  // Detect type
  const isEmail = context.includes('[EMAIL]') || context.includes('From:') || context.includes('Subject:');
  const isPoster = context.includes('[POSTER]') || context.includes('Date:') && context.includes('Place:');
  const isStory = context.includes('[STORY]') || (!isEmail && !isPoster);

  if (isEmail) {
    const emails = context.replace('[EMAIL]', '').split(/--- Response Email ---|---/);
    return (
      <div className="space-y-6 mb-8">
        {emails.map((emailText, idx) => {
          const lines = emailText.trim().split('\n');
          const headers: string[] = [];
          const body: string[] = [];
          lines.forEach(l => {
            if (l.match(/^(From|To|Subject|Date):/i)) headers.push(l);
            else if (l.trim()) body.push(l);
          });

          return (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 space-y-1">
                {headers.map((h, i) => (
                  <div key={i} className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-1 uppercase">{h.split(':')[0]}:</span>
                    <span className="text-slate-900 dark:text-slate-100">{h.split(':').slice(1).join(':')}</span>
                  </div>
                ))}
              </div>
              <div className="p-6 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                {body.join('\n')}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isPoster) {
    const content = context.replace('[POSTER]', '').trim();
    const lines = content.split('\n');
    const title = lines[0]?.startsWith('[') ? lines[0].replace(/\[|\]/g, '') : lines[0];
    const details = lines.slice(1);

    return (
      <div className="mb-8 p-8 bg-amber-50 dark:bg-amber-900/10 border-4 border-amber-200 dark:border-amber-800 rounded-[3rem] shadow-md relative overflow-hidden animate-fadeIn">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 dark:bg-amber-800/20 -mr-8 -mt-8 rounded-full blur-2xl"></div>
        <h3 className="text-2xl font-black text-center text-amber-900 dark:text-amber-100 mb-6 uppercase tracking-tighter underline decoration-amber-400 underline-offset-4">
          {title}
        </h3>
        <div className="space-y-4">
          {details.map((l, i) => {
            const isLabel = l.match(/^(Date|Time|Place|Price|Cost|Location|Note):/i);
            return (
              <div key={i} className={`flex flex-col sm:flex-row gap-2 ${isLabel ? 'items-baseline' : ''}`}>
                {isLabel ? (
                  <>
                    <span className="min-w-[80px] text-[10px] font-black bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded uppercase tracking-widest text-center">
                      {l.split(':')[0]}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{l.split(':').slice(1).join(':')}</span>
                  </>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-400 leading-relaxed font-medium">{l}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard Story
  return (
    <div className="mb-8 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-l-8 border-indigo-500 shadow-sm animate-fadeIn">
      <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-loose text-lg font-serif whitespace-pre-wrap">
        {context.replace('[STORY]', '').trim()}
      </div>
    </div>
  );
};

const ExamView: React.FC<ExamViewProps> = ({ questions, user, grade, onFinish, onRemakeQuestion }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const totalSec = (grade === 'GRADE_5' ? 25 : 35) * 60;
  const [timeLeft, setTimeLeft] = useState(totalSec);
  const [showRemakeModal, setShowRemakeModal] = useState(false);
  const [isRemaking, setIsRemaking] = useState(false);

  const handleFinish = useCallback(() => {
    onFinish(answers, timeLeft);
  }, [answers, timeLeft, onFinish]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleFinish]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || showRemakeModal) {
        return;
      }

      const key = e.key;
      if (['1', '2', '3', '4'].includes(key)) {
        const choiceIdx = parseInt(key) - 1;
        setAnswers(prevAnswers => {
          const newAnswers = [...prevAnswers];
          newAnswers[currentIdx] = choiceIdx;
          return newAnswers;
        });
        if (currentIdx < questions.length - 1) {
          setTimeout(() => setCurrentIdx(prev => prev + 1), 300);
        }
      } 
      else if (key === 'ArrowLeft') {
        setCurrentIdx(p => Math.max(0, p - 1));
      } 
      else if (key === 'ArrowRight') {
        setCurrentIdx(p => Math.min(questions.length - 1, p + 1));
      }
      else if (key === 'Enter' && currentIdx === questions.length - 1) {
        if (answers[currentIdx] !== -1) {
          handleFinish();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions.length, answers, handleFinish, showRemakeModal]);

  const triggerRemake = async () => {
    setIsRemaking(true);
    await onRemakeQuestion(currentIdx);
    setIsRemaking(false);
    setShowRemakeModal(false);
  };

  const currentQ = questions[currentIdx];
  const isRearranging = currentQ.type === QuestionType.SENTENCE_ORDER;
  const isReading = currentQ.type === QuestionType.READING_COMPREHENSION;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Remake Modal */}
      {showRemakeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fadeIn" onClick={() => !isRemaking && setShowRemakeModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-2xl max-w-lg w-full animate-popIn border-4 border-indigo-100 dark:border-slate-700">
             <div className="text-center">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 text-4xl mx-auto mb-6">
                   <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <h2 className="text-2xl font-black mb-4 dark:text-white">問題をリメイクしますか？</h2>
                
                <div className="space-y-4 text-left bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl mb-8 border border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="text-indigo-600">●</span> リメイクは1日 <span className="text-rose-600 font-black">5回</span> まで可能です。
                  </p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="text-indigo-600">●</span> AIは完璧ではなく、問題生成時に誤りが発生する可能性があります。
                  </p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="text-indigo-600">●</span> お手数ですが、不自然な点がありましたらスクリーンショットを撮影し、公式LINEアカウントまでお送りください。
                  </p>
                </div>

                <div className="space-y-3">
                   <button 
                    onClick={triggerRemake}
                    disabled={isRemaking}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     {isRemaking ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> 同意してリメイクする</>}
                   </button>
                   <button 
                    onClick={() => setShowRemakeModal(false)}
                    disabled={isRemaking}
                    className="w-full py-4 text-slate-500 font-black hover:text-slate-700 dark:hover:text-slate-400 transition-colors"
                   >
                     キャンセル
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <span className="font-black text-indigo-700 dark:text-indigo-400">Q {currentIdx + 1} / {questions.length}</span>
          <div className="flex gap-1">
             {questions.map((_, i) => (
               <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentIdx ? 'bg-indigo-600' : answers[i] !== -1 ? 'bg-indigo-300' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
             ))}
          </div>
        </div>
        <span className="font-mono font-black text-rose-600 dark:text-rose-400 flex items-center">
          <i className="fa-solid fa-clock mr-2 animate-pulse"></i>
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-14 shadow-2xl animate-fadeIn border border-slate-50 dark:border-slate-700">
        {/* Context Rendering */}
        {currentQ.context && (
          currentQ.type === QuestionType.READING_COMPREHENSION ? (
            <ReadingPassage context={currentQ.context} />
          ) : (
            <div className={`mb-8 p-6 rounded-2xl border-l-4 border-indigo-500 font-serif whitespace-pre-wrap ${isRearranging ? 'bg-indigo-50/50 dark:bg-indigo-900/30 text-center text-xl font-bold tracking-widest text-slate-800 dark:text-indigo-200' : 'bg-slate-50 dark:bg-slate-900/50 italic text-slate-700 dark:text-slate-300'}`}>
              {currentQ.context}
            </div>
          )
        )}

        {/* Question Text with whitespace-pre-wrap for Dialogues */}
        <div className="mb-10 relative group">
           {currentQ.type === QuestionType.READING_COMPREHENSION && (
             <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Question about the text:</p>
           )}
           <div className="flex justify-between items-start gap-4">
              <h2 className={`text-2xl font-black text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap flex-1 ${isRearranging ? 'text-center' : ''}`}>
                {currentQ.text}
              </h2>
              <button 
                onClick={() => setShowRemakeModal(true)}
                className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-100 dark:hover:border-slate-700 transition-all shadow-sm"
                title="問題をリメイクする"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </button>
           </div>
        </div>

        {/* Skeleton for Part 3 ONLY */}
        {isRearranging && currentQ.skeleton && (
          <div className="mb-12 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex justify-center items-center gap-4 flex-wrap">
            {currentQ.skeleton.split(' ').map((part, idx) => {
              const isBox = part.startsWith('[') && part.endsWith(']');
              const isBlank = part === '(___)';

              if (isBox) {
                return (
                  <div key={idx} className="w-14 h-14 rounded-xl border-4 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800 flex items-center justify-center text-lg font-black text-indigo-700 dark:text-indigo-300 shadow-md transform rotate-3">
                    {part.replace('[', '').replace(']', '').trim()}
                  </div>
                );
              }
              if (isBlank) {
                return (
                  <div key={idx} className="w-14 h-1.5 bg-slate-300 dark:bg-slate-600 self-end mb-2 rounded-full"></div>
                );
              }
              return (
                <span key={idx} className="text-xl font-bold text-slate-700 dark:text-slate-400">{part}</span>
              );
            })}
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                const na = [...answers];
                na[currentIdx] = i;
                setAnswers(na);
                if (currentIdx < questions.length - 1) {
                  setTimeout(() => setCurrentIdx(prev => prev + 1), 300);
                }
              }}
              className={`group p-6 rounded-[2rem] border-4 text-left font-black text-lg transition-all active:scale-95 ${answers[currentIdx] === i ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 shadow-lg' : 'border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            >
              <div className="flex items-center">
                 <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-xs transition-colors ${answers[currentIdx] === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                    {i + 1}
                 </span>
                 <span className="flex-1">{opt}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-10 border-t border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <button
            onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
            className="flex items-center gap-2 px-6 font-black text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors disabled:opacity-30"
            disabled={currentIdx === 0}
          >
            <i className="fa-solid fa-arrow-left"></i> PREV
          </button>
          
          <div className="hidden sm:flex items-center gap-4 opacity-50">
            <span>Keys 1-4 to Answer</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <span>Arrows to Navigate</span>
          </div>

          {currentIdx === questions.length - 1 ? (
            <button
              onClick={handleFinish}
              className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fa-solid fa-flag-checkered"></i> FINISH EXAM
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx(p => p + 1)}
              className="px-12 py-5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-all active:scale-95 flex items-center gap-2"
            >
              NEXT <i className="fa-solid fa-arrow-right"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamView;

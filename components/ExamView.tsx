
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question, QuestionType } from '../types';

interface ExamViewProps {
  questions: Question[];
  onFinish: (answers: number[], remainingTime: number) => void;
  onRemakeQuestion: (index: number) => Promise<void>;
}

const ExamView: React.FC<ExamViewProps> = ({ questions, onFinish, onRemakeQuestion }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(35 * 60);
  const timeLeftRef = useRef(35 * 60);
  const [showRemakeDialog, setShowRemakeDialog] = useState(false);
  const [isRemaking, setIsRemaking] = useState(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const handleSelect = useCallback((idx: number) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIdx] = idx;
      return newAnswers;
    });
  }, [currentIdx]);

  const handleFinish = useCallback(() => {
    onFinish(answers, timeLeftRef.current);
  }, [answers, onFinish]);

  const handleNext = useCallback(() => {
    if (currentIdx === questions.length - 1) {
      handleFinish();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  }, [currentIdx, questions.length, handleFinish]);

  const handlePrev = useCallback(() => {
    setCurrentIdx(prev => Math.max(0, prev - 1));
  }, []);

  const triggerRemake = async () => {
    setIsRemaking(true);
    setShowRemakeDialog(false);
    try {
      await onRemakeQuestion(currentIdx);
    } finally {
      setIsRemaking(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleFinish]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showRemakeDialog) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleSelect(parseInt(e.key) - 1);
      } 
      else if (e.key === 'ArrowRight' || (e.key === 'Enter' && answers[currentIdx] !== -1)) {
        handleNext();
      } 
      else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelect, handleNext, handlePrev, answers, currentIdx, showRemakeDialog]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;
  
  const isOrdering = currentQ?.type === QuestionType.SENTENCE_ORDER;
  const isNull = currentQ?.text === 'null' || !currentQ || !currentQ.text;

  const renderSkeleton = (skeleton: string) => {
    // Splits by spaces or specific markers
    const parts = skeleton.split(/(\( \)|\[ 1 \]|\[ 2 \]|\[ 3 \]|\[ 4 \])/);
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-6 py-8 border-y-2 border-slate-100 dark:border-slate-700 my-6 bg-slate-50/30 dark:bg-slate-900/20 rounded-2xl px-4">
        {parts.map((part, i) => {
          if (!part.trim()) return null;
          if (part === "( )") {
            return (
              <div key={i} className="flex flex-col items-center">
                 <div className="w-10 md:w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mt-6"></div>
              </div>
            );
          }
          const boxMatch = part.match(/\[ (\d) \]/);
          if (boxMatch) {
            const num = boxMatch[1];
            const label = num === '1' || num === '2' ? 'X' : 'Y';
            const ordinal = num === '1' ? '1st' : num === '2' ? '2nd' : num === '3' ? '3rd' : '4th';
            return (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase mb-1">{ordinal}</span>
                <div className="w-14 h-12 border-2 border-indigo-500 dark:border-indigo-400 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 font-black shadow-sm transform hover:scale-105 transition-transform">
                  {label}
                </div>
              </div>
            );
          }
          return <span key={i} className="text-xl font-black text-slate-800 dark:text-slate-200 self-end mb-2">{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 relative px-4">
      {showRemakeDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-sm w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-arrows-rotate"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">Remake Question?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">
              Generating a new version of this question.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowRemakeDialog(false)} className="py-3 px-6 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all">Cancel</button>
              <button onClick={triggerRemake} className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all">Remake</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-wider">Q{currentIdx + 1} of {questions.length}</span>
          <div className="w-32 md:w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-2xl font-mono font-black shadow-sm text-sm border-2 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
          <i className="fa-regular fa-clock mr-2"></i> {formatTime(timeLeft)}
        </div>
      </div>

      <div className={`bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-100 dark:border-slate-700 min-h-[500px] flex flex-col relative overflow-hidden transition-all ${isRemaking ? 'opacity-50 blur-[2px]' : ''}`}>
        {isRemaking && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-indigo-600 dark:text-indigo-400 font-black text-lg">Regenerating...</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
           <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100 dark:border-indigo-800">
             {currentQ?.type?.replace('_', ' ')}
           </span>
           <button onClick={() => setShowRemakeDialog(true)} className="text-slate-300 hover:text-indigo-500 transition-colors">
             <i className="fa-solid fa-arrows-rotate text-lg"></i>
           </button>
        </div>

        <div className="mb-10 flex-1">
          {isNull ? (
             <div className="p-10 text-center border-4 border-dashed border-rose-100 dark:border-rose-900/30 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20">
                <i className="fa-solid fa-bug text-rose-400 text-5xl mb-4"></i>
                <h3 className="text-xl font-black text-rose-800 dark:text-rose-400 mb-2">Generation Failed</h3>
                <button onClick={triggerRemake} className="mt-4 px-8 py-3 bg-rose-600 text-white rounded-2xl font-black shadow-lg">Try Again</button>
             </div>
          ) : isOrdering ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-800">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">意味 / Meaning</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-snug">{currentQ.text}</p>
              </div>
              
              <div className="p-8 bg-white dark:bg-slate-700/50 rounded-3xl border-2 border-slate-100 dark:border-slate-600 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Words to Arrange / 単語</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-300 italic tracking-wide font-serif leading-loose">
                  {currentQ.context}
                </p>
              </div>
              
              {renderSkeleton(currentQ.skeleton || "[ 1 ] ( ) [ 3 ] ( )")}
            </div>
          ) : (
            <div className="animate-fadeIn">
              {currentQ.context && (
                <div className="mb-8 p-8 bg-slate-50 dark:bg-slate-700/30 rounded-3xl border-2 border-slate-100 dark:border-slate-600 text-xl font-serif leading-relaxed text-slate-700 dark:text-slate-200 italic shadow-inner">
                  {currentQ.context}
                </div>
              )}
              <div className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap">
                {currentQ.text}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {!isNull && currentQ.options.map((option, idx) => (
            <button key={idx} onClick={() => handleSelect(idx)} className={`p-5 rounded-3xl border-4 text-left transition-all flex items-center group relative overflow-hidden ${answers[currentIdx] === idx ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 shadow-xl scale-[1.02]' : 'border-slate-50 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
              <div className={`w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center mr-5 font-black text-lg ${answers[currentIdx] === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500'}`}>
                {idx + 1}
              </div>
              <span className={`text-xl font-black ${answers[currentIdx] === idx ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>
                {option}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-8 border-t-2 border-slate-50 dark:border-slate-700">
          <button onClick={handlePrev} disabled={currentIdx === 0} className="px-6 py-3 text-slate-400 font-black disabled:opacity-0 hover:text-indigo-600 transition-colors">
            <i className="fa-solid fa-arrow-left mr-2"></i> PREV
          </button>
          
          {currentIdx === questions.length - 1 ? (
            <button onClick={handleFinish} disabled={isNull || answers[currentIdx] === -1} className={`px-12 py-4 rounded-2xl font-black text-xl shadow-2xl transition-all ${answers[currentIdx] === -1 ? 'bg-slate-100 text-slate-400 grayscale' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
              FINISH
            </button>
          ) : (
            <button onClick={handleNext} disabled={isNull || answers[currentIdx] === -1} className={`px-12 py-4 rounded-2xl font-black text-xl shadow-2xl transition-all ${answers[currentIdx] === -1 ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
              NEXT <i className="fa-solid fa-arrow-right ml-2"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamView;

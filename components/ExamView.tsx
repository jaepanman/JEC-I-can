
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
  const timeLeftRef = useRef(35 * 60); // Use ref to get latest time in callbacks
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
  
  const isOrdering = currentQ?.type === 'SENTENCE_ORDER';
  const isNull = currentQ?.text === 'null' || !currentQ || !currentQ.text;

  const renderSkeleton = (skeleton: string = "( ) [ 2 ] ( ) [ 4 ] ( )") => {
    const parts = skeleton.split(/(\( \)|\[ 2 \]|\[ 4 \])/);
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-6 py-6 text-xl font-bold border-y border-slate-100 dark:border-slate-700 my-4 bg-white dark:bg-slate-800 rounded-2xl shadow-inner px-4 transition-colors">
        {parts.map((part, i) => {
          if (part === "( )") {
            return <div key={i} className="w-10 md:w-12 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-1 self-end mb-2"></div>;
          }
          if (part === "[ 2 ]") {
            return (
              <div key={i} className="flex flex-col items-center">
                <div className="text-[9px] font-extrabold text-indigo-400 dark:text-indigo-500 uppercase tracking-tighter mb-0.5">2nd</div>
                <div className="w-12 h-10 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 shadow-sm">X</div>
              </div>
            );
          }
          if (part === "[ 4 ]") {
            return (
              <div key={i} className="flex flex-col items-center">
                <div className="text-[9px] font-extrabold text-indigo-400 dark:text-indigo-500 uppercase tracking-tighter mb-0.5">4th</div>
                <div className="w-12 h-10 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 shadow-sm">Y</div>
              </div>
            );
          }
          return <span key={i} className="text-slate-700 dark:text-slate-200 px-1">{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">
      {showRemakeDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-popIn border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-arrows-rotate"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">Remake Question?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">
              Regenerating a new {currentQ?.type.replace('_', ' ').toLowerCase()} question. Type remains consistent.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowRemakeDialog(false)} className="py-3 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all">No, Keep</button>
              <button onClick={triggerRemake} className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all">Yes, Remake</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Question {currentIdx + 1} / {questions.length}</span>
          <div className="w-32 md:w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl font-mono font-bold shadow-sm text-xs ${timeLeft < 300 ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
          <i className="fa-regular fa-clock mr-1.5"></i> {formatTime(timeLeft)}
        </div>
      </div>

      <div className={`bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-xl border border-slate-100 dark:border-slate-700 min-h-[450px] flex flex-col relative overflow-hidden transition-all ${isRemaking ? 'opacity-50 grayscale' : ''}`}>
        {isRemaking && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-800/80">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mb-4"></div>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold">Validating Word Order...</p>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowRemakeDialog(true)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isNull ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 ring-2 ring-rose-200 dark:ring-rose-800 animate-pulse' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <i className="fa-solid fa-arrows-rotate"></i>
            <span>Remake Question</span>
          </button>
        </div>

        <div className="mb-8">
          {isNull ? (
            <div className="p-10 text-center border-2 border-dashed border-rose-200 dark:border-rose-900 rounded-2xl bg-rose-50 dark:bg-rose-900/20">
              <i className="fa-solid fa-triangle-exclamation text-rose-400 dark:text-rose-600 text-4xl mb-4"></i>
              <p className="text-rose-700 dark:text-rose-400 font-bold text-lg">Question Generation Error</p>
              <button onClick={triggerRemake} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg font-bold shadow-md">Click to Repair</button>
            </div>
          ) : isOrdering ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <p className="text-[10px] font-extrabold text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-1.5">Japanese Meaning / 日本語</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{currentQ.text}</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600">
                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Words to Rearrange / 単語の並び替え (1-5)</p>
                <div className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-200 leading-loose italic tracking-wide font-serif">
                  {currentQ.context}
                </div>
              </div>
              
              {renderSkeleton(currentQ.skeleton)}
              
              <div className="text-center mt-2">
                 <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold bg-amber-50 dark:bg-amber-900/20 inline-block px-4 py-1.5 rounded-full border border-amber-100 dark:border-amber-800 shadow-sm uppercase tracking-wide">
                   どの番号が <span className="text-indigo-600 dark:text-indigo-400">2番目 (X)</span> と <span className="text-indigo-600 dark:text-indigo-400">4番目 (Y)</span> に入りますか？
                 </p>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {currentQ.context && (
                <div className="mb-6 p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 leading-relaxed font-serif text-lg shadow-inner whitespace-pre-wrap">
                  {currentQ.context}
                </div>
              )}
              <div className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-wrap">
                {currentQ.text}
              </div>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 mb-8`}>
          {!isNull && currentQ.options.map((option, idx) => (
            <button key={idx} onClick={() => handleSelect(idx)} className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center group ${answers[currentIdx] === idx ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-4 ring-indigo-50 dark:ring-indigo-900/20 shadow-sm' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
              <div className={`w-9 h-9 min-w-[36px] rounded-full flex flex-col items-center justify-center mr-4 font-bold transition-colors relative ${answers[currentIdx] === idx ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900'}`}>
                <span className="text-sm">{idx + 1}</span>
              </div>
              <span className={`text-lg font-bold ${answers[currentIdx] === idx ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-300'}`}>{option}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
          <button onClick={handlePrev} disabled={currentIdx === 0} className="px-6 py-2.5 text-indigo-600 dark:text-indigo-400 font-bold disabled:opacity-30 flex flex-col items-center group transition-all hover:-translate-x-1">
            <div className="flex items-center text-sm"><i className="fa-solid fa-chevron-left mr-2"></i> Previous</div>
          </button>
          {currentIdx === questions.length - 1 ? (
            <button onClick={handleFinish} disabled={isNull} className={`px-10 py-3 font-bold rounded-xl shadow-lg transition-all ${isNull ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-600' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'}`}>Finish Exam</button>
          ) : (
            <button onClick={handleNext} disabled={isNull || answers[currentIdx] === -1} className={`px-8 py-3 font-bold rounded-xl flex flex-col items-center shadow-lg transition-all group hover:translate-x-1 ${isNull || answers[currentIdx] === -1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'}`}>
              <div className="flex items-center text-sm">Next <i className="fa-solid fa-chevron-right ml-3"></i></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamView;

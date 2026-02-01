
import { Question, QuestionType, User, EikenGrade } from '../types';
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ExamViewProps {
  questions: Question[];
  user: User;
  grade: EikenGrade | null;
  onFinish: (answers: number[], remainingTime: number) => void;
  onRemakeQuestion: (index: number) => Promise<void>;
}

const ExamView: React.FC<ExamViewProps> = ({ questions, user, grade, onFinish, onRemakeQuestion }) => {
  const totalSeconds = grade === 'GRADE_5' ? 25 * 60 : 35 * 60;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const timeLeftRef = useRef(totalSeconds);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const handleSelect = (idx: number) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIdx] = idx;
      return newAnswers;
    });
  };

  const handleFinish = useCallback(() => {
    // Safety check for empty or mismatched answer arrays
    const finalAnswers = answers.length === questions.length ? answers : [...answers].slice(0, questions.length);
    onFinish(finalAnswers, timeLeftRef.current);
  }, [answers, questions.length, onFinish]);

  const handleNext = () => {
    if (currentIdx === questions.length - 1) handleFinish();
    else setCurrentIdx(prev => prev + 1);
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

  const sanitizeText = (text: string) => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n');
  };

  const renderContentText = (text: string) => {
    const lines = sanitizeText(text).split('\n');
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2"></div>;
          
          const isDialogue = trimmed.match(/^[A-Z]:\s/i);
          const isHeader = trimmed.match(/^(From|To|Subject):/i);
          
          if (isHeader) {
            const [key, ...val] = trimmed.split(':');
            return (
              <div key={idx} className="flex border-b border-slate-100 py-2 text-sm">
                <span className="text-slate-400 w-24 uppercase font-black tracking-tighter">{key}:</span>
                <span className="text-slate-800 font-bold">{val.join(':').trim()}</span>
              </div>
            );
          }

          return (
            <p key={idx} className={`text-xl md:text-2xl leading-relaxed ${isDialogue ? 'font-black text-indigo-700 border-l-4 border-indigo-200 pl-4 bg-indigo-50/50 rounded-r-xl py-2' : 'font-medium text-slate-800'}`}>
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const renderReadingPassage = (context: string) => {
    const lines = sanitizeText(context).split('\n');
    const isEmail = context.toLowerCase().includes('from:');

    return (
      <div className="mb-10 bg-white p-8 md:p-14 rounded-[3.5rem] border-2 border-slate-100 shadow-inner relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        <div className="relative z-10 space-y-4">
          {lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={idx} className="h-4"></div>;

            if (isEmail && trimmed.match(/^(From|To|Subject):/i)) {
              const [key, ...val] = trimmed.split(':');
              return (
                <div key={idx} className="flex border-b border-slate-100 py-2 text-sm">
                  <span className="font-black text-slate-300 w-24 uppercase tracking-wider">{key}:</span>
                  <span className="font-bold text-slate-600">{val.join(':').trim()}</span>
                </div>
              );
            }

            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              return (
                <h3 key={idx} className="text-2xl md:text-4xl font-black text-center text-indigo-600 py-6 mb-8 border-b-4 border-double border-indigo-50 uppercase tracking-tight">
                  {trimmed.slice(1, -1)}
                </h3>
              );
            }

            if (trimmed.match(/^[-=*]{3,}$/)) {
              return <hr key={idx} className="border-t-2 border-dashed border-slate-200 my-10" />;
            }

            if (trimmed.match(/^[A-Za-z\s]+:\s/)) {
              const [label, ...rest] = trimmed.split(':');
              const commonSentStart = ["When", "Because", "If", "While", "After", "Before", "A", "The", "In"];
              if (!commonSentStart.includes(label.trim())) {
                return (
                  <div key={idx} className="flex items-baseline py-2 bg-slate-50/50 px-4 rounded-xl">
                    <span className="w-28 shrink-0 font-black text-indigo-500 text-xs uppercase tracking-widest">{label}</span>
                    <span className="font-bold text-slate-800 text-lg md:text-xl">{rest.join(':').trim()}</span>
                  </div>
                );
              }
            }

            return (
              <p key={idx} className="text-lg md:text-2xl font-serif font-medium leading-relaxed text-slate-700 text-justify">
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>
    );
  };

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto pb-32 px-4">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center space-x-6">
          <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl border-4 border-indigo-200">
            {currentIdx + 1}
          </div>
          <div className="w-40 md:w-80 h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner ring-4 ring-slate-100">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="px-6 py-4 rounded-3xl bg-white border-2 border-slate-100 font-mono font-black text-xl text-indigo-600 shadow-sm flex items-center">
          <i className="fa-solid fa-clock-rotate-left mr-3 text-slate-300"></i>
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      <div className="bg-white rounded-[4rem] p-8 md:p-16 shadow-2xl border border-slate-100 flex flex-col min-h-[700px] animate-fadeIn">
        <div className="mb-14 flex-1">
          {currentQ?.type === QuestionType.READING_COMPREHENSION ? (
            <>
              {currentQ.context && renderReadingPassage(currentQ.context)}
              <div className="mt-12 pt-12 border-t border-slate-100">
                <div className="flex items-center mb-8 text-indigo-500 font-black text-xs uppercase tracking-[0.3em]">
                  <i className="fa-solid fa-circle-question mr-3"></i> Question
                </div>
                {renderContentText(currentQ.text)}
              </div>
            </>
          ) : (
            <>
              {currentQ.context && (
                <div className="mb-12 p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-100 italic text-slate-600 text-xl leading-relaxed shadow-inner font-serif">
                  {sanitizeText(currentQ.context)}
                </div>
              )}
              {renderContentText(currentQ.text)}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          {currentQ?.options.map((option, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSelect(idx)} 
              className={`p-8 rounded-[2.5rem] border-4 text-left transition-all flex items-center active:scale-95 group relative ${answers[currentIdx] === idx ? 'border-indigo-600 bg-indigo-50 shadow-xl' : 'border-slate-50 bg-slate-50/50 hover:border-indigo-200 hover:bg-white'}`}
            >
              <div className={`w-14 h-14 min-w-[56px] rounded-full flex items-center justify-center mr-8 font-black text-xl shadow-md transition-colors ${answers[currentIdx] === idx ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                {idx + 1}
              </div>
              <span className={`text-2xl font-black transition-colors ${answers[currentIdx] === idx ? 'text-indigo-900' : 'text-slate-700'}`}>
                {option}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-12 border-t border-slate-100">
          <button 
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} 
            disabled={currentIdx === 0} 
            className="px-10 py-5 text-slate-400 font-black hover:text-indigo-600 transition-colors disabled:opacity-0 flex items-center"
          >
            <i className="fa-solid fa-chevron-left mr-3"></i> PREV
          </button>
          <button 
            onClick={handleNext} 
            disabled={answers[currentIdx] === -1} 
            className="px-20 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            {currentIdx === questions.length - 1 ? 'FINISH' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamView;

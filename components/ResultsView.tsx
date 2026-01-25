
import React, { useState } from 'react';
import { ExamResult } from '../types';

interface ResultsViewProps {
  result: ExamResult;
  onRetry: () => void;
  onDashboard: () => void;
  onStartReview: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onRetry, onDashboard, onStartReview }) => {
  const [showExplanations, setShowExplanations] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      <div className={`p-10 rounded-3xl text-center shadow-xl border-b-8 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 ${result.isPassed ? 'border-b-emerald-500' : 'border-b-rose-500'}`}>
        <div className={`inline-block p-6 rounded-full mb-6 ${result.isPassed ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
          <i className={`text-6xl ${result.isPassed ? 'fa-solid fa-award' : 'fa-solid fa-circle-exclamation'}`}></i>
        </div>
        
        <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-2">
          {result.isPassed ? 'Congratulations!' : 'Almost there!'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
          You scored <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.score} out of {result.total}</span> points.
        </p>

        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <button 
            onClick={onDashboard}
            className="w-full md:w-auto px-8 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all"
          >
            Dashboard
          </button>
          <button 
            onClick={onRetry}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            New Full Exam
          </button>
        </div>
      </div>

      {!result.isPassed && result.missedQuestions.length > 0 && (
        <div className="bg-indigo-600 dark:bg-indigo-900 text-white p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between shadow-xl">
          <div className="mb-6 md:mb-0">
            <h3 className="text-2xl font-bold mb-2">Targeted Review Session</h3>
            <p className="opacity-90">Work on your mistakes: <b>{Array.from(new Set(result.missedQuestions.map(m => m.question.category))).slice(0, 3).join(', ')}</b></p>
          </div>
          <button 
            onClick={onStartReview}
            className="bg-amber-400 hover:bg-amber-500 text-amber-900 px-8 py-4 rounded-full font-extrabold transition-all shadow-lg"
          >
            Review Mistakes
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <button 
          onClick={() => setShowExplanations(!showExplanations)}
          className="w-full p-6 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <i className="fa-solid fa-book-open text-indigo-600 dark:text-indigo-400"></i>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">View Missed Questions & Explanations</span>
          </div>
          <i className={`fa-solid fa-chevron-${showExplanations ? 'up' : 'down'} text-slate-400 dark:text-slate-500`}></i>
        </button>

        {showExplanations && (
          <div className="p-6 space-y-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
            {result.missedQuestions.map(({ question: q, userAnswer }, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-bold rounded uppercase">{q.category}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">Question {q.id}</span>
                </div>
                {q.context && (
                  <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 font-serif leading-relaxed whitespace-pre-wrap">
                    {q.context}
                  </div>
                )}
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 whitespace-pre-wrap">{q.text}</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correctAnswer;
                    const isUserChoice = optIdx === userAnswer;
                    
                    let bgColor = 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500';
                    let borderColor = 'border-transparent';
                    
                    if (isCorrect) {
                      bgColor = 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold';
                      borderColor = 'border-emerald-200 dark:border-emerald-800';
                    } else if (isUserChoice) {
                      bgColor = 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold';
                      borderColor = 'border-rose-200 dark:border-rose-800';
                    }

                    return (
                      <div key={optIdx} className={`p-3 rounded-lg text-sm flex items-center border ${bgColor} ${borderColor}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 font-bold ${isCorrect ? 'bg-emerald-500 text-white' : isUserChoice ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'}`}>
                          {optIdx + 1}
                        </span>
                        {opt}
                        {isCorrect && <i className="fa-solid fa-check ml-auto"></i>}
                        {isUserChoice && !isCorrect && <i className="fa-solid fa-xmark ml-auto"></i>}
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-l-4 border-indigo-400 dark:border-indigo-600">
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Explanation / 解説</p>
                  <p className="text-slate-700 dark:text-slate-400 leading-relaxed text-sm whitespace-pre-wrap">{q.explanation}</p>
                </div>
              </div>
            ))}
            {result.missedQuestions.length === 0 && (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-medium">No missed questions! Perfect score! ✨</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;

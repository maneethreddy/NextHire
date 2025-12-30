import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Clock, AlertCircle } from 'lucide-react';

const InterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state?.config || {};

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(config.duration === '15 minutes' ? 900 : 1800);
  const [isComplete, setIsComplete] = useState(false);

  // Mock questions based on configuration
  const questions = [
    {
      id: 1,
      text: `Explain the concept of ${config.jobPosition?.includes('Frontend') ? 'React hooks' : config.jobPosition?.includes('Backend') ? 'RESTful APIs' : 'system design'}.`,
      followUp: null
    },
    {
      id: 2,
      text: `What are the key differences between ${config.difficulty === 'Easy' ? 'synchronous and asynchronous' : 'microservices and monolithic'} architecture?`,
      followUp: null
    },
    {
      id: 3,
      text: `How would you handle ${config.jobPosition?.includes('Backend') ? 'database connection pooling' : 'state management'} in a production environment?`,
      followUp: null
    }
  ];

  useEffect(() => {
    if (timeRemaining > 0 && !isComplete) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      handleComplete();
    }
  }, [timeRemaining, isComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitAnswer = () => {
    if (currentAnswer.trim()) {
      const newAnswers = [...answers, {
        questionId: questions[currentQuestionIndex].id,
        question: questions[currentQuestionIndex].text,
        answer: currentAnswer,
        timestamp: Date.now()
      }];

      setAnswers(newAnswers);
      setCurrentAnswer('');

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleComplete = () => {
    setIsComplete(true);
    // Navigate to feedback with answers
    setTimeout(() => {
      navigate('/feedback', {
        state: {
          config,
          answers,
          timeSpent: (config.duration === '15 minutes' ? 900 : 1800) - timeRemaining
        }
      });
    }, 2000);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#060010] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Interview Complete!</h2>
          <p className="text-gray-400">Analyzing your responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060010] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#060010]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Mock Interview Session</h1>
            <p className="text-sm text-gray-400">
              {config.jobPosition} • {config.experienceLevel} • {config.difficulty}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/10">
              <Clock className="w-5 h-5 text-red-400" />
              <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
            </div>
            <div className="text-sm text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Question Card */}
          <div className="bg-black/30 rounded-2xl p-8 border border-white/10 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-red-400">Q{currentQuestionIndex + 1}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">{questions[currentQuestionIndex].text}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Take your time to formulate a comprehensive answer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Answer Input */}
          <div className="bg-black/30 rounded-2xl p-8 border border-white/10 mb-6">
            <label className="block text-lg font-semibold mb-4">Your Answer</label>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here... Be thorough and explain your reasoning."
              className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-6 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 resize-none"
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {currentAnswer.length} characters
              </div>
              <button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim()}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  currentAnswer.trim()
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:opacity-90'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Submit & Next' : 'Submit & Complete'}
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm font-semibold">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;


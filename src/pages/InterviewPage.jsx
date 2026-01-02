import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Clock, AlertCircle, Mic, MicOff, Volume2, X, LogOut } from 'lucide-react';
import interviewerVideo from '../assets/AI_Job_Interviewer_Video_Generation.mp4';

const InterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state?.config || {};

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(config.duration === '15 minutes' ? 900 : 1800);
  const [isComplete, setIsComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userVideoStream, setUserVideoStream] = useState(null);

  const recognitionRef = useRef(null);
  const userVideoRef = useRef(null);
  const interviewerVideoRef = useRef(null);
  const userStreamRef = useRef(null);

  // Mock questions based on configuration
  const questions = [
    {
      id: 1,
      text: 'Have you ever started something from scratch? A project, club, or activity? What was your learning?',
      followUp: null
    },
    {
      id: 2,
      text: `Explain the concept of ${config.jobPosition?.includes('Frontend') ? 'React hooks' : config.jobPosition?.includes('Backend') ? 'RESTful APIs' : 'system design'}.`,
      followUp: null
    },
    {
      id: 3,
      text: `What are the key differences between ${config.difficulty === 'Easy' ? 'synchronous and asynchronous' : 'microservices and monolithic'} architecture?`,
      followUp: null
    },
    {
      id: 4,
      text: `How would you handle ${config.jobPosition?.includes('Backend') ? 'database connection pooling' : 'state management'} in a production environment?`,
      followUp: null
    }
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentAnswer(prev => {
          const base = prev.split(' [Listening...]')[0];
          return base + finalTranscript + (interimTranscript ? ' [Listening...]' : '');
        });
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize user video
    const initUserVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        userStreamRef.current = stream;
        setUserVideoStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing user video:', error);
      }
    };

    initUserVideo();

    return () => {
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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

  const handleStartRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const handleRepeatQuestion = () => {
    // Play the question audio or restart video if needed
    if (interviewerVideoRef.current) {
      interviewerVideoRef.current.currentTime = 0;
      interviewerVideoRef.current.play();
    }
  };

  const handleSubmitAnswer = () => {
    const answerText = currentAnswer.replace(' [Listening...]', '').trim();
    if (answerText) {
      if (isRecording) {
        handleStopRecording();
      }
      
      const newAnswers = [...answers, {
        questionId: questions[currentQuestionIndex].id,
        question: questions[currentQuestionIndex].text,
        answer: answerText,
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
    <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Main Interviewer Video Container - Takes most of the screen */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Background blur effect for office feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/20 to-gray-800/20 backdrop-blur-sm"></div>
        
        {/* Main Video */}
        <div className="relative w-full h-full flex items-center justify-center px-4">
          <video
            ref={interviewerVideoRef}
            src={interviewerVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Timer Badge - Top Left Overlay */}
        <div className="absolute top-6 left-6 bg-black px-4 py-2 rounded-full z-50">
          <span className="font-mono text-white text-base">{formatTime(timeRemaining)}</span>
        </div>

        {/* EXIT INTERVIEW Button - Top Right Overlay */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold text-white z-50 shadow-lg hover:shadow-xl group"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span>EXIT INTERVIEW</span>
        </button>

        {/* START ANSWER Button - Bottom Center Overlay */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`px-10 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-2xl text-base ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-green-500 hover:bg-green-600 hover:scale-105 text-white active:scale-95'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-6 h-6 animate-pulse" />
                <span>STOP RECORDING</span>
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                <span>START ANSWER</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* User Video Preview - Bottom Right Corner (overlapping question panel) */}
      <div className="fixed bottom-6 right-6 w-64 h-48 bg-black rounded-xl overflow-hidden border-4 border-white shadow-2xl z-50">
        {userVideoStream ? (
          <video
            ref={userVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-2 border-white/30 rounded-full mx-auto mb-2 animate-pulse"></div>
              <p className="text-xs text-white/60">Camera Loading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Question Section - White Panel Below Video */}
      <div className="bg-white border-t border-gray-200 shadow-lg relative z-30">
        <div className="max-w-6xl mx-auto px-8 py-6">
          {/* Question Row */}
          <div className="flex items-start justify-between gap-6 mb-4">
            <div className="flex-1">
              <div className="mb-1">
                <span className="text-sm font-semibold text-purple-600">Main Question</span>
              </div>
              <h2 className="text-lg font-semibold text-black leading-relaxed">
                {questions[currentQuestionIndex].text}
              </h2>
            </div>
            <button
              onClick={handleRepeatQuestion}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors text-sm text-gray-700 flex-shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              Repeat Question
            </button>
          </div>

          {/* Answer Display Area */}
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[120px]">
              {currentAnswer ? (
                <p className="text-black whitespace-pre-wrap text-sm leading-relaxed">
                  {currentAnswer.replace(' [Listening...]', '')}
                </p>
              ) : (
                <p className="text-gray-400 italic text-sm">
                  {isRecording ? 'Listening... Speak your answer clearly.' : 'Your answer will appear here when you start recording.'}
                </p>
              )}
              {isListening && (
                <div className="mt-3 flex items-center gap-2 text-green-600 text-xs">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <span>Listening...</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.replace(' [Listening...]', '').trim()}
                className={`px-6 py-2.5 rounded-md font-semibold flex items-center gap-2 transition-all text-sm ${
                  currentAnswer.replace(' [Listening...]', '').trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Interview'}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;



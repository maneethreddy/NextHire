import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Mic } from 'lucide-react';
import interviewVideo from '../assets/AI_Job_Interviewer_Video_Generation.mp4';

const InterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const userVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  
  const config = location.state?.config || {};
  // Parse duration from config (e.g., "30 minutes" -> 30)
  const durationMatch = config.duration?.match(/(\d+)/);
  const totalDuration = durationMatch ? parseInt(durationMatch[1]) : 30; // in minutes
  
  // Questions array - 5 questions
  const [questions] = useState([
    "Have you ever started something from scratch? A project, club or activity? what was your learning?",
    "Explain a challenging technical problem you've solved recently. What was your approach?",
    "How do you handle working under pressure or tight deadlines? Can you give an example?",
    "Describe a time when you had to learn a new technology quickly. How did you approach it?",
    "What is your process for debugging complex issues? Walk me through your methodology."
  ]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(totalDuration * 60); // in seconds (countdown)
  const [isRecording, setIsRecording] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState([]);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize user video (webcam) and audio
  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing webcam/microphone:', error);
      }
    };

    getUserMedia();

    // Cleanup: stop all tracks when component unmounts
    return () => {
      if (userVideoRef.current && userVideoRef.current.srcObject) {
        const tracks = userVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize Speech Recognition
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

        setAnswer(prev => {
          const newAnswer = prev + finalTranscript;
          return newAnswer + interimTranscript;
        });
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    } else {
      console.warn('Speech Recognition API not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle finish interview function
  const handleFinishInterview = () => {
    // Stop recognition if active
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }

    // Save final answer if recording
    if (isRecording && answer) {
      const currentAnswers = [...answers];
      currentAnswers[currentQuestionIndex] = answer;
      setAnswers(currentAnswers);
    }

    // Navigate to feedback page
    navigate('/feedback', {
      state: {
        config,
        answers: answers,
        timeSpent: (totalDuration * 60) - timeRemaining
      }
    });
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleFinishInterview();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, totalDuration]);

  // Format time as MM:SS (for countdown)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit the interview?')) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      navigate('/');
    }
  };

  const handleStartAnswer = () => {
    setIsRecording(true);
    setAnswer('');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const handleStopAnswer = () => {
    setIsRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Save current answer
    const currentAnswers = [...answers];
    currentAnswers[currentQuestionIndex] = answer;
    setAnswers(currentAnswers);
    setAnswer('');
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAnswer(''); // Clear answer for next question
    } else {
      handleFinishInterview();
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#060010] overflow-hidden flex flex-col">
      {/* Top Left - EXIT and Timer */}
      <div className="absolute top-6 left-6 flex items-center gap-4 z-50">
        {/* EXIT Button */}
        <button
          onClick={handleExit}
          className="exit-button"
        >
          <X className="w-5 h-5" />
          <span>EXIT</span>
        </button>

        {/* Timer (Countdown) */}
        <div className="timer-display">
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Video Panels Section - 50/50 Split with Equal Heights */}
      <div className="flex-1 flex items-stretch gap-4 px-4 pt-20 pb-4">
        {/* Main Interview Video - Left Half */}
        <div className="flex-1 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="interview-video-split"
          >
            <source src={interviewVideo} type="video/mp4" />
          </video>
        </div>

        {/* User Video - Right Half */}
        <div className="flex-1 flex items-center justify-center">
          <video
            ref={userVideoRef}
            autoPlay
            playsInline
            muted
            className="user-video-split"
          />
        </div>
      </div>

      {/* START/STOP ANSWER Button - Centered below videos */}
      <div className="flex justify-center py-4 z-50">
        {!isRecording ? (
          <button
            onClick={handleStartAnswer}
            className="start-answer-button"
          >
            <Mic className="w-6 h-6" />
            <span>START ANSWER</span>
          </button>
        ) : (
          <button
            onClick={handleStopAnswer}
            className="stop-answer-button"
          >
            <div className="recording-indicator" />
            <span>STOP ANSWER</span>
          </button>
        )}
      </div>

      {/* Question Section - Bottom */}
      <div className="px-6 pb-6 z-50">
        <div className="question-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="question-heading">Question {currentQuestionIndex + 1} of {questions.length}</h3>
            {!isRecording && answer && currentQuestionIndex < questions.length - 1 && (
              <button
                onClick={handleNextQuestion}
                className="next-question-button"
              >
                Next Question →
              </button>
            )}
            {!isRecording && currentQuestionIndex === questions.length - 1 && answers.length === questions.length && (
              <button
                onClick={handleFinishInterview}
                className="finish-interview-button"
              >
                Finish Interview →
              </button>
            )}
          </div>
          <p className="question-text">{currentQuestion}</p>
          {answer && (
            <div className="answer-text">
              {answer}
            </div>
          )}
          {!answer && !isRecording && (
            <p className="answer-placeholder">your answer appear here</p>
          )}
          {isRecording && !answer && (
            <p className="answer-placeholder">Listening... Speak your answer</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;

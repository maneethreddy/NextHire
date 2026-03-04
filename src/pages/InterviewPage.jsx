import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Mic, Play, Loader2 } from 'lucide-react';
import interviewVideo from '../assets/AI_Job_Interviewer_Video_Generation.mp4';
import { getQuestionCountFromDuration } from '../utils/questionGenerator';
import { getAttemptedQuestionIds, setAttemptedQuestionIds, saveInterviewSession, updateInterviewSession } from '../utils/storage';
import { generateGeminiQuestions } from '../utils/geminiQuestions';

const InterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const userVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const questionReadyAtRef = useRef(null); // timestamp when TTS finishes (for CLT)

  const config = location.state?.config || {};
  // Parse duration from config (e.g., "30 minutes" -> 30)
  const durationMatch = config.duration?.match(/(\d+)/);
  const totalDuration = durationMatch ? parseInt(durationMatch[1]) : 30; // in minutes

  const [questions, setQuestions] = useState([]);
  const [sessionId] = useState(() => crypto.randomUUID());

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(totalDuration * 60); // in seconds (countdown)
  const [isRecording, setIsRecording] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [audioRecordings, setAudioRecordings] = useState([]); // Array of audio blobs
  const [showSummary, setShowSummary] = useState(false);
  const [userStream, setUserStream] = useState(null);
  const [answerStartTime, setAnswerStartTime] = useState(null);
  const [typedStartTime, setTypedStartTime] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);
  const [questionError, setQuestionError] = useState('');

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (questions.length > 0) return;
    let isMounted = true;

    const loadQuestions = async () => {
      setIsGeneratingQuestions(true);
      setQuestionError('');
      const totalQuestions = getQuestionCountFromDuration(config.duration);
      let selectedQuestions = [];
      let breakdown = { skill: 0, project: 0, hr: 0 };

      try {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
          throw new Error('Gemini API key missing. Please set VITE_GEMINI_API_KEY.');
        }
        // Resume is optional — if provided, Gemini personalises questions from it.
        // If not, questions are generated purely from Job Position, Experience Level & Difficulty.
        selectedQuestions = await generateGeminiQuestions({
          resumeFile: config.resumeFile || null,
          jobRole: config.jobPosition,
          difficulty: config.difficulty,
          experienceLevel: config.experienceLevel,
          duration: config.duration,
          count: totalQuestions
        });
      } catch (error) {
        console.warn('Gemini question generation failed.', error);
        setQuestionError(error.message || 'Failed to generate questions. Please try again.');
      }

      if (selectedQuestions.length) {
        breakdown = {
          skill: selectedQuestions.filter((q) => q.category === 'skill').length,
          project: selectedQuestions.filter((q) => q.category === 'project').length,
          hr: selectedQuestions.filter((q) => q.category === 'hr').length
        };
      }

      if (!isMounted) return;
      setQuestions(selectedQuestions);
      setAttemptedQuestionIds(
        Array.from(new Set([...getAttemptedQuestionIds(), ...selectedQuestions.map((q) => q.questionId)]))
      );

      const session = {
        id: sessionId,
        startedAt: new Date().toISOString(),
        config,
        resumeData: config.resumeData || null,
        questions: selectedQuestions,
        breakdown
      };

      saveInterviewSession(session);
      setIsGeneratingQuestions(false);
    };

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [config, questions.length, sessionId]);

  useEffect(() => {
    setAnswer(answers[currentQuestionIndex]?.text || '');
    setTypedStartTime(null);
  }, [currentQuestionIndex, answers]);

  // Initialize user video (webcam) and audio
  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setUserStream(stream);
        if (userVideoRef.current && stream) {
          userVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing webcam/microphone:', error);
      }
    };

    getUserMedia();

    // Cleanup: stop all tracks when component unmounts
    return () => {
      stopAllTracks();
    };
  }, []);

  // Stop all media tracks
  const stopAllTracks = () => {
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
      setUserStream(null);
    }
    if (userVideoRef.current && userVideoRef.current.srcObject) {
      const tracks = userVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      userVideoRef.current.srcObject = null;
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      let finalTranscriptAccumulator = '';

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

        // Accumulate final transcripts
        finalTranscriptAccumulator += finalTranscript;

        // Display: accumulated final + current interim
        setAnswer(finalTranscriptAccumulator + interimTranscript);
      };

      recognitionRef.current.onend = () => {
        // Reset accumulator when recognition ends
        finalTranscriptAccumulator = '';
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

  // Text-to-speech for questions
  useEffect(() => {
    if (currentQuestion?.text && 'speechSynthesis' in window && videoRef.current) {
      const speakQuestion = () => {
        // Get available voices and select a female voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(voice =>
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('hazel') ||
          (voice.lang.startsWith('en') && voice.name.includes('Female'))
        ) || voices.find(voice => voice.lang.startsWith('en-US') && voice.gender === 'female')
          || voices.find(voice => voice.lang.startsWith('en'));

        const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        // Start playing video when speech starts
        utterance.onstart = () => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0; // Reset to beginning
            videoRef.current.play();
          }
        };

        // Stop/pause video when speech ends — record timestamp for CLT
        utterance.onend = () => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
          questionReadyAtRef.current = Date.now();
        };

        utterance.onerror = () => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        };

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Speak the question
        window.speechSynthesis.speak(utterance);
      };

      // Load voices if not already loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = speakQuestion;
      } else {
        speakQuestion();
      }
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [currentQuestion]);

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
  }, [timeRemaining]);

  // Format time as MM:SS (for countdown)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit the interview?')) {
      // Stop all media tracks
      stopAllTracks();

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      navigate('/');
    }
  };

  const handleStartAnswer = async () => {
    setIsRecording(true);
    // Start with saved answer if exists, otherwise empty
    setAnswer(answers[currentQuestionIndex]?.text || '');
    setAnswerStartTime(Date.now());
    setTypedStartTime(null);
    audioChunksRef.current = [];

    try {
      // Start MediaRecorder for audio recording
      if (userStream) {
        const mediaRecorder = new MediaRecorder(userStream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Store audio recording
          const currentRecordings = [...audioRecordings];
          currentRecordings[currentQuestionIndex] = audioUrl;
          setAudioRecordings(currentRecordings);
        };

        mediaRecorder.start();
      }

      // Start Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const persistCurrentAnswer = (finalText) => {
    const trimmed = finalText.trim();
    if (!trimmed) return;

    const currentAnswers = [...answers];
    const startedAt = answerStartTime || typedStartTime || Date.now();

    currentAnswers[currentQuestionIndex] = {
      text: trimmed,
      startedAt,
      endedAt: Date.now(),
      questionReadyAt: questionReadyAtRef.current // for CLT calculation
    };

    setAnswers(currentAnswers);
    return currentAnswers;
  };

  const handleStopAnswer = () => {
    setIsRecording(false);

    // Stop Speech Recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Save current answer transcript (remove any interim results)
    if (answer) {
      persistCurrentAnswer(answer.replace(/undefined/g, ''));
    }
    setAnswerStartTime(null);
  };

  const handleRetryQuestion = () => {
    // Clear the current answer so the user can re-record
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = null;
    setAnswers(updatedAnswers);
    setAnswer('');
    setAnswerStartTime(null);
    setTypedStartTime(null);

    // Re-read the question via TTS
    if (currentQuestion?.text && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v =>
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('zira') ||
        (v.lang.startsWith('en') && v.name.includes('Female'))
      ) || voices.find(v => v.lang.startsWith('en'));

      const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
      utterance.rate = 0.9;
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.onstart = () => {
        if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
      };
      utterance.onend = () => {
        if (videoRef.current) videoRef.current.pause();
        questionReadyAtRef.current = Date.now();
      };
      utterance.onerror = () => {
        if (videoRef.current) videoRef.current.pause();
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextQuestion = () => {
    // Make sure recording is stopped
    if (isRecording) {
      handleStopAnswer();
    }

    if (!isRecording && answer) {
      persistCurrentAnswer(answer);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAnswer(''); // Clear answer for next question
    } else {
      handleFinishInterview();
    }
  };

  const handleFinishInterview = () => {
    // Stop recognition if active
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }

    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Save final answer if recording
    const finalAnswers = answer ? persistCurrentAnswer(answer) : answers;

    // Stop all media tracks
    stopAllTracks();

    updateInterviewSession(sessionId, {
      completedAt: new Date().toISOString(),
      answers: finalAnswers || answers
    });

    // Show summary screen
    setShowSummary(true);
  };

  const handlePlayAudio = (audioUrl, event) => {
    event.stopPropagation();
    const audio = new Audio(audioUrl);
    audio.play();
  };

  // Loading Screen
  if (isGeneratingQuestions) {
    return (
      <div className="min-h-screen bg-[#060010] flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-6" />
        <h2 className="text-3xl font-bold mb-3">Preparing Your Interview</h2>
        <p className="text-gray-400 text-lg animate-pulse">Analyzing your resume and generating personalized questions...</p>
      </div>
    );
  }

  // Summary Screen
  if (showSummary) {
    return (
      <div className="min-h-screen bg-[#060010] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Interview Summary</h1>

          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={index} className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-red-500 font-semibold text-lg mb-2">
                    Question {index + 1}
                  </h3>
                  {audioRecordings[index] && (
                    <button
                      onClick={(e) => handlePlayAudio(audioRecordings[index], e)}
                      className="play-audio-button"
                    >
                      <Play className="w-5 h-5" />
                      <span>Play Audio</span>
                    </button>
                  )}
                </div>
                <p className="text-gray-300 mb-4">{question.text}</p>

                {answers[index]?.text ? (
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white">{answers[index].text}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No answer recorded</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate('/feedback', {
                state: {
                  config,
                  questions,
                  answers: answers,
                  audioRecordings: audioRecordings,
                  timeSpent: (totalDuration * 60) - timeRemaining,
                  sessionId
                }
              })}
              className="finish-interview-button"
            >
              View Feedback →
            </button>
            <button
              onClick={() => navigate('/')}
              className="next-question-button"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#060010] overflow-hidden flex flex-col font-sans">

      {/* Animated background orbs (from Login/Home) */}
      <div className="login-orb login-orb-1 opacity-40" />
      <div className="login-orb login-orb-2 opacity-30" />
      <div className="login-orb login-orb-3 opacity-20" />
      <div className="login-grid-overlay" />

      {/* ── Video Panels (Picture-in-Picture) ── */}
      <div className="interview-videos">
        {/* Full background AI video */}
        <video ref={videoRef} muted playsInline className="interview-video-split">
          <source src={interviewVideo} type="video/mp4" />
        </video>

        {/* Floating User Webcam */}
        <video ref={userVideoRef} autoPlay playsInline muted className="user-video-split" />
      </div>
      {/* ── Top Bar: Exit + Timer ── */}
      <div className="interview-top-bar">
        <button onClick={handleExit} className="exit-button">
          <X className="w-4 h-4" />
          <span>Exit</span>
        </button>
        <div className="timer-display">
          <span className="timer-dot" />
          {formatTime(timeRemaining)}
        </div>
      </div>





      {/* ── Question Section ── */}
      <div className="interview-question-section">
        <div className="question-container">

          {/* Header row: question # + action buttons */}
          <div className="question-header-row">
            <h3 className="question-heading">Question {currentQuestionIndex + 1} of {questions.length}</h3>

            <div className="question-actions">
              {/* Retry (left of Next) — visible when answer exists */}
              {!isRecording && (answer || answers[currentQuestionIndex]?.text) && (
                <button onClick={handleRetryQuestion} className="retry-button">
                  ↻ Retry
                </button>
              )}

              {/* Next / Finish */}
              {!isRecording && (answer || answers[currentQuestionIndex]?.text) && currentQuestionIndex < questions.length - 1 && (
                <button onClick={handleNextQuestion} className="next-question-button">
                  Next Question →
                </button>
              )}
              {!isRecording && currentQuestionIndex === questions.length - 1 && (
                <button onClick={handleFinishInterview} className="finish-interview-button">
                  Finish Interview →
                </button>
              )}
            </div>
          </div>

          {/* Question text */}
          <p className="question-text">
            {questionError
              ? questionError
              : isGeneratingQuestions
                ? 'Generating personalized questions from your resume...'
                : currentQuestion?.text || 'Preparing your interview...'}
          </p>

          {/* Answer textarea */}
          <textarea
            value={answer}
            onChange={(event) => {
              if (!typedStartTime) setTypedStartTime(Date.now());
              setAnswer(event.target.value);
            }}
            disabled={isRecording}
            placeholder={isRecording ? 'Listening… Speak your answer' : 'Type or speak your answer here'}
            className="answer-input"
          />

          {/* Action Row inside container: Start/Stop Answer aligned center */}
          <div className="flex justify-center mt-6">
            {!isRecording ? (
              <button onClick={handleStartAnswer} className="start-answer-button">
                <Mic className="w-5 h-5" />
                <span>Start Answer</span>
              </button>
            ) : (
              <button onClick={handleStopAnswer} className="stop-answer-button">
                <div className="recording-indicator" />
                <span>Stop Answer</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default InterviewPage;

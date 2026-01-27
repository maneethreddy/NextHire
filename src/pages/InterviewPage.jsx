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
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
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
        if (!config.resumeFile) {
          throw new Error('Resume file missing. Please upload your resume to generate questions.');
        }
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
          throw new Error('Gemini API key missing. Please set VITE_GEMINI_API_KEY.');
        }
        selectedQuestions = await generateGeminiQuestions({
          resumeFile: config.resumeFile,
          jobRole: config.jobPosition,
          difficulty: config.difficulty,
          count: totalQuestions
        });
      } catch (error) {
        console.warn('Gemini question generation failed.', error);
        setQuestionError(error.message || 'Failed to generate questions from resume.');
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

        // Stop/pause video when speech ends
        utterance.onend = () => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
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
      endedAt: Date.now()
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

  const handleGenerateFollowUp = async () => {
    if (!currentQuestion || !answers[currentQuestionIndex]?.text) return;
    setIsGeneratingFollowUp(true);

    try {
      const followUps = await generateGeminiQuestions({
        resumeFile: config.resumeFile,
        jobRole: config.jobPosition,
        difficulty: config.difficulty,
        count: 1,
        mode: 'followup',
        previousQuestions: [currentQuestion.text],
        previousAnswers: [answers[currentQuestionIndex].text]
      });

      if (followUps.length) {
        const updatedQuestions = [...questions];
        updatedQuestions.splice(currentQuestionIndex + 1, 0, ...followUps);
        setQuestions(updatedQuestions);
      }
    } catch (error) {
      console.warn('Failed to generate follow-up question.', error);
    } finally {
      setIsGeneratingFollowUp(false);
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
            {!isRecording && (answer || answers[currentQuestionIndex]?.text) && currentQuestionIndex < questions.length - 1 && (
              <button
                onClick={handleNextQuestion}
                className="next-question-button"
              >
                Next Question →
              </button>
            )}
            {!isRecording && currentQuestionIndex === questions.length - 1 && (
              <button
                onClick={handleFinishInterview}
                className="finish-interview-button"
              >
                Finish Interview →
              </button>
            )}
          </div>
          <p className="question-text">
            {questionError
              ? questionError
              : isGeneratingQuestions
                ? 'Generating personalized questions from your resume...'
                : currentQuestion?.text || 'Preparing your interview...'}
          </p>
          <textarea
            value={answer}
            onChange={(event) => {
              if (!typedStartTime) {
                setTypedStartTime(Date.now());
              }
              setAnswer(event.target.value);
            }}
            disabled={isRecording}
            placeholder={isRecording ? 'Listening... Speak your answer' : 'Type or speak your answer here'}
            className="answer-input"
          />
          {!answer && !isRecording && !answers[currentQuestionIndex]?.text && (
            <p className="answer-placeholder">Your answer will appear here</p>
          )}
          {!isRecording && answers[currentQuestionIndex]?.text && (
            <button
              onClick={handleGenerateFollowUp}
              className="next-question-button"
              disabled={isGeneratingFollowUp}
            >
              {isGeneratingFollowUp ? 'Generating Follow-up...' : 'Generate Follow-up'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;

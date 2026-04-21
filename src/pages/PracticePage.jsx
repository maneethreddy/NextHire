import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkX, Mic, MicOff } from 'lucide-react';
import { getBookmarks, updateBookmarkScore } from '../utils/storage';
import { evaluateAnswer } from '../utils/evaluation';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo.png';

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
const scoreColor = (score) => {
  if (score >= 75) return '#4ade80';
  if (score >= 50) return '#facc15';
  return '#f87171';
};

// ─────────────────────────────────────────────────
// PRACTICE PAGE
// ─────────────────────────────────────────────────
const PracticePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bookmarks, setBookmarks]     = useState([]);
  const [current, setCurrent]         = useState(0);
  const [answer, setAnswer]           = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult]           = useState(null);
  const [finished, setFinished]       = useState(false);
  const [results, setResults]         = useState([]); // scores per question
  const [isLoading, setIsLoading]     = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef                = useRef(null);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user?.uid) return;
      setIsLoading(true);
      const data = await getBookmarks(user.uid);
      const active = data.filter((b) => b.isBookmarked);
      setBookmarks(active);
      if (active.length === 0) setFinished(true);
      setIsLoading(false);
    };
    fetchBookmarks();
  }, [user]);

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
          if (event.results[i].isFinal) finalTranscript += transcript + ' ';
          else interimTranscript += transcript;
        }
        finalTranscriptAccumulator += finalTranscript;
        setAnswer(finalTranscriptAccumulator + interimTranscript);
      };

      recognitionRef.current.onend = () => {
        finalTranscriptAccumulator = '';
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setAnswer('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const currentQ = bookmarks[current];

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setIsEvaluating(true);
    setResult(null);

    try {
      // Build a minimal question object for the evaluation pipeline
      const questionObj = {
        questionId:       currentQ.questionId,
        text:             currentQ.questionText,
        expectedConcepts: [],
        conceptDescriptions: {},
        category:         'skill'
      };

      const answerObj = {
        text:        answer.trim(),
        startedAt:   Date.now() - 5000,
        endedAt:     Date.now(),
        questionReadyAt: Date.now() - 8000
      };

      const evalResult = await evaluateAnswer({
        answer:     answerObj,
        question:   questionObj,
        targetRole: 'any',
        difficulty: 'medium'
      });

      const newScore = evalResult.score10 != null
        ? evalResult.score10 * 10
        : (evalResult.weightedScore ?? 0);

      await updateBookmarkScore(user?.uid, currentQ.questionId, newScore);
      setResult({ ...evalResult, score: Math.round(newScore) });
      setResults((prev) => [...prev, Math.round(newScore)]);
    } catch (err) {
      console.error('Practice evaluation failed', err);
      setResult({ error: true });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (isListening) recognitionRef.current?.stop();
    if (current < bookmarks.length - 1) {
      setCurrent(current + 1);
      setAnswer('');
      setResult(null);
    } else {
      setFinished(true);
    }
  };

  // ── Finished Screen ──────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060010] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Loading your bookmarks...</p>
      </div>
    );
  }

  if (finished) {
    const avg = results.length
      ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
      : 0;

    return (
      <div className="min-h-screen bg-[#060010] text-white flex flex-col items-center justify-center px-6">
        <div style={{
          maxWidth: '480px', width: '100%', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', borderRadius: '1.5rem',
          padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          {results.length > 0 ? (
            <>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Practice Complete!</h2>
              <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                You answered {results.length} bookmarked question{results.length !== 1 ? 's' : ''}.
              </p>
              <div style={{
                fontSize: '3.5rem', fontWeight: 700, color: scoreColor(avg), marginBottom: '0.25rem'
              }}>{avg}/100</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '2rem' }}>Average practice score</div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Bookmarks</h2>
              <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                You have no bookmarked weak questions yet. Complete an interview to generate bookmarks.
              </p>
            </>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => navigate('/configure')} style={{
              padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: 'none',
              background: 'linear-gradient(135deg, #dc2626, #ec4899)',
              color: 'white', fontWeight: 700, cursor: 'pointer'
            }}>New Interview</button>
            <button onClick={() => navigate('/')} style={{
              padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', fontWeight: 600, cursor: 'pointer'
            }}>Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Practice Screen ───────────────────────
  return (
    <div className="min-h-screen bg-[#060010] text-white">
      <div className="login-orb login-orb-1 opacity-25" />
      <div className="login-orb login-orb-3 opacity-15" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060010]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /><span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookmarkX style={{ width: '20px', height: '20px', color: '#facc15' }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Practice Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <img src={Logo} alt="NextHire" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>

          {/* Progress bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem', color: '#6b7280' }}>
              <span>Question {current + 1} of {bookmarks.length}</span>
              <span>⭐ Bookmarked Questions</span>
            </div>
            <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                background: 'linear-gradient(90deg, #facc15, #f97316)',
                width: `${((current + 1) / bookmarks.length) * 100}%`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* Question card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.25rem', padding: '2rem', marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: 700 }}>⭐ WEAK QUESTION</span>
              {currentQ?.score !== undefined && (
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem',
                  background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)'
                }}>
                  Previous score: {Math.round(currentQ.score)}/100
                </span>
              )}
            </div>
            <p style={{ fontSize: '1.05rem', color: '#e5e7eb', lineHeight: 1.6, fontWeight: 500 }}>
              {currentQ?.questionText}
            </p>
          </div>

          {/* Answer area */}
          {!result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your improved answer here or record voice..."
                disabled={isEvaluating || isListening}
                style={{
                  width: '100%', padding: '1rem 1.25rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.875rem', color: '#e5e7eb', fontSize: '0.95rem',
                  lineHeight: 1.6, resize: 'vertical', minHeight: '140px', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={toggleListening}
                  disabled={isEvaluating}
                  style={{
                    padding: '0.85rem', borderRadius: '0.875rem', border: 'none',
                    background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                    color: isListening ? '#f87171' : '#e5e7eb',
                    fontWeight: 600, fontSize: '0.95rem', cursor: isEvaluating ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s', border: isListening ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)'
                  }}
                  onMouseEnter={(e) => { if (!isListening && !isEvaluating) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                  onMouseLeave={(e) => { if (!isListening && !isEvaluating) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                >
                  {isListening ? <><MicOff style={{ width: '18px', height: '18px' }} /> Stop</> : <><Mic style={{ width: '18px', height: '18px' }} /> Voice Recording</>}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isEvaluating || isListening}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: '0.875rem', border: 'none',
                    background: isEvaluating || !answer.trim() || isListening
                      ? 'rgba(255,255,255,0.1)'
                      : 'linear-gradient(135deg, #facc15, #f97316)',
                    color: isEvaluating || !answer.trim() || isListening ? '#6b7280' : '#1a1a1a',
                    fontWeight: 700, fontSize: '1rem',
                    cursor: isEvaluating || !answer.trim() || isListening ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isEvaluating ? 'Evaluating…' : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}

          {/* Result panel */}
          {result && !result.error && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${scoreColor(result.score) === '#4ade80' ? 'rgba(34,197,94,0.3)' : scoreColor(result.score) === '#facc15' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: '1.25rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {result.correctnessLabel || 'Evaluated'}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: scoreColor(result.score) }}>
                  {result.score}/100
                </span>
              </div>
              {result.feedback && (
                <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {result.feedback}
                </p>
              )}
              {result.missingConcepts?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Still missing
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {result.missingConcepts.map((c, i) => (
                      <span key={i} style={{
                        padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.73rem',
                        background: 'rgba(239,68,68,0.1)', color: '#f87171'
                      }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.score >= 70 && (
                <div style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✓ Bookmark will be removed — great improvement!
                </div>
              )}
              <button
                onClick={handleNext}
                style={{
                  padding: '0.75rem', borderRadius: '0.875rem', border: 'none',
                  background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem'
                }}
              >
                {current < bookmarks.length - 1 ? 'Next Question →' : 'Finish Practice →'}
              </button>
            </div>
          )}

          {result?.error && (
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', textAlign: 'center' }}>
              Evaluation failed. <button onClick={() => setResult(null)} style={{ color: '#ec4899', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Try again</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PracticePage;

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { getInterviewSession } from '../utils/storage';
import { generatePDF } from '../utils/pdf';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo.png';

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const scoreColor = (score100) => {
  if (score100 >= 75) return { text: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
  if (score100 >= 50) return { text: '#facc15', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)' };
  return              { text: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' };
};

const pct = (v) => v !== null && v !== undefined ? `${Math.round(v * 100)}%` : 'N/A';

const INDEX_META = {
  clt: 'CLT', tai: 'TAI', ace: 'ACE', edd: 'EDD', iri: 'IRI'
};

// ─────────────────────────────────────────────────
// QUESTION ACCORDION CARD
// ─────────────────────────────────────────────────
const QuestionCard = ({ question, answer, result, index }) => {
  const [open, setOpen] = useState(false);
  const score100 = result?.score10 != null ? result.score10 * 10 : (result?.weightedScore ?? 0);
  const clr      = scoreColor(score100);
  const label    = result?.correctnessLabel || 'N/A';

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       `1px solid ${open ? clr.border : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '1rem',
      overflow:     'hidden',
      transition:   'border-color 0.25s'
    }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '1rem', textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
          {/* Q number */}
          <span style={{
            minWidth: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.78rem', fontWeight: 700, color: '#ec4899', flexShrink: 0
          }}>Q{index + 1}</span>

          <span style={{ fontSize: '0.92rem', color: '#e5e7eb', fontWeight: 500, lineHeight: 1.45 }}>
            {question.text}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Score badge */}
          <div style={{
            padding: '0.25rem 0.75rem', borderRadius: '999px',
            background: clr.bg, border: `1px solid ${clr.border}`,
            fontSize: '0.78rem', fontWeight: 700, color: clr.text
          }}>
            {Math.round(score100)}/100
          </div>
          {open ? <ChevronUp style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                : <ChevronDown style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{
          padding: '0 1.5rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', gap: '1rem'
        }}>
          {/* Correctness label + indices */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '1rem' }}>
            <span style={{
              padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 700, background: clr.bg, color: clr.text, border: `1px solid ${clr.border}`
            }}>{label}</span>
            {result?.indices && Object.entries(INDEX_META).map(([k, abbr]) => (
              <span key={k} style={{
                padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem',
                background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)'
              }}>
                {abbr}: {pct(result.indices[k])}
              </span>
            ))}
          </div>

          {/* User answer */}
          <div>
            <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Your Answer
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem',
              padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#d1d5db', lineHeight: 1.6
            }}>
              {answer?.text || <em style={{ color: '#6b7280' }}>No answer recorded</em>}
            </div>
          </div>

          {/* Missing concepts */}
          {result?.missingConcepts?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Missing Concepts
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {result.missingConcepts.map((c, i) => (
                  <span key={i} style={{
                    padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem',
                    background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)'
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {result?.feedback && (
            <div>
              <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Feedback
              </div>
              <div style={{
                background: 'rgba(236,72,153,0.07)', borderRadius: '0.75rem',
                padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#e5e7eb', lineHeight: 1.6,
                borderLeft: '3px solid rgba(236,72,153,0.4)'
              }}>
                {result.feedback}
              </div>
            </div>
          )}

          {/* Follow-up Q&A if present */}
          {answer?.followUpQuestion && (
            <div>
              <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                💡 AI Follow-Up
              </div>
              <div style={{ background: 'rgba(139,92,246,0.08)', borderRadius: '0.75rem', padding: '0.85rem 1rem', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#c4b5fd', borderLeft: '3px solid rgba(139,92,246,0.4)' }}>
                {answer.followUpQuestion}
              </div>
              {answer.followUpAnswer && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#d1d5db' }}>
                  {answer.followUpAnswer}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────
// REVIEW PAGE
// ─────────────────────────────────────────────────
const ReviewPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      if (!user?.uid || !sessionId) return;
      setIsLoading(true);
      const data = await getInterviewSession(user.uid, sessionId);
      setSession(data);
      setIsLoading(false);
    };
    fetchSession();
  }, [sessionId, user]);

  const role  = session?.config?.jobPosition || 'Unknown Role';
  const score = session?.overallScore ?? 0;
  const clr   = scoreColor(score);

  const handleDownloadPDF = () => {
    if (!session) return;
    generatePDF({
      role,
      date:            session.completedAt || session.startedAt,
      overallScore:    session.overallScore ?? 0,
      sessionIndices:  session.sessionIndices || {},
      questionResults: session.questionResults || [],
      questions:       session.questions || [],
      answers:         session.answers || [],
      summary:         session.summary || {}
    });
  };

  return (
    <div className="min-h-screen bg-[#060010] text-white">
      <div className="login-orb login-orb-1 opacity-30" />
      <div className="login-orb login-orb-2 opacity-20" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060010]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /><span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20">
              <img src={Logo} alt="NextHire" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold">NextHire</span>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Loading session details...</p>
            </div>
          ) : !session ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
              <p className="text-gray-400">This interview session could not be found or has been deleted.</p>
            </div>
          ) : (
            <>
              {/* Header card */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${clr.border}`,
                borderRadius: '1.5rem', padding: '2rem', marginBottom: '2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
              }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{role}</h1>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{formatDate(session.completedAt || session.startedAt)}</p>
                  {session.config?.difficulty && (
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', textTransform: 'capitalize' }}>
                      {session.config.difficulty} difficulty · {session.questions?.length || 0} questions
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Score ring */}
                  <div style={{
                    width: '70px', height: '70px', borderRadius: '50%',
                    background: clr.bg, border: `3px solid ${clr.border}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: clr.text, lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>/100</span>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!session.overallScore}
                    style={{
                      padding: '0.65rem 1.25rem', borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg, rgba(220,38,127,0.25), rgba(139,92,246,0.25))',
                      border: '1px solid rgba(220,38,127,0.35)',
                      color: '#f3f4f6', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      opacity: session.overallScore ? 1 : 0.4
                    }}
                  >
                    <FileText style={{ width: '15px', height: '15px' }} /> Download PDF
                  </button>
                </div>
              </div>

              {/* Q&A accordion list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(session.questions || []).map((question, i) => (
                  <QuestionCard
                    key={question.questionId || i}
                    question={question}
                    answer={session.answers?.[i]}
                    result={session.questionResults?.[i]}
                    index={i}
                  />
                ))}
              </div>

              {(!session.questions || session.questions.length === 0) && (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
                  No question data available for this session.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;

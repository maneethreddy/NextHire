import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileText, BookmarkX } from 'lucide-react';
import { evaluateInterview } from '../utils/evaluation';
import { generatePDF } from '../utils/pdf';
import { updateInterviewSession } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import BookmarkToggle from '../components/BookmarkToggle';
import Logo from '../assets/Logo.png';

// ─────────────────────────────────────────────────
// INDEX META
// ─────────────────────────────────────────────────
const INDEX_META = {
  clt: { label: 'CLT', name: 'Cognitive Latency Tolerance', desc: 'How quickly you responded to each question.' },
  tai: { label: 'TAI', name: 'Terminology Alignment', desc: 'How well you used domain-specific terms.' },
  ace: { label: 'ACE', name: 'Answer Compression Efficiency', desc: 'Conciseness of your concept coverage.' },
  edd: { label: 'EDD', name: 'Expectation Drift Detection', desc: 'How focused your answers stayed on-topic.' },
  iri: { label: 'IRI', name: 'Interview Robustness Index', desc: 'Consistency of performance across questions.' }
};
const INDEX_KEYS = ['clt', 'tai', 'ace', 'edd', 'iri'];

const indexColor = (val) => {
  if (val === null || val === undefined) return { bar: '#ffffff20', text: '#6b7280' };
  if (val >= 0.75) return { bar: '#22c55e', text: '#4ade80' };
  if (val >= 0.5) return { bar: '#eab308', text: '#facc15' };
  return { bar: '#ef4444', text: '#f87171' };
};

// ─────────────────────────────────────────────────
// SVG RADAR CHART (pentagon, no library)
// ─────────────────────────────────────────────────
const RadarChart = ({ indices }) => {
  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 100; // max radius in px
  const RINGS = 4;

  // Pentagon: 5 axes, start from top (-90°)
  const angleFor = (i) => (Math.PI * 2 * i) / 5 - Math.PI / 2;

  const point = (angle, radius) => ({
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle)
  });

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Grid ring paths
  const rings = Array.from({ length: RINGS }, (_, i) => {
    const r = R * ((i + 1) / RINGS);
    const pts = INDEX_KEYS.map((_, idx) => point(angleFor(idx), r));
    return toPath(pts);
  });

  // Axis lines from centre to tip
  const axes = INDEX_KEYS.map((_, i) => {
    const tip = point(angleFor(i), R);
    return { x1: CX, y1: CY, x2: tip.x, y2: tip.y };
  });

  // Data polygon
  const values = INDEX_KEYS.map((k) => {
    const v = indices[k];
    return (v !== null && v !== undefined) ? Math.max(0, Math.min(1, v)) : 0;
  });
  const dataPts = values.map((v, i) => point(angleFor(i), v * R));
  const dataPath = toPath(dataPts);

  // Labels at tips (offset outward)
  const LABEL_OFFSET = 22;
  const labels = INDEX_KEYS.map((k, i) => {
    const tip = point(angleFor(i), R + LABEL_OFFSET);
    return { ...tip, key: k, val: indices[k] };
  });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      ))}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(236,72,153,0.22)" stroke="#ec4899" strokeWidth="2" strokeLinejoin="round" />

      {/* Data dots */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ec4899" />
      ))}

      {/* Axis labels */}
      {labels.map((l) => {
        const colors = indexColor(l.val);
        const pct = l.val !== null && l.val !== undefined ? `${Math.round(l.val * 100)}%` : 'N/A';
        return (
          <g key={l.key}>
            <text
              x={l.x} y={l.y - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#e5e7eb"
              letterSpacing="0.05em"
            >
              {INDEX_META[l.key].label}
            </text>
            <text
              x={l.x} y={l.y + 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={colors.text}
            >
              {pct}
            </text>
          </g>
        );
      })}

      {/* Ring % labels on right axis */}
      {Array.from({ length: RINGS }, (_, i) => {
        const r = R * ((i + 1) / RINGS);
        return (
          <text key={i} x={CX + 4} y={CY - r + 3} fontSize="8" fill="rgba(255,255,255,0.3)">{((i + 1) / RINGS * 100).toFixed(0)}%</text>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────
// INDEX LEGEND CARD (compact row under chart)
// ─────────────────────────────────────────────────
const IndexLegend = ({ indexKey, value }) => {
  const meta = INDEX_META[indexKey];
  const colors = indexColor(value);
  const pct = value !== null && value !== undefined ? `${Math.round(value * 100)}%` : 'N/A';

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e5e7eb', letterSpacing: '0.06em' }}>{meta.label}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: colors.text }}>{pct}</span>
      </div>
      <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '999px', background: colors.bar, width: `${value !== null && value !== undefined ? Math.round(value * 100) : 0}%`, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ fontSize: '0.68rem', color: '#6b7280', lineHeight: 1.3 }}>{meta.desc}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────
const FeedbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config, answers, questions, sessionId } = location.state || {};
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  useEffect(() => {
    let isActive = true;
    const runEvaluation = async () => {
      if (!questions?.length) return;
      setIsEvaluating(true);
      setEvaluationError(null);
      try {
        const result = await evaluateInterview({ questions, answers, resumeData: config?.resumeData, config });
        if (isActive) {
          setEvaluation(result);

          // ── Enrich the stored session with scores + results ──
          if (sessionId && user?.uid) {
            await updateInterviewSession(user.uid, sessionId, {
              overallScore:    result.overallScore,
              questionResults: result.questionResults,
              sessionIndices:  result.sessionIndices,
              answers,
              summary:         result.summary
            });
          }
        }
      } catch (err) {
        if (isActive) setEvaluationError(err);
      } finally {
        if (isActive) setIsEvaluating(false);
      }
    };
    runEvaluation();
    return () => { isActive = false; };
  }, [questions, answers, config, sessionId, user]);

  const overallScore = evaluation?.overallScore || 0;
  const si = evaluation?.sessionIndices || {};

  return (
    <div className="min-h-screen bg-[#060010] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060010]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /><span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-black/20">
              <img src={Logo} alt="NextHire Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold">NextHire</span>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Interview Analysis Complete</h1>
            <p className="text-xl text-gray-400">Comprehensive evaluation based on research-grade metrics</p>
            {isEvaluating && <p className="text-sm text-gray-500 mt-3 animate-pulse">Evaluating with Gemini AI embeddings…</p>}
            {evaluationError && <p className="text-sm text-red-400 mt-3">Evaluation failed. Showing fallback scoring.</p>}
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-8 border border-red-500/30 mb-8">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{isEvaluating ? '--' : overallScore}</div>
              <div className="text-2xl text-gray-300 mb-4">Overall Score</div>
              <div className="flex items-center justify-center gap-2">
                {!isEvaluating && (overallScore >= 80
                  ? <CheckCircle2 className="w-6 h-6 text-green-400" />
                  : overallScore >= 60
                    ? <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    : <XCircle className="w-6 h-6 text-red-400" />
                )}
                <span className="text-lg">
                  {isEvaluating ? 'Evaluating…'
                    : overallScore >= 80 ? 'Excellent Performance'
                      : overallScore >= 60 ? 'Good Performance'
                        : 'Needs Improvement'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Performance Indices — Radar Chart (Phase 4) ── */}
          {evaluation && !isEvaluating && (
            <div className="mb-8">
              <h2 className="text-3xl font-semibold mb-2 text-center">Performance Indices</h2>
              <p className="text-center text-gray-500 text-sm mb-8">
                Multi-dimensional assessment · CLT · TAI · ACE · EDD · IRI
              </p>

              {/* Radar chart centred */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1.25rem',
                  padding: '2rem 2.5rem',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <RadarChart indices={si} />
                  <p style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '0.5rem' }}>
                    Figure 2 · Index distribution for this interview session
                  </p>
                </div>
              </div>

              {/* Legend cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {INDEX_KEYS.map((k) => <IndexLegend key={k} indexKey={k} value={si[k]} />)}
              </div>
            </div>
          )}

          {/* Per-Question Evaluation */}
          {evaluation && !isEvaluating && (
            <div className="mb-8">
              <h2 className="text-3xl font-semibold mb-6 text-center">Per-Question Evaluation</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {questions.map((question, index) => {
                  const result = evaluation.questionResults[index];
                  const label = result?.correctnessLabel || 'Needs Improvement';
                  const isGood = label === 'Excellent' || label === 'Good' || label.toLowerCase().includes('correct');
                  const isFair = label === 'Fair' || label.toLowerCase().includes('partial');
                  const pillCls = isGood ? 'pill-green' : isFair ? 'pill-yellow' : 'pill-red';
                  const qi = result?.indices || {};
                  const score100 = result?.score10 != null ? result.score10 * 10 : (result?.weightedScore ?? 0);

                  return (
                    <div key={question.questionId} className="bg-black/30 rounded-2xl p-6 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Question {index + 1}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <BookmarkToggle
                            questionId={question.questionId}
                            questionText={question.text}
                            score={Math.round(score100)}
                          />
                          <span className={`score-pill ${pillCls}`}>{label}</span>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-4">{question.text}</p>

                      {/* Main scores */}
                      <div className="evaluation-grid mb-3">
                        <div>
                          <div className="evaluation-label">Semantic Relevance</div>
                          <div className="evaluation-value">{result?.semanticRelevanceScore ?? '--'}</div>
                        </div>
                        <div>
                          <div className="evaluation-label">Concept Coverage</div>
                          <div className="evaluation-value">{result?.conceptCoveragePercent ?? '--'}%</div>
                        </div>
                        {result?.score10 != null && (
                          <div>
                            <div className="evaluation-label">Score (1–10)</div>
                            <div className="evaluation-value">{result.score10}/10</div>
                          </div>
                        )}
                      </div>

                      {/* Mini indices */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem', marginBottom: '0.75rem' }}>
                        {['clt', 'tai', 'ace', 'edd'].map((k) => {
                          const v = qi[k];
                          const colors = indexColor(v);
                          const pct = v !== null && v !== undefined ? `${Math.round(v * 100)}%` : 'N/A';
                          return (
                            <div key={k} style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{INDEX_META[k].label}</span>
                              <span style={{ color: colors.text, fontWeight: 600 }}>{pct}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Missing concepts */}
                      <div className="mb-2">
                        <div className="evaluation-label">Missing Concepts</div>
                        <div className="evaluation-value">
                          {result?.missingConcepts?.length ? result.missingConcepts.join(', ') : 'None'}
                        </div>
                      </div>
                      <div className="evaluation-feedback">{result?.feedback}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}



          {/* Action Buttons */}
          <div className="flex gap-4 mt-8" style={{ flexWrap: 'wrap' }}>
            {/* Download PDF */}
            {evaluation && (
              <button
                onClick={() => generatePDF({
                  role:            config?.jobPosition || 'Interview',
                  date:            new Date().toISOString(),
                  overallScore:    evaluation.overallScore,
                  sessionIndices:  evaluation.sessionIndices,
                  questionResults: evaluation.questionResults,
                  questions,
                  answers,
                  summary:         evaluation.summary
                })}
                style={{
                  flex: 1, minWidth: '180px', padding: '1rem',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '0.75rem', color: '#e5e7eb', fontWeight: 600, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >
                <FileText style={{ width: '18px', height: '18px' }} />
                Download Report
              </button>
            )}

            {/* Practice Weak Areas */}
            <button
              onClick={() => navigate('/practice')}
              style={{
                flex: 1, minWidth: '180px', padding: '1rem',
                background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)',
                borderRadius: '0.75rem', color: '#facc15', fontWeight: 600, fontSize: '0.95rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250,204,21,0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(250,204,21,0.1)'}
            >
              <BookmarkX style={{ width: '18px', height: '18px' }} />
              Practice Weak Areas
            </button>

            <button onClick={() => navigate('/configure')} className="flex-1 py-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl font-semibold hover:opacity-90 transition-opacity" style={{ minWidth: '140px' }}>
              Practice Again
            </button>
            <button onClick={() => navigate('/')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-colors" style={{ minWidth: '140px' }}>
              Back to Home
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;

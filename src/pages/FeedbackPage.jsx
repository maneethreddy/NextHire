import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { evaluateInterview } from '../utils/evaluation';

const FeedbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, answers, questions } = location.state || {};
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
        const result = await evaluateInterview({
          questions,
          answers,
          resumeData: config?.resumeData,
          config
        });
        if (isActive) {
          setEvaluation(result);
        }
      } catch (error) {
        if (isActive) {
          setEvaluationError(error);
        }
      } finally {
        if (isActive) {
          setIsEvaluating(false);
        }
      }
    };

    runEvaluation();
    return () => {
      isActive = false;
    };
  }, [questions, answers, config]);
  const overallScore = evaluation?.overallScore || 0;

  return (
    <div className="min-h-screen bg-[#060010] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060010]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">→</span>
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
            <p className="text-xl text-gray-400">
              Comprehensive evaluation based on research-grade metrics
            </p>
            {isEvaluating && (
              <p className="text-sm text-gray-500 mt-3 animate-pulse">
                Evaluating answers with Gemini...
              </p>
            )}
            {evaluationError && (
              <p className="text-sm text-red-400 mt-3">
                Evaluation failed. Showing fallback scoring.
              </p>
            )}
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-8 border border-red-500/30 mb-8">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{isEvaluating ? '--' : overallScore}</div>
              <div className="text-2xl text-gray-300 mb-4">Overall Score</div>
              <div className="flex items-center justify-center gap-2">
                {isEvaluating ? null : overallScore >= 80 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : overallScore >= 60 ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <span className="text-lg">
                  {isEvaluating
                    ? 'Evaluating...'
                    : overallScore >= 80
                      ? 'Excellent Performance'
                      : overallScore >= 60
                        ? 'Good Performance'
                        : 'Needs Improvement'}
                </span>
              </div>
            </div>
          </div>

          {/* Per-Question Evaluation */}
          {evaluation && !isEvaluating && (
            <div className="mb-8">
              <h2 className="text-3xl font-semibold mb-6 text-center">Per-Question Evaluation</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {questions.map((question, index) => {
                  const result = evaluation.questionResults[index];
                  const hasRubric = Boolean(result?.rubric);
                  return (
                    <div key={question.questionId} className="bg-black/30 rounded-2xl p-6 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Question {index + 1}</h3>
                        <span className={`score-pill ${result.correctnessLabel.toLowerCase().includes('correct') ? 'pill-green' : result.correctnessLabel.toLowerCase().includes('partial') ? 'pill-yellow' : 'pill-red'}`}>
                          {result.correctnessLabel}
                      </span>
                  </div>
                      <p className="text-gray-300 mb-4">{question.text}</p>
                      {hasRubric ? (
                        <>
                          <div className="evaluation-grid">
                            <div>
                              <div className="evaluation-label">Core Coverage</div>
                              <div className="evaluation-value">{result.rubric.coreCoverage}/60</div>
                            </div>
                            <div>
                              <div className="evaluation-label">Supporting Coverage</div>
                              <div className="evaluation-value">{result.rubric.supportingCoverage}/25</div>
                            </div>
                            <div>
                              <div className="evaluation-label">Clarity</div>
                              <div className="evaluation-value">{result.rubric.clarity}/10</div>
                            </div>
                            <div>
                              <div className="evaluation-label">Technical Accuracy</div>
                              <div className="evaluation-value">{result.rubric.technicalAccuracy}/5</div>
                            </div>
                          </div>
                          <div>
                            <div className="evaluation-label">Missing Concepts</div>
                            <div className="evaluation-value">
                              {result.missingConcepts.length ? result.missingConcepts.join(', ') : 'None'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="evaluation-grid">
                            <div>
                              <div className="evaluation-label">Semantic Relevance</div>
                              <div className="evaluation-value">{result.semanticRelevanceScore}</div>
                            </div>
                            <div>
                              <div className="evaluation-label">Concept Coverage</div>
                              <div className="evaluation-value">{result.conceptCoveragePercent}%</div>
                            </div>
                          </div>
                          <div>
                            <div className="evaluation-label">Missing Concepts</div>
                            <div className="evaluation-value">
                              {result.missingConcepts.length ? result.missingConcepts.join(', ') : 'None'}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="evaluation-feedback">{result.feedback}</div>
                </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-black/30 rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Recommendations</h2>
            <div className="space-y-4">
              {evaluation?.summary?.missingConcepts?.length ? (
                evaluation.summary.missingConcepts.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-black/20 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Review: {rec}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 p-4 bg-black/20 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Keep practicing to improve coverage and depth.</span>
                </div>
              )}
              <div className="evaluation-disclaimer">
                Feedback is generated with Gemini rubric scoring and falls back to deterministic semantic matching if needed. It does not claim full human-level understanding.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => navigate('/configure')}
              className="flex-1 py-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Practice Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;

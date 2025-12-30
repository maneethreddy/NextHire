import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Brain, Target, Zap, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

const FeedbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, answers, timeSpent } = location.state || {};

  // Mock analytics data
  const analytics = {
    agi: {
      score: 78,
      missing: ['Database indexing', 'Caching strategies'],
      weak: ['API design patterns'],
      covered: ['REST principles', 'Error handling', 'Security']
    },
    iri: {
      score: 82,
      status: 'Stable',
      consistency: 'High'
    },
    tai: {
      score: 75,
      alignment: 'Good',
      suggestions: ['Use more industry-standard terminology', 'Reference specific frameworks']
    },
    ace: {
      score: 68,
      efficiency: 'Moderate',
      ratio: '0.72'
    },
    edd: {
      detected: false,
      drift: 'Minimal'
    }
  };

  const overallScore = Math.round(
    (analytics.agi.score + analytics.iri.score + analytics.tai.score + analytics.ace.score) / 4
  );

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
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-8 border border-red-500/30 mb-8">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{overallScore}</div>
              <div className="text-2xl text-gray-300 mb-4">Overall Score</div>
              <div className="flex items-center justify-center gap-2">
                {overallScore >= 80 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : overallScore >= 60 ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <span className="text-lg">
                  {overallScore >= 80 ? 'Excellent Performance' : overallScore >= 60 ? 'Good Performance' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* AGI */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Answer Gap Intelligence</h3>
                  <div className="text-2xl font-bold text-red-400">{analytics.agi.score}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">Missing Concepts:</div>
                  <div className="flex flex-wrap gap-2">
                    {analytics.agi.missing.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Weak Areas:</div>
                  <div className="flex flex-wrap gap-2">
                    {analytics.agi.weak.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* IRI */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Interview Robustness Index</h3>
                  <div className="text-2xl font-bold text-blue-400">{analytics.iri.score}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-semibold">{analytics.iri.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Consistency:</span>
                  <span className="text-green-400 font-semibold">{analytics.iri.consistency}</span>
                </div>
              </div>
            </div>

            {/* TAI */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Terminology Alignment</h3>
                  <div className="text-2xl font-bold text-purple-400">{analytics.tai.score}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Alignment:</span>
                  <span className="text-green-400 font-semibold">{analytics.tai.alignment}</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {analytics.tai.suggestions[0]}
                </div>
              </div>
            </div>

            {/* ACE */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Answer Compression</h3>
                  <div className="text-2xl font-bold text-green-400">{analytics.ace.score}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Efficiency:</span>
                  <span className="text-yellow-400 font-semibold">{analytics.ace.efficiency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Ratio:</span>
                  <span className="font-semibold">{analytics.ace.ratio}</span>
                </div>
              </div>
            </div>

            {/* EDD */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Expectation Drift</h3>
                  <div className="text-2xl font-bold text-orange-400">
                    {analytics.edd.detected ? 'Detected' : 'None'}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {analytics.edd.drift} semantic deviation detected
              </div>
            </div>

            {/* CLT */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Cognitive Latency</h3>
                  <div className="text-2xl font-bold text-cyan-400">Enabled</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                Thinking time separated from answer quality
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-black/30 rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Recommendations</h2>
            <div className="space-y-4">
              {[
                'Focus on database optimization concepts for backend roles',
                'Practice using industry-standard terminology',
                'Improve answer compression efficiency',
                'Strengthen understanding of API design patterns'
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-black/20 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
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


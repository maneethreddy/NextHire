import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplineOrb from '../components/3d/SplineOrb';
import { ArrowRight, CheckCircle2, Brain, TrendingUp, Target, Zap, FastForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo.png';
import '../styles/ProfileDropdown.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState('home');
  const [profileOpen, setProfileOpen] = useState(false);
  const [particles, setParticles] = useState([]);
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const generated = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 8,
    }));
    setParticles(generated);
  }, []);

  const features = [
    {
      icon: Brain,
      title: 'Answer Gap Intelligence',
      description: 'Concept-level analysis to identify missing or weak areas in your responses'
    },
    {
      icon: Target,
      title: 'Experience-Aware Evaluation',
      description: 'Evaluation calibrated to your experience level (Intern, Fresher, Junior)'
    },
    {
      icon: TrendingUp,
      title: 'Interview Robustness Index',
      description: 'Measures consistency and stability of your understanding under pressure'
    },
    {
      icon: Zap,
      title: 'Cognitive Latency Tolerance',
      description: 'Separates thinking time from answer quality - no penalty for reflection'
    }
  ];

  // Initials avatar helper
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleProfileClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      setProfileOpen((v) => !v);
    }
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#060010] text-white relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="login-orb login-orb-1 opacity-40" />
      <div className="login-orb login-orb-2 opacity-30" />
      <div className="login-orb login-orb-3 opacity-20" />

      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="login-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Grid overlay */}
      <div className="login-grid-overlay" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060010]/95 backdrop-blur-2xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-red-500/30 bg-black/20">
              <img src={Logo} alt="NextHire Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight">NextHire</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                setActiveNav('features');
                document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`nav-tab ${activeNav === 'features' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                setActiveNav('how-it-works');
                document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`nav-tab ${activeNav === 'how-it-works' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
            >
              How It Works
            </a>
            {/* ── Profile icon ── */}
            <div className="profile-wrapper" ref={profileRef}>
              <button
                className={`profile-avatar-btn ${user ? 'profile-avatar-btn-signed' : ''}`}
                onClick={handleProfileClick}
                aria-label={user ? 'Account menu' : 'Sign in'}
                id="profile-avatar-btn"
              >
                {user ? (
                  <span className="profile-initials">{getInitials(user.name)}</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
                {user && <span className="profile-online-dot" />}
              </button>

              {/* Dropdown */}
              {user && profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">
                      <span>{getInitials(user.name)}</span>
                    </div>
                    <div className="profile-dropdown-info">
                      <span className="profile-dropdown-name">{user.name}</span>
                      <span className="profile-dropdown-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); navigate('/configure'); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Start Interview
                  </button>
                  <button className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    My Profile
                  </button>
                  <div className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <h1 className="text-6xl font-bold mb-6 leading-tight">
                Master Your Technical
                <span className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent"> Interviews</span>
              </h1>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                AI-powered mock interviews with research-grade evaluation. Get personalized feedback on Answer Gap Intelligence,
                Interview Robustness Index, and more.
              </p>
              <button
                onClick={() => navigate('/configure')}
                className="start-interview-button-hero"
              >
                <span className="start-interview-text-hero">Start Interview</span>
                <div className="start-interview-icon-hero">
                  <FastForward className="w-6 h-6" fill="white" />
                </div>
              </button>
            </div>

            {/* Right - Spline Orb */}
            <div className="h-[750px] w-full">
              <SplineOrb />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">Advanced Evaluation Features</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Research-grade metrics for comprehensive interview analysis</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-8 bg-black/30 rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:translate-y-[-4px] hover:shadow-xl"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Get comprehensive interview feedback in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '1', title: 'Configure Your Interview', description: 'Select your experience level, job role, difficulty, and duration' },
              { step: '2', title: 'Practice in Real-Time', description: 'Answer technical questions with AI-powered follow-up probing' },
              { step: '3', title: 'Get Detailed Analytics', description: 'Receive comprehensive feedback with AGI, IRI, TAI, ACE, and EDD metrics' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-8 text-3xl font-bold shadow-lg shadow-red-500/30">
                  {item.step}
                </div>
                <h3 className="text-2xl font-semibold mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 bg-black/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Ace Your Next Interview?</h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of candidates improving their interview skills with NextHire
          </p>
          <button
            onClick={() => navigate('/configure')}
            className="start-interview-button-cta"
          >
            <span className="start-interview-text-cta">Start Interview</span>
            <div className="start-interview-icon-cta">
              <FastForward className="w-5 h-5" fill="white" />
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo.png';
import '../styles/LoginPage.css';
import '../styles/SignupPage.css';

export default function SignupPage() {
    const navigate = useNavigate();
    const { user, signup } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [shake, setShake] = useState(false);
    const [error, setError] = useState('');
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (user) navigate('/', { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        const generated = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            delay: Math.random() * 5,
            duration: Math.random() * 10 + 8,
        }));
        setParticles(generated);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password || !confirmPassword) {
            setShake(true);
            setTimeout(() => setShake(false), 600);
            setError('Please fill in all fields.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setShake(true);
            setTimeout(() => setShake(false), 600);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setShake(true);
            setTimeout(() => setShake(false), 600);
            return;
        }
        setIsLoading(true);
        await new Promise((res) => setTimeout(res, 900));
        const result = signup(name, email, password);
        setIsLoading(false);
        if (result.ok) {
            navigate('/', { replace: true });
        } else {
            setError(result.error);
            setShake(true);
            setTimeout(() => setShake(false), 600);
        }
    };

    const strengthScore = (pw) => {
        if (!pw) return 0;
        let s = 0;
        if (pw.length >= 6) s++;
        if (pw.length >= 10) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return s;
    };
    const score = strengthScore(password);
    const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][score] || '';
    const strengthColor = ['', '#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff'][score] || '#fff';

    return (
        <div className="login-root">
            <div className="login-orb login-orb-1" />
            <div className="login-orb login-orb-2" />
            <div className="login-orb login-orb-3" />

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
            <div className="login-grid-overlay" />

            <div className={`login-card signup-card ${shake ? 'login-card-shake' : ''}`}>
                {/* Brand */}
                <div className="login-brand">
                    <div className="login-logo">
                        <img src={Logo} alt="NextHire Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="login-brand-name">NextHire</span>
                </div>

                <div className="login-heading">
                    <h1 className="login-title">Create your account</h1>
                    <p className="login-subtitle">Start your AI-powered interview prep journey today</p>
                </div>

                {/* Social */}
                <div className="login-social-row">
                    <button className="login-social-btn" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 4.9c1.69 0 3.22.6 4.41 1.57L19.9 3A11.8 11.8 0 0 0 12 .1 11.94 11.94 0 0 0 1.36 7.09l3.91 2.67z" /><path fill="#34A853" d="M16.04 18.01A7.13 7.13 0 0 1 12 19.1a7.08 7.08 0 0 1-6.72-4.82L1.3 17.01A11.95 11.95 0 0 0 12 24.1c2.93 0 5.68-1.05 7.76-2.78l-3.72-3.31z" /><path fill="#FBBC05" d="M5.28 14.28A7 7 0 0 1 4.9 12c0-.8.14-1.56.38-2.28L1.36 7.09A11.9 11.9 0 0 0 .1 12c0 1.73.37 3.37 1.02 4.85l4.16-2.57z" /><path fill="#4285F4" d="M23.9 12c0-.84-.08-1.65-.22-2.43H12v4.8h6.66a5.7 5.7 0 0 1-2.5 3.6l3.72 3.31C21.83 19.28 23.9 15.93 23.9 12z" /></svg>
                        <span>Google</span>
                    </button>
                    <button className="login-social-btn" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.25c-3.34.72-4.04-1.41-4.04-1.41-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.72.08-.72 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" /></svg>
                        <span>GitHub</span>
                    </button>
                </div>

                <div className="login-divider">
                    <span className="login-divider-line" />
                    <span className="login-divider-text">or sign up with email</span>
                    <span className="login-divider-line" />
                </div>

                {error && (
                    <div className="login-error-banner">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    {/* Full name */}
                    <div className={`login-field ${focusedField === 'name' ? 'login-field-focused' : ''}`}>
                        <label htmlFor="signup-name" className="login-label">Full name</label>
                        <div className="login-input-wrap">
                            <span className="login-input-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <input
                                id="signup-name"
                                type="text"
                                className="login-input"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(''); }}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                                autoComplete="name"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className={`login-field ${focusedField === 'email' ? 'login-field-focused' : ''}`}>
                        <label htmlFor="signup-email" className="login-label">Email address</label>
                        <div className="login-input-wrap">
                            <span className="login-input-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                                </svg>
                            </span>
                            <input
                                id="signup-email"
                                type="email"
                                className="login-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className={`login-field ${focusedField === 'password' ? 'login-field-focused' : ''}`}>
                        <label htmlFor="signup-password" className="login-label">Password</label>
                        <div className="login-input-wrap">
                            <span className="login-input-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input
                                id="signup-password"
                                type={showPassword ? 'text' : 'password'}
                                className="login-input login-input-password"
                                placeholder="Min. 6 characters"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                autoComplete="new-password"
                            />
                            <button type="button" className="login-eye-btn" onClick={() => setShowPassword(v => !v)}>
                                {showPassword ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                        {/* Password strength */}
                        {password && (
                            <div className="signup-strength">
                                <div className="signup-strength-bars">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div
                                            key={i}
                                            className="signup-strength-bar"
                                            style={{ background: i <= score ? strengthColor : 'rgba(255,255,255,0.1)' }}
                                        />
                                    ))}
                                </div>
                                <span className="signup-strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className={`login-field ${focusedField === 'confirm' ? 'login-field-focused' : ''}`}>
                        <label htmlFor="signup-confirm" className="login-label">Confirm password</label>
                        <div className="login-input-wrap">
                            <span className="login-input-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12l2 2 4-4" /><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input
                                id="signup-confirm"
                                type={showConfirm ? 'text' : 'password'}
                                className={`login-input login-input-password ${confirmPassword && confirmPassword !== password ? 'signup-input-error' : ''} ${confirmPassword && confirmPassword === password ? 'signup-input-success' : ''}`}
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                onFocus={() => setFocusedField('confirm')}
                                onBlur={() => setFocusedField(null)}
                                autoComplete="new-password"
                            />
                            <button type="button" className="login-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                                {showConfirm ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Terms note */}
                    <p className="signup-terms">
                        By creating an account, you agree to our{' '}
                        <button type="button" className="login-signup-link">Terms of Service</button>{' '}
                        and{' '}
                        <button type="button" className="login-signup-link">Privacy Policy</button>.
                    </p>

                    {/* CTA */}
                    <button
                        type="submit"
                        id="signup-submit-btn"
                        className={`login-cta-btn ${isLoading ? 'login-cta-btn-loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="login-spinner" />
                                <span>Creating account…</span>
                            </>
                        ) : (
                            <>
                                <span>Create free account</span>
                                <span className="login-cta-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </span>
                            </>
                        )}
                    </button>
                </form>

                <p className="login-footer">
                    Already have an account?{' '}
                    <button type="button" className="login-signup-link" onClick={() => navigate('/login')}>
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
}

import { createContext, useContext, useState, useEffect } from 'react';

// Default account that always exists
const DEFAULT_USER = {
    email: 'test123@gmail.com',
    password: 'test123',
    name: 'Test User',
    avatar: null,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    // Load persisted session on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('nh_session');
            if (stored) setUser(JSON.parse(stored));
        } catch {
            /* ignore */
        }
    }, []);

    /** Returns { ok, error } */
    const login = (email, password) => {
        // Check default credentials
        const defaultMatch =
            email === DEFAULT_USER.email && password === DEFAULT_USER.password;

        if (defaultMatch) {
            const sessionUser = {
                email: DEFAULT_USER.email,
                name: DEFAULT_USER.name,
                avatar: null,
            };
            localStorage.setItem('nh_session', JSON.stringify(sessionUser));
            setUser(sessionUser);
            return { ok: true };
        }

        // Check registered accounts
        try {
            const accounts = JSON.parse(localStorage.getItem('nh_accounts') || '[]');
            const found = accounts.find(
                (a) => a.email === email && a.password === password
            );
            if (found) {
                const sessionUser = { email: found.email, name: found.name, avatar: null };
                localStorage.setItem('nh_session', JSON.stringify(sessionUser));
                setUser(sessionUser);
                return { ok: true };
            }
        } catch {
            /* ignore */
        }

        return { ok: false, error: 'Invalid email or password.' };
    };

    /** Returns { ok, error } */
    const signup = (name, email, password) => {
        if (email === DEFAULT_USER.email) {
            return { ok: false, error: 'Email already exists.' };
        }
        try {
            const accounts = JSON.parse(localStorage.getItem('nh_accounts') || '[]');
            if (accounts.find((a) => a.email === email)) {
                return { ok: false, error: 'Email already exists.' };
            }
            accounts.push({ name, email, password });
            localStorage.setItem('nh_accounts', JSON.stringify(accounts));
            const sessionUser = { email, name, avatar: null };
            localStorage.setItem('nh_session', JSON.stringify(sessionUser));
            setUser(sessionUser);
            return { ok: true };
        } catch {
            return { ok: false, error: 'Something went wrong.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('nh_session');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

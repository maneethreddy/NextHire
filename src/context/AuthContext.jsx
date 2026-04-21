import { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authInitialized, setAuthInitialized] = useState(false);

    useEffect(() => {
        if (!auth) {
            console.warn('Firebase Auth is not available. Skipping onAuthStateChanged.');
            setAuthInitialized(true);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName || 'User',
                    avatar: firebaseUser.photoURL || null,
                });
            } else {
                setUser(null);
            }
            setAuthInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    /** Returns { ok, error } */
    const login = async (email, password) => {
        if (!auth) return { ok: false, error: 'Auth system unavailable (check Firebase config).' };
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { ok: true };
        } catch (error) {
            let errorMsg = 'Invalid email or password.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMsg = 'Invalid email or password.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg = 'Too many attempts. Try again later.';
            } else {
                errorMsg = error.message;
            }
            return { ok: false, error: errorMsg };
        }
    };

    /** Returns { ok, error } */
    const signup = async (name, email, password) => {
        if (!auth) return { ok: false, error: 'Auth system unavailable (check Firebase config).' };
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Optionally set the display name right after signup
            if (userCredential.user) {
                await updateProfile(userCredential.user, { displayName: name });
                // Force an immediate local state update so the UI gets the name without a refresh
                setUser((prev) => prev ? { ...prev, name } : null);
            }
            return { ok: true };
        } catch (error) {
            let errorMsg = 'Something went wrong.';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'Email already exists. Please log in.';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Password is too weak. Must be at least 6 characters.';
            } else {
                errorMsg = error.message;
            }
            return { ok: false, error: errorMsg };
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    /** Real Google Login */
    const googleLogin = async () => {
        if (!auth || !googleProvider) {
            return { ok: false, error: 'Google Sign-In is unavailable (check Firebase config).' };
        }
        try {
            await signInWithPopup(auth, googleProvider);
            return { ok: true };
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                return { ok: false, error: 'Sign in was cancelled.' };
            }
            return { ok: false, error: error.message };
        }
    };

    // Don't render children until the first Firebase auth check finishes,
    // to prevent sudden redirects on initial load.
    if (!authInitialized) {
        return null; // Or a subtle loading spinner
    }

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, googleLogin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

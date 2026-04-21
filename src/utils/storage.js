import { db } from '../services/firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// ─────────────────────────────────────────────────
// ATTEMPTED QUESTIONS
// Path: users/{userId}/coreData/attemptedQuestions
// ─────────────────────────────────────────────────
export const getAttemptedQuestionIds = async (userId) => {
  if (!userId || !db) return [];
  try {
    const docRef = doc(db, 'users', userId, 'coreData', 'attemptedQuestions');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().ids || [];
    }
    return [];
  } catch (err) {
    console.error('getAttemptedQuestionIds error:', err);
    return [];
  }
};

export const setAttemptedQuestionIds = async (userId, ids) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'coreData', 'attemptedQuestions');
    await setDoc(docRef, { ids }, { merge: true });
  } catch (err) {
    console.error('setAttemptedQuestionIds error:', err);
  }
};

// ─────────────────────────────────────────────────
// INTERVIEW SESSIONS
// Path: users/{userId}/interviewSessions/{sessionId}
// ─────────────────────────────────────────────────
export const saveInterviewSession = async (userId, session) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'interviewSessions', session.id);
    await setDoc(docRef, session);
  } catch (err) {
    console.error('saveInterviewSession error:', err);
  }
};

export const updateInterviewSession = async (userId, sessionId, updates) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'interviewSessions', sessionId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.error('updateInterviewSession error:', err);
  }
};

/** Returns all sessions, sorted newest-first */
export const getAllInterviewSessions = async (userId) => {
  if (!userId || !db) return [];
  try {
    const colRef = collection(db, 'users', userId, 'interviewSessions');
    // For simplicity, we just fetch all and sort in memory like before to avoid requiring Firestore composite indexes initially
    const snapshot = await getDocs(colRef);
    const sessions = snapshot.docs.map((doc) => doc.data());
    
    return sessions.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.startedAt || 0).getTime();
      const dateB = new Date(b.completedAt || b.startedAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (err) {
    console.error('getAllInterviewSessions error:', err);
    return [];
  }
};

/** Fetch a single session by ID */
export const getInterviewSession = async (userId, sessionId) => {
  if (!userId || !db) return null;
  try {
    const docRef = doc(db, 'users', userId, 'interviewSessions', sessionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.error('getInterviewSession error:', err);
    return null;
  }
};

/** Delete a single session by ID */
export const deleteInterviewSession = async (userId, sessionId) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'interviewSessions', sessionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('deleteInterviewSession error:', err);
  }
};

// ─────────────────────────────────────────────────
// GENERATED QUESTION BANK
// Path: users/{userId}/coreData/questionBank
// ─────────────────────────────────────────────────
export const getGeneratedQuestionBank = async (userId) => {
  if (!userId || !db) return [];
  try {
    const docRef = doc(db, 'users', userId, 'coreData', 'questionBank');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().questions || [];
    }
    return [];
  } catch (err) {
    console.error('getGeneratedQuestionBank error:', err);
    return [];
  }
};

export const addGeneratedQuestions = async (userId, newQuestions) => {
  if (!userId || !db || !newQuestions?.length) return;
  try {
    const existing = await getGeneratedQuestionBank(userId);
    const byId = new Map(existing.map((q) => [q.questionId, q]));
    
    newQuestions.forEach((question) => {
      if (!byId.has(question.questionId)) {
        byId.set(question.questionId, question);
      }
    });

    const docRef = doc(db, 'users', userId, 'coreData', 'questionBank');
    await setDoc(docRef, { questions: Array.from(byId.values()) }, { merge: true });
  } catch (err) {
    console.error('addGeneratedQuestions error:', err);
  }
};

// ─────────────────────────────────────────────────
// BOOKMARKS
// Path: users/{userId}/bookmarks/{questionId}
// ─────────────────────────────────────────────────

export const getBookmarks = async (userId) => {
  if (!userId || !db) return [];
  try {
    const colRef = collection(db, 'users', userId, 'bookmarks');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((doc) => doc.data());
  } catch (err) {
    console.error('getBookmarks error:', err);
    return [];
  }
};

export const getBookmark = async (userId, questionId) => {
  if (!userId || !db) return null;
  try {
    const docRef = doc(db, 'users', userId, 'bookmarks', questionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.error('getBookmark error:', err);
    return null;
  }
};

/** Used internally, but generally we mutate documents specifically rather than overwrite all */
export const setBookmarks = async (userId, bookmarks) => {
  if (!userId || !db) return;
  try {
    // This isn't efficient in Firestore (overwriting the whole collection),
    // but we generally only update specific bookmark docs anyway via toggleBookmark.
    // If you need to set all bookmarks at once, iterate and setDoc each.
    for (const b of bookmarks) {
      const docRef = doc(db, 'users', userId, 'bookmarks', b.questionId);
      await setDoc(docRef, b);
    }
  } catch (err) {
    console.error('setBookmarks error:', err);
  }
};

/**
 * Toggle a bookmark entry on/off.
 * If properties exist, update. If not, create as isBookmarked=true.
 */
export const toggleBookmark = async (userId, entry) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'bookmarks', entry.questionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const current = docSnap.data();
      const updatedScore = entry.score ?? current.score;
      await updateDoc(docRef, {
        score: updatedScore,
        isBookmarked: !current.isBookmarked
      });
    } else {
      await setDoc(docRef, { ...entry, isBookmarked: true });
    }
  } catch (err) {
    console.error('toggleBookmark error:', err);
  }
};

/**
 * Auto-bookmark a question (called when score < 60).
 */
export const autoBookmark = async (userId, entry) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'bookmarks', entry.questionId);
    await setDoc(docRef, { ...entry, isBookmarked: true }, { merge: true });
  } catch (err) {
    console.error('autoBookmark error:', err);
  }
};

/** Update a bookmark's score after practice re-attempt */
export const updateBookmarkScore = async (userId, questionId, newScore) => {
  if (!userId || !db) return;
  try {
    const docRef = doc(db, 'users', userId, 'bookmarks', questionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const isBookmarked = newScore >= 70 ? false : docSnap.data().isBookmarked;
      await updateDoc(docRef, {
        score: newScore,
        isBookmarked
      });
    }
  } catch (err) {
    console.error('updateBookmarkScore error:', err);
  }
};

import { useState, useEffect } from 'react';
import { getBookmark, toggleBookmark } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

/**
 * Star bookmark toggle for a single question.
 *
 * @param {Object} props
 * @param {string}  props.questionId
 * @param {string}  props.questionText
 * @param {number}  props.score        0–100
 * @param {Function} [props.onToggle]  Optional callback(newIsBookmarked)
 */
const BookmarkToggle = ({ questionId, questionText, score, onToggle }) => {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [animating, setAnimating]       = useState(false);

  useEffect(() => {
    const fetchIt = async () => {
      if (!user?.uid || !questionId) return;
      const b = await getBookmark(user.uid, questionId);
      setIsBookmarked(b?.isBookmarked ?? false);
    };
    fetchIt();
  }, [user, questionId]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!user?.uid) return;
    setAnimating(true);
    
    // Optimistic update
    const next = !isBookmarked;
    setIsBookmarked(next);
    onToggle?.(next);
    
    // Background write
    await toggleBookmark(user.uid, { questionId, questionText, score, isBookmarked });
    
    setTimeout(() => setAnimating(false), 350);
  };

  return (
    <button
      onClick={handleToggle}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: '8px',
        transition: 'background 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        color: isBookmarked ? '#facc15' : '#6b7280',
        fontSize: '0.78rem',
        fontWeight: 600,
        transform: animating ? 'scale(1.3)' : 'scale(1)',
        transitionProperty: 'transform, color, background',
        transitionDuration: '0.25s',
      }}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
        {isBookmarked ? '⭐' : '☆'}
      </span>
      <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
  );
};

export default BookmarkToggle;

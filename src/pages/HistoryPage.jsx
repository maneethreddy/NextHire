import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkX, X } from 'lucide-react';
import { getBookmarks, toggleBookmark } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo.png';

const HistoryPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      setIsLoading(true);
      const bData = await getBookmarks(user.uid);
      setBookmarks(bData.filter(b => b.isBookmarked));
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const handleUnbookmark = async (questionId, e) => {
    e.stopPropagation();
    if (!user?.uid) return;
    
    // Optimistic UI update
    setBookmarks(prev => prev.filter(b => b.questionId !== questionId));
    
    // Background db sync
    try {
      await toggleBookmark(user.uid, { questionId, isBookmarked: false });
    } catch (error) {
      console.error('Failed to unbookmark:', error);
      // Revert if failed
      const bData = await getBookmarks(user.uid);
      setBookmarks(bData.filter(b => b.isBookmarked));
    }
  };

  return (
    <div className="min-h-screen bg-[#060010] text-white">
      {/* Background orbs */}
      <div className="login-orb login-orb-1 opacity-30" />
      <div className="login-orb login-orb-2 opacity-20" />

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
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <BookmarkX style={{ width: '40px', height: '40px', color: '#facc15' }} />
              <h1 className="text-5xl font-bold">Bookmarked Questions</h1>
            </div>
            <p className="text-xl text-gray-400">
              {bookmarks.length} question{bookmarks.length !== 1 ? 's' : ''} saved for practice
            </p>
          </div>

          {/* Empty state & Loading */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your bookmarks...</p>
            </div>
          ) : bookmarks.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '4rem 2rem',
              background: 'rgba(255,255,255,0.02)', borderRadius: '1.5rem',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Bookmarks Yet</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                Complete an interview and manually bookmark questions to practice them later.
              </p>
              <button
                onClick={() => navigate('/configure')}
                style={{
                  padding: '0.75rem 2rem', borderRadius: '0.75rem', border: 'none',
                  background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                  color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                }}
              >
                Start an Interview
              </button>
            </div>
          )}

          {/* Bookmarks Grid */}
          {bookmarks.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.25rem'
            }}>
              {bookmarks.map((b) => (
                <div key={b.questionId} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(250,204,21,0.2)',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 700, background: 'rgba(250,204,21,0.1)', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                      PREVIOUS SCORE: {Math.round(b.score)}/100
                    </span>
                    <button
                      onClick={(e) => handleUnbookmark(b.questionId, e)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#6b7280', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                      title="Remove Bookmark"
                    >
                      <X style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                  <p style={{ fontSize: '1rem', color: '#f3f4f6', lineHeight: 1.5, flex: 1 }}>{b.questionText}</p>
                  <button
                    onClick={() => navigate('/practice')}
                    style={{
                      padding: '0.65rem',
                      background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(249,115,22,0.15))',
                      border: '1px solid rgba(250,204,21,0.3)',
                      borderRadius: '0.75rem', color: '#facc15', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s', marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(250,204,21,0.25), rgba(249,115,22,0.25))'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(249,115,22,0.15))'; }}
                  >
                    Practice Weak Areas →
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HistoryPage;

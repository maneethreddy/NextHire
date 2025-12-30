import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, User, Gauge, Clock, FastForward } from 'lucide-react';

const ConfigurePage = () => {
  const navigate = useNavigate();
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');

  const experienceLevels = [
    { id: 'intern', label: 'Intern', desc: 'Entry level questions', years: 'Starting out' },
    { id: 'fresher', label: 'Fresher', desc: 'Graduate level depth', years: '0-1 year' },
    { id: 'junior', label: 'Junior', desc: 'Foundational concepts', years: '1-2 years' },
    { id: 'mid', label: 'Mid-Level', desc: 'Practical experience', years: '3-5 years' },
  ];

  const jobRoles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Engineer',
    'Software Engineer',
  ];

  const difficultyLevels = [
    { id: 'easy', label: 'Easy', desc: 'Fundamental concepts' },
    { id: 'medium', label: 'Medium', desc: 'Intermediate complexity' },
    { id: 'hard', label: 'Hard', desc: 'Advanced problems' },
  ];

  const durations = [
    { id: '15', label: '15 minutes', desc: 'Quick practice session' },
    { id: '30', label: '30 minutes', desc: 'Comprehensive interview' },
    { id: '45', label: '45 minutes', desc: 'Deep-dive session' },
  ];

  const handleStart = () => {
    if (selectedExperience && selectedRole && selectedDifficulty && selectedDuration) {
      const config = {
        experienceLevel: experienceLevels.find(e => e.id === selectedExperience)?.label || selectedExperience,
        jobPosition: selectedRole,
        difficulty: difficultyLevels.find(d => d.id === selectedDifficulty)?.label || selectedDifficulty,
        duration: durations.find(d => d.id === selectedDuration)?.label || selectedDuration,
      };
      navigate('/interview', { state: { config } });
    }
  };

  const isComplete = selectedExperience && selectedRole && selectedDifficulty && selectedDuration;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="back-button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center">
              <FastForward className="w-5 h-5 fill-white" />
            </div>
            <span className="text-xl font-bold">NextHire</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-[976px] mx-auto">
          {/* Title Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">Configure Your Interview</h1>
            <p className="text-gray-400 text-lg">Customize your mock interview experience</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {[selectedExperience, selectedRole, selectedDifficulty, selectedDuration].map((val, i) => (
              <div
                key={i}
                className={`h-1.5 w-16 rounded-full transition-all duration-300 ${
                  val ? 'bg-gradient-to-r from-pink-500 to-red-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Experience Level */}
          <section className="experience-section">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper-pink">
                <User className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Experience Level</h2>
                <p className="text-gray-400 text-sm">Select your current experience level</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {experienceLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedExperience(level.id)}
                  className={`experience-button ${selectedExperience === level.id ? 'active' : ''}`}
                >
                  <div className="button-title">{level.label}</div>
                  <div className="button-description">{level.desc}</div>
                  <div className="button-meta">{level.years}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Job Position */}
          <section className="job-section">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper-pink">
                <Briefcase className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Job Position</h2>
                <p className="text-gray-400 text-sm">Choose your target role</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {jobRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`role-button ${selectedRole === role ? 'active' : ''}`}
                >
                  <div className="button-title">{role}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Difficulty Level */}
          <section className="difficulty-section">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper-pink">
                <Gauge className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Difficulty Level</h2>
                <p className="text-gray-400 text-sm">Set the complexity of questions</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {difficultyLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedDifficulty(level.id)}
                  className={`difficulty-button ${selectedDifficulty === level.id ? 'active' : ''}`}
                >
                  <div className="button-title">{level.label}</div>
                  <div className="button-description">{level.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Interview Duration */}
          <section className="duration-section">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper-pink">
                <Clock className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Interview Duration</h2>
                <p className="text-gray-400 text-sm">Choose your session length</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {durations.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => setSelectedDuration(duration.id)}
                  className={`duration-button ${selectedDuration === duration.id ? 'active' : ''}`}
                >
                  <div className="button-title">{duration.label}</div>
                  <div className="button-description">{duration.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Start Button */}
          <div className="start-button-wrapper">
            <button
              onClick={handleStart}
              disabled={!isComplete}
              className={`start-button ${isComplete ? 'enabled' : 'disabled'}`}
            >
              <span>Start Interview</span>
              <FastForward className="w-5 h-5" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurePage;

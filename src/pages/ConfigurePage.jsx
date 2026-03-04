import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, User, Gauge, Clock, FastForward, FileText, CheckCircle, GraduationCap, Award } from 'lucide-react';
import { experienceLevels, jobRoles, difficultyLevels, durations } from '../utils/configure';
import { listGeminiModels } from '../utils/geminiModels';
import { extractResumeInsights } from '../utils/geminiResume';
import Logo from '../assets/Logo.png';

const ConfigurePage = () => {
  const navigate = useNavigate();
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isListingModels, setIsListingModels] = useState(false);
  const [modelList, setModelList] = useState([]);
  const [modelError, setModelError] = useState('');

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeError('');
    setResumeFileName(file.name);
    setResumeFile(file);
    setResumeData(null);
  };

  const handleAnalyzeResume = async () => {
    if (!resumeFile) return;
    setIsParsing(true);
    setResumeError('');
    try {
      const data = await extractResumeInsights(resumeFile);
      setResumeData(data);
    } catch (error) {
      setResumeError(error.message || 'Failed to extract resume insights.');
      setResumeData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleListModels = async () => {
    setIsListingModels(true);
    setModelError('');
    try {
      const models = await listGeminiModels();
      setModelList(models);
    } catch (error) {
      setModelError(error.message || 'Failed to list Gemini models.');
      setModelList([]);
    } finally {
      setIsListingModels(false);
    }
  };

  const handleStart = () => {
    if (selectedExperience && selectedRole && selectedDifficulty && selectedDuration) {
      const config = {
        experienceLevel: experienceLevels.find(e => e.id === selectedExperience)?.label || selectedExperience,
        jobPosition: selectedRole,
        difficulty: difficultyLevels.find(d => d.id === selectedDifficulty)?.label || selectedDifficulty,
        duration: durations.find(d => d.id === selectedDuration)?.label || selectedDuration,
        resumeData: resumeData || null,
        resumeFile: resumeFile || null,
        resumeFileName: resumeFileName || null
      };
      navigate('/interview', { state: { config } });
    }
  };

  const isComplete = selectedExperience && selectedRole && selectedDifficulty && selectedDuration;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="configure-navbar">
        <button onClick={() => navigate('/')} className="back-button">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="configure-workspace">

        {/* Common centered header */}
        <div className="configure-page-header">
          <h1>Configure Your Interview</h1>
          <p>Customize your mock interview experience</p>
          <div className="configure-progress">
            {[selectedExperience, selectedRole, selectedDifficulty, selectedDuration].map((val, i) => (
              <div key={i} className={`configure-progress-dot ${val ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="configure-grid">

          {/* ── LEFT COLUMN: control panel card ── */}
          <div className="configure-column">
            <div className="configure-card">

              {/* Resume Upload */}
              <section className="configure-form-section">
                <div className="configure-section-header">
                  <div className="icon-wrapper-purple">
                    <Briefcase className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="configure-section-title">Upload Resume</h2>
                    <p className="configure-section-sub">PDF or DOCX for resume-based questions</p>
                  </div>
                </div>
                <div className="resume-upload-card">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    className="resume-input"
                  />
                  <div className="resume-meta">
                    <div className="text-sm text-gray-400">
                      {isParsing ? 'Parsing resume...' : resumeFileName || 'No file selected'}
                    </div>
                    {resumeError && <div className="resume-error">{resumeError}</div>}
                  </div>
                </div>
                {resumeFileName && !resumeData && !isParsing && (
                  <div className="mt-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
                    Click <span className="text-white font-medium">"Analyze My Resume"</span> on the right to extract your details.
                  </div>
                )}
              </section>

              {/* Experience Level */}
              <section className="configure-form-section">
                <div className="configure-section-header">
                  <div className="icon-wrapper-pink">
                    <User className="w-4 h-4 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="configure-section-title">Experience Level</h2>
                    <p className="configure-section-sub">Select your current experience level</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setSelectedExperience(level.id)}
                      className={`experience-button ${selectedExperience === level.id ? 'active' : ''}`}
                    >
                      <div className="button-title pb-1">{level.label}</div>
                      <div className="button-description text-xs">{level.desc}</div>
                      <div className="button-meta text-xs mt-1">{level.years}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Job Position */}
              <section className="configure-form-section">
                <div className="configure-section-header">
                  <div className="icon-wrapper-pink">
                    <Briefcase className="w-4 h-4 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="configure-section-title">Job Position</h2>
                    <p className="configure-section-sub">Choose your target role</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {jobRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`role-button ${selectedRole === role ? 'active' : ''}`}
                    >
                      <div className="button-title text-sm">{role}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Difficulty Level */}
              <section className="configure-form-section">
                <div className="configure-section-header">
                  <div className="icon-wrapper-pink">
                    <Gauge className="w-4 h-4 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="configure-section-title">Difficulty Level</h2>
                    <p className="configure-section-sub">Set the complexity of questions</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setSelectedDifficulty(level.id)}
                      className={`difficulty-button ${selectedDifficulty === level.id ? 'active' : ''}`}
                    >
                      <div className="button-title text-sm pb-1">{level.label}</div>
                      <div className="button-description text-xs">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Interview Duration */}
              <section className="configure-form-section">
                <div className="configure-section-header">
                  <div className="icon-wrapper-pink">
                    <Clock className="w-4 h-4 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="configure-section-title">Interview Duration</h2>
                    <p className="configure-section-sub">Choose your session length</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {durations.map((duration) => (
                    <button
                      key={duration.id}
                      onClick={() => setSelectedDuration(duration.id)}
                      className={`duration-button ${selectedDuration === duration.id ? 'active' : ''}`}
                    >
                      <div className="button-title text-sm pb-1">{duration.label}</div>
                      <div className="button-description text-xs">{duration.desc}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Start Button */}
              <div className="start-button-wrapper">
                <button
                  onClick={handleStart}
                  disabled={!isComplete}
                  className={`start-button ${isComplete ? 'enabled' : 'disabled'} w-full flex justify-center py-4`}
                >
                  <span className="text-xl">Start Interview</span>
                  <FastForward className="w-5 h-5 ml-2" fill="currentColor" />
                </button>
              </div>

            </div>
          </div>

          {/* ── RIGHT COLUMN: live preview ── */}
          <div className="preview-column">
            <div className="resume-analyzer-panel">
              {!resumeFile ? (
                <div className="resume-analyzer-empty">
                  <FileText />
                  <p>Resume preview will appear here</p>
                  <p className="text-sm mt-2 text-gray-500">Upload a file to see the preview</p>
                </div>
              ) : isParsing ? (
                <div className="resume-analyzer-empty">
                  <div className="content-spinner mb-4" />
                  <p>Analyzing resume...</p>
                </div>
              ) : resumeData ? (
                <div className="resume-analyzer-content fade-in">
                  <div className="analyzer-section">
                    <div className="analyzer-name">{resumeData.name}</div>
                    <div className="analyzer-role">{resumeData.role}</div>
                    {resumeData.summary && (
                      <div className="analyzer-summary">{resumeData.summary}</div>
                    )}
                  </div>

                  {resumeData.experience?.length > 0 && (
                    <div className="analyzer-section">
                      <div className="analyzer-heading">
                        <Briefcase className="w-4 h-4" /> Work Experience
                      </div>
                      {resumeData.experience.map((exp, i) => (
                        <div key={i} className="analyzer-experience-item">
                          <div className="analyzer-exp-role">{exp.role}</div>
                          <div className="analyzer-exp-company">{exp.company}{exp.duration ? ` • ${exp.duration}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {resumeData.highlights?.length > 0 && (
                    <div className="analyzer-section">
                      <div className="analyzer-heading">
                        <Award className="w-4 h-4" /> Key Highlights
                      </div>
                      {resumeData.highlights.map((item, i) => (
                        <div key={i} className="analyzer-highlight">{item}</div>
                      ))}
                    </div>
                  )}

                  {resumeData.skills?.length > 0 && (
                    <div className="analyzer-section">
                      <div className="analyzer-heading">
                        <CheckCircle className="w-4 h-4" /> Skills
                      </div>
                      <div className="analyzer-skills">{resumeData.skills.join(', ')}</div>
                    </div>
                  )}

                  {resumeData.education?.length > 0 && (
                    <div className="analyzer-section">
                      <div className="analyzer-heading">
                        <GraduationCap className="w-4 h-4" /> Education
                      </div>
                      {resumeData.education.map((edu, i) => (
                        <div key={i} className="analyzer-education-item">
                          <div className="font-medium text-white">{edu.degree}</div>
                          <div className="text-gray-400">{edu.institution}{edu.duration ? ` • ${edu.duration}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="resume-analyzer-empty">
                  <FileText />
                  <p>Resume preview will appear here</p>
                  <p className="text-sm mt-2 mb-4 text-gray-400">Upload a file and click Analyze My Resume to see the preview</p>
                  <button onClick={handleAnalyzeResume} className="analyzer-btn">
                    Analyze My Resume
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ConfigurePage;

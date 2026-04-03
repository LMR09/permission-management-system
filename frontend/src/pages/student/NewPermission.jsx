// src/pages/student/NewPermission.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './NewPermission.css';

// ── AI Letter Generator (template-based, free) ────────────────
const generateLetter = ({ studentName, rollNumber, branch, section, reason, eventName, fromDate, toDate, additionalDetails }) => {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const dayCount = Math.ceil(
    (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
  ) + 1;

  const durationText = dayCount === 1
    ? `on ${formatDate(fromDate)}`
    : `from ${formatDate(fromDate)} to ${formatDate(toDate)} (${dayCount} days)`;

  return `Date: ${today}

To,
The Class Coordinator,
Department of ${branch},
Vignan's Institute of Information Technology,
Duvvada, Visakhapatnam, Andhra Pradesh.

Subject: Permission Request for ${eventName || reason}

Respected Sir/Madam,

I, ${studentName}, Roll Number ${rollNumber}, a student of ${branch}, Section ${section}, am writing to respectfully request your kind permission to ${reason.toLowerCase()} ${durationText}.

${additionalDetails
  ? `${additionalDetails}\n\n`
  : ''}I kindly request you to grant me the necessary permission for the above-mentioned purpose. I assure you that I will cover all missed coursework and maintain my academic responsibilities without any compromise.

I am submitting this request in advance and hope for your kind consideration and approval.

Thanking you,

Yours faithfully,
${studentName}
Roll Number: ${rollNumber}
${branch} – Section ${section}`;
};

// ── Step Indicator ────────────────────────────────────────────
const StepIndicator = ({ current }) => {
  const steps = ['Details', 'Write Letter', 'Attachment', 'Review'];
  return (
    <div className="step-indicator">
      {steps.map((label, i) => (
        <div key={i} className={`step-item ${i + 1 === current ? 'active' : i + 1 < current ? 'done' : ''}`}>
          <div className="step-circle">{i + 1 < current ? '✓' : i + 1}</div>
          <div className="step-label">{label}</div>
          {i < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const NewPermission = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [details, setDetails] = useState({
    subject: '',
    eventName: '',
    reason: '',
    fromDate: '',
    toDate: '',
    periodsAffected: ''
  });
  const [letterType, setLetterType] = useState('');  // 'ai' or 'manual'
  const [letterContent, setLetterContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [attachment, setAttachment] = useState({ type: 'none', url: '' });

  // ── Step 1: Permission Details ──
  const handleDetailsNext = () => {
    if (!details.subject || !details.reason || !details.fromDate || !details.toDate) {
      toast.error('Please fill Subject, Reason, From Date and To Date');
      return;
    }
    if (new Date(details.toDate) < new Date(details.fromDate)) {
      toast.error('To Date cannot be before From Date');
      return;
    }
    setStep(2);
  };

  // ── Step 2: Letter Writing ──
  const handleGenerateLetter = () => {
    setGenerating(true);
    setTimeout(() => {
      const letter = generateLetter({
        studentName:       user.name,
        rollNumber:        user.roll_number,
        branch:            user.branch_name,
        section:           user.section_name,
        reason:            details.reason,
        eventName:         details.eventName,
        fromDate:          details.fromDate,
        toDate:            details.toDate,
        additionalDetails: details.additionalDetails
      });
      setLetterContent(letter);
      setGenerating(false);
      toast.success('Letter generated! You can edit it below.');
    }, 900);
  };

  const handleLetterNext = () => {
    if (!letterType) {
      toast.error('Please choose AI Generated or Write Manually');
      return;
    }
    if (!letterContent.trim()) {
      toast.error('Letter content cannot be empty');
      return;
    }
    setStep(3);
  };

  // ── Step 4: Submit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        subject:          details.subject,
        event_name:       details.eventName,
        reason_summary:   details.reason,
        from_date:        details.fromDate,
        to_date:          details.toDate,
        periods_affected: details.periodsAffected,
        letter_type:      letterType,
        letter_content:   letterContent,
        attachment_type:  attachment.type,
        attachment_url:   attachment.url || null
      };

      const res = await api.post('/student/permissions', payload);
      if (res.data.success) {
        toast.success('Permission submitted successfully!');
        navigate('/student/my-permissions');
      } else {
        toast.error(res.data.message || 'Submission failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting permission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Permission Request</h1>
        <p className="page-subtitle">Submit a permission request to your Class Coordinator</p>
      </div>

      <div className="card new-permission-card">
        <StepIndicator current={step} />

        {/* ── STEP 1: Details ── */}
        {step === 1 && (
          <div className="step-content">
            <h3 className="step-heading">Permission Details</h3>
            <p className="step-desc">Fill in the basic details of your permission request</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Subject / Title *</label>
                <input
                  className="form-control"
                  placeholder="e.g. Permission to attend Tech Fest"
                  value={details.subject}
                  onChange={e => setDetails(p => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Event Name (optional)</label>
                <input
                  className="form-control"
                  placeholder="e.g. HackVignan 2025"
                  value={details.eventName}
                  onChange={e => setDetails(p => ({ ...p, eventName: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Purpose *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Describe the reason for permission clearly..."
                value={details.reason}
                onChange={e => setDetails(p => ({ ...p, reason: e.target.value }))}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={details.fromDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDetails(p => ({ ...p, fromDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">To Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={details.toDate}
                  min={details.fromDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setDetails(p => ({ ...p, toDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Periods Affected (optional)</label>
              <input
                className="form-control"
                placeholder="e.g. 3, 4, 5  (period numbers)"
                value={details.periodsAffected}
                onChange={e => setDetails(p => ({ ...p, periodsAffected: e.target.value }))}
              />
              <small className="form-hint">Mention which class periods will be missed</small>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Details (optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Any extra information you want to mention..."
                value={details.additionalDetails}
                onChange={e => setDetails(p => ({ ...p, additionalDetails: e.target.value }))}
              />
            </div>

            <div className="step-actions">
              <button className="btn btn-ghost" onClick={() => navigate('/student/dashboard')}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleDetailsNext}>
                Next: Write Letter →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Letter ── */}
        {step === 2 && (
          <div className="step-content">
            <h3 className="step-heading">Write Permission Letter</h3>
            <p className="step-desc">Choose how you want to write your letter</p>

            {!letterType && (
              <div className="letter-choice-grid">
                <button
                  className="letter-choice-card"
                  onClick={() => { setLetterType('ai'); handleGenerateLetter(); }}
                >
                  <div className="choice-icon">🤖</div>
                  <h4>Generate with AI</h4>
                  <p>Auto-generate a formal letter based on your details. You can edit it after.</p>
                  <span className="choice-badge">Recommended</span>
                </button>
                <button
                  className="letter-choice-card"
                  onClick={() => { setLetterType('manual'); setLetterContent(''); }}
                >
                  <div className="choice-icon">✍️</div>
                  <h4>Write Manually</h4>
                  <p>Write your own letter in your own words with full freedom.</p>
                </button>
              </div>
            )}

            {letterType && (
              <>
                <div className="letter-type-bar">
                  <span className={`letter-type-tag ${letterType}`}>
                    {letterType === 'ai' ? '🤖 AI Generated' : '✍️ Manual'}
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                    onClick={() => { setLetterType(''); setLetterContent(''); }}
                  >
                    Change
                  </button>
                </div>

                {generating ? (
                  <div className="generating-state">
                    <div className="spinner" />
                    <p>Generating your formal letter...</p>
                  </div>
                ) : (
                  <>
                    <textarea
                      className="form-control letter-textarea"
                      rows={16}
                      value={letterContent}
                      onChange={e => setLetterContent(e.target.value)}
                      placeholder={letterType === 'manual'
                        ? 'Write your permission letter here...\n\nStart with:\nDate:\n\nTo,\nThe Class Coordinator...'
                        : ''}
                    />
                    {letterType === 'ai' && (
                      <small className="form-hint">
                        ✏️ You can freely edit the generated letter above before submitting
                      </small>
                    )}
                  </>
                )}
              </>
            )}

            <div className="step-actions">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              {letterType && (
                <button className="btn btn-primary" onClick={handleLetterNext} disabled={generating}>
                  Next: Attachment →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Attachment ── */}
        {step === 3 && (
          <div className="step-content">
            <h3 className="step-heading">Attach Proof (Optional)</h3>
            <p className="step-desc">
              Upload supporting documents. This is optional but recommended for events.
            </p>

            <div className="attachment-options">
              <label className="attachment-option">
                <input
                  type="radio"
                  name="att"
                  value="none"
                  checked={attachment.type === 'none'}
                  onChange={() => setAttachment({ type: 'none', url: '' })}
                />
                <div className="att-content">
                  <span className="att-icon">🚫</span>
                  <div>
                    <strong>No Attachment</strong>
                    <p>Skip this step</p>
                  </div>
                </div>
              </label>

              <label className="attachment-option">
                <input
                  type="radio"
                  name="att"
                  value="drive_link"
                  checked={attachment.type === 'drive_link'}
                  onChange={() => setAttachment({ type: 'drive_link', url: '' })}
                />
                <div className="att-content">
                  <span className="att-icon">🔗</span>
                  <div>
                    <strong>Google Drive Link</strong>
                    <p>Share a link to your document</p>
                  </div>
                </div>
              </label>
            </div>

            {attachment.type === 'drive_link' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Google Drive Link</label>
                <input
                  className="form-control"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={attachment.url}
                  onChange={e => setAttachment(p => ({ ...p, url: e.target.value }))}
                />
                <small className="form-hint">
                  Make sure the link is set to "Anyone with link can view"
                </small>
              </div>
            )}

            <div className="step-actions">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={() => {
                if (attachment.type === 'drive_link' && !attachment.url) {
                  toast.error('Please paste your Drive link or choose No Attachment');
                  return;
                }
                setStep(4);
              }}>
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Submit ── */}
        {step === 4 && (
          <div className="step-content">
            <h3 className="step-heading">Review & Submit</h3>
            <p className="step-desc">Please review everything before submitting to your Coordinator</p>

            <div className="review-section">
              <div className="review-row">
                <span className="review-label">Subject</span>
                <span className="review-value">{details.subject}</span>
              </div>
              {details.eventName && (
                <div className="review-row">
                  <span className="review-label">Event</span>
                  <span className="review-value">{details.eventName}</span>
                </div>
              )}
              <div className="review-row">
                <span className="review-label">Reason</span>
                <span className="review-value">{details.reason}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Duration</span>
                <span className="review-value">{details.fromDate} → {details.toDate}</span>
              </div>
              {details.periodsAffected && (
                <div className="review-row">
                  <span className="review-label">Periods</span>
                  <span className="review-value">{details.periodsAffected}</span>
                </div>
              )}
              <div className="review-row">
                <span className="review-label">Letter Type</span>
                <span className="review-value">
                  {letterType === 'ai' ? '🤖 AI Generated' : '✍️ Manually Written'}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Attachment</span>
                <span className="review-value">
                  {attachment.type === 'none' ? 'None' :
                   attachment.type === 'drive_link' ? '🔗 Google Drive Link' : 'File Uploaded'}
                </span>
              </div>
            </div>

            <div className="review-letter">
              <h4>Letter Preview</h4>
              <pre className="letter-preview">{letterContent}</pre>
            </div>

            <div className="submit-note">
              ℹ️ Once submitted, this will go to your <strong>Class Coordinator</strong>.
              You can only edit it if the Coordinator sends it back to you.
            </div>

            <div className="step-actions">
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : '✅ Submit Permission'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewPermission;

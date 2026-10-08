import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, CheckCircle2, RefreshCw, Calendar, ArrowRight, Zap, Shield, Plus, Trash2, AlertCircle } from 'lucide-react';
import { getScheduledJobs, createScheduledJob, pauseScheduledJob, resumeScheduledJob, cancelScheduledJob } from '../lib/api';

export default function ScheduledRunsView({ onOpenTracks, onOpenOutreach }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // New Job Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('Weekly Venture Autopilot');
  const [newTrack, setNewTrack] = useState('venture');
  const [newBatchSize, setNewBatchSize] = useState(25);
  const [newBrief, setNewBrief] = useState('Seed AI and B2B SaaS software companies in the US');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getScheduledJobs();
      setJobs(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load scheduled jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(() => {
      getScheduledJobs().then((data) => {
        if (data) setJobs(data);
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateJob = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || !newBrief.trim()) return;

    setActionLoading(true);
    try {
      const payload = {
        name: newTitle.trim(),
        query: newBrief.trim(),
        track: newTrack,
        batch_size: parseInt(newBatchSize, 10),
        cadence_cron: '0 9 * * 1'
      };
      await createScheduledJob(payload);
      showToast('Scheduled autopilot job created! In-process worker will poll on cadence.');
      setShowCreateForm(false);
      loadJobs();
    } catch (err) {
      alert(err.message || 'Failed to create job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = async (job) => {
    setActionLoading(true);
    try {
      if (job.status === 'active') {
        await pauseScheduledJob(job.id);
        showToast('Autopilot job paused.');
      } else {
        await resumeScheduledJob(job.id);
        showToast('Autopilot job resumed.');
      }
      loadJobs();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (jobId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled autopilot job?')) return;
    setActionLoading(true);
    try {
      await cancelScheduledJob(jobId);
      showToast('Job cancelled.');
      loadJobs();
    } catch (err) {
      alert(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 200,
          background: 'rgba(20, 20, 20, 0.95)',
          border: '1px solid #4ade80',
          borderRadius: '8px',
          padding: '12px 20px',
          color: '#4ade80',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)'
        }}>
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div style={{
        background: 'rgba(20,20,20,0.65)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#e2b774' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Scheduled Autopilot Engine
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Real background worker polling <code>scheduled_jobs</code>. Discovers fresh deduplicated leads and queues them for your review. Zero automatic Sparks deductions.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                background: showCreateForm ? 'rgba(255,255,255,0.1)' : '#ffffff',
                color: showCreateForm ? '#ffffff' : '#000000',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={13} />
              <span>{showCreateForm ? 'Close Form' : 'New Schedule'}</span>
            </button>

            <button
              onClick={loadJobs}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '20px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateJob}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(226, 183, 116, 0.3)',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '24px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2b774', marginBottom: '14px' }}>
              Create Scheduled Autopilot Job
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                  Job Name
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                  Target Track
                </label>
                <select
                  value={newTrack}
                  onChange={(e) => setNewTrack(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                >
                  <option value="venture" style={{ background: '#111' }}>Venture Track</option>
                  <option value="real_estate" style={{ background: '#111' }}>Real Estate Track</option>
                  <option value="lp" style={{ background: '#111' }}>Fund LP Track</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                Search Query / Thesis Brief
              </label>
              <textarea
                rows={2}
                value={newBrief}
                onChange={(e) => setNewBrief(e.target.value)}
                placeholder="Describe stage, sector, and location criteria..."
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                <span>Batch Size:</span>
                {[10, 25, 50].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setNewBatchSize(sz)}
                    style={{
                      background: newBatchSize === sz ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: newBatchSize === sz ? '#000000' : 'rgba(255,255,255,0.6)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {sz} leads
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Saving...' : 'Start Autopilot'}
              </button>
            </div>
          </form>
        )}

        {/* Jobs List */}
        {loading && jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Loading autopilot schedules...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Calendar size={28} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Active Autopilot Jobs</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              Click <strong>New Schedule</strong> above to start receiving fresh weekly investor targets.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {jobs.map((job) => {
              const isActive = job.status === 'active';
              return (
                <div
                  key={job.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                          {job.name || 'Scheduled Job'}
                        </span>
                        <span style={{
                          fontSize: '10.5px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isActive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                          color: isActive ? '#4ade80' : '#f87171'
                        }}>
                          {job.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                        {job.query}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleTogglePause(job)}
                        disabled={actionLoading}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {isActive ? <Pause size={12} /> : <Play size={12} />}
                        <span>{isActive ? 'Pause' : 'Resume'}</span>
                      </button>

                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={actionLoading}
                        style={{
                          background: 'rgba(248,113,113,0.08)',
                          border: '1px solid rgba(248,113,113,0.2)',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11.5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '6px',
                    fontSize: '11.5px'
                  }}>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>Track</span>
                      <strong style={{ color: '#ffffff' }}>{(job.track || 'venture').toUpperCase()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>Batch Size</span>
                      <strong style={{ color: '#ffffff' }}>{job.batch_size || 25} leads</strong>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>Last Run</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {job.last_run_at ? new Date(job.last_run_at).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>Cadence</span>
                      <span style={{ color: '#e2b774' }}>Weekly (09:00 UTC)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

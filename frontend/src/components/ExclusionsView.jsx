import React, { useState, useEffect } from 'react';
import { Ban, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { getExclusions, addExclusion, removeExclusion } from '../lib/api';

export default function ExclusionsView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [entityType, setEntityType] = useState('firm');
  const [entityValue, setEntityValue] = useState('');
  const [reason, setReason] = useState('');

  const loadExclusions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getExclusions();
      setItems(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load exclusions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExclusions();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!entityValue.trim()) return;
    setSaving(true);
    try {
      await addExclusion({
        entity_type: entityType,
        entity_value: entityValue.trim(),
        reason: reason.trim() || undefined
      });
      setEntityValue('');
      setReason('');
      setShowAddForm(false);
      loadExclusions();
    } catch (err) {
      setError(err.message || 'Failed to add exclusion');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeExclusion(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to remove exclusion');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      <div style={{
        background: 'rgba(20,20,20,0.65)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ban size={18} style={{ color: '#f87171' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Exclusion & Deduplication Lists
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Entities and domains on this list are automatically omitted from all searches, automated matches, and scheduled runs.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={loadExclusions}
              disabled={loading}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                color: '#000000',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={14} />
              Add Exclusion
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
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

        {showAddForm && (
          <form onSubmit={handleAdd} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              Add Entity to Exclusion List
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Type
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    background: '#111111',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="firm">Firm Name</option>
                  <option value="person">Individual Partner</option>
                  <option value="domain">Email Domain (@firm.com)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Value / Name
                </label>
                <input
                  type="text"
                  placeholder={entityType === 'domain' ? 'examplevc.com' : entityType === 'firm' ? 'Firm Name' : 'Full Name'}
                  value={entityValue}
                  onChange={(e) => setEntityValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Existing competitor in portfolio, past pass on Series A"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12.5px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  background: '#f87171',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Adding...' : 'Add Exclusion'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Loading exclusions...
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <Ban size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Exclusions Set</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0' }}>
              Add investor firms, competitive funds, or individual partners here to suppress them from discovery and campaigns.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(248,113,113,0.12)',
                    color: '#f87171',
                    fontWeight: 600
                  }}>
                    {item.entity_type}
                  </span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>{item.entity_value}</strong>
                    {item.reason && (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '10px' }}>
                        · {item.reason}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                  title="Remove exclusion"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { getMemoryItems, addMemoryItem, deleteMemoryItem } from '../lib/api';

export default function MemoryView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New item form
  const [segmentTag, setSegmentTag] = useState('');
  const [replySignal, setReplySignal] = useState('preference');
  const [biasWeight, setBiasWeight] = useState(1.2);
  const [notes, setNotes] = useState('');

  const loadMemory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMemoryItems();
      setItems(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load memory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!segmentTag.trim()) return;
    setSaving(true);
    try {
      await addMemoryItem({
        segment_tag: segmentTag.trim(),
        reply_signal: replySignal,
        bias_weight: parseFloat(biasWeight),
        notes: notes.trim() || undefined
      });
      setSegmentTag('');
      setNotes('');
      setShowAddForm(false);
      loadMemory();
    } catch (err) {
      setError(err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMemoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete item');
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
              <Brain size={18} style={{ color: '#e2b774' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                ADDY Targeting Memory & Learnings
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Persistent thesis memory, investor feedback biases, and negative preferences that dynamically refine investor scoring.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={loadMemory}
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
              Add Preference
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

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              Add Targeting Preference or Bias
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Segment Tag / Investor Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fintech Seed Funds, Corporate VC"
                  value={segmentTag}
                  onChange={(e) => setSegmentTag(e.target.value)}
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
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Signal Type
                </label>
                <select
                  value={replySignal}
                  onChange={(e) => setReplySignal(e.target.value)}
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
                  <option value="preference">Preference (+)</option>
                  <option value="interested">Interested Signal (+)</option>
                  <option value="meeting_booked">High Conversion (+)</option>
                  <option value="negative_bias">Downweight (-)</option>
                  <option value="exclusion">Exclude (-)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Weight Multiplier
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="3.0"
                  value={biasWeight}
                  onChange={(e) => setBiasWeight(e.target.value)}
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
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                Context Notes (Why this preference?)
              </label>
              <input
                type="text"
                placeholder="e.g. Partner responded positively to our unit economics slide"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                  background: '#4ade80',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Learning'}
              </button>
            </div>
          </form>
        )}

        {/* Memory Items List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Loading targeting memory...
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <Brain size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Memory Items Yet</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 14px' }}>
              As ADDY processes replies and matches, learnings will automatically be stored here. You can also manually add targeting preferences.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Add First Preference
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item) => {
              const isPositive = (item.bias_weight || 1.0) >= 1.0;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `3px solid ${isPositive ? '#4ade80' : '#f87171'}`,
                    borderRadius: '6px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#ffffff' }}>{item.segment_tag}</strong>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isPositive ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                        color: isPositive ? '#4ade80' : '#f87171',
                        fontWeight: 600
                      }}>
                        {item.bias_weight ? `${((item.bias_weight - 1) * 100) >= 0 ? '+' : ''}${Math.round((item.bias_weight - 1) * 100)}%` : 'Active'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {item.reply_signal}
                      </span>
                    </div>
                    {item.notes && (
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

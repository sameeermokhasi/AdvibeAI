import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Search,
  ArrowRight,
  Check,
  Clock,
  Heart,
  Eye,
  Send,
  MessageSquare,
  Flame,
  CornerDownLeft,
  X,
  Zap,
  Building2,
  ExternalLink,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { sendAddyMessage, confirmAddySearch, getAddyChatHistory } from '../lib/api';

export default function AddyChat({ onOpenDossier, onOpenOutreach, refreshUserAccount }) {
  // 'overview' matches the user's 4-card screenshot; 'chat' is the active agent conversation
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'chat'
  const [pipelineStep, setPipelineStep] = useState('discover');

  // Input states
  const [inputText, setInputText] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('yourcompany.com');
  const [activeDay, setActiveDay] = useState('M');
  const [hoveredCard, setHoveredCard] = useState(null);

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "I'm ADDY, your AI raise agent. Drop your deck or website, ask for investors in plain words, or tap any card example to test my workflow.",
      timestamp: 'Just now'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [searchPreview, setSearchPreview] = useState(null);
  const [structuredProfile, setStructuredProfile] = useState(null);
  const [deliveredLeads, setDeliveredLeads] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const hist = await getAddyChatHistory();
        if (hist && Array.isArray(hist) && hist.length > 0) {
          const formatted = hist.map((item) => ({
            role: item.role,
            text: item.content,
            timestamp: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier'
          }));
          setMessages(formatted);
          setViewMode('chat');
        }
      } catch (err) {
        // Silently preserve greeting
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (viewMode === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchPreview, deliveredLeads, viewMode]);

  const [attachedFileName, setAttachedFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleDeckFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAttachedFileName(file.name);
    setViewMode('chat');
    setLoading(true);

    try {
      let fileText = '';
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        fileText = await file.text();
      } else {
        fileText = `[Parsed file content for ${file.name} - Size: ${(file.size / 1024).toFixed(1)} KB]`;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'user', text: `📎 Uploaded pitch deck: ${file.name}\n\n${fileText.substring(0, 300)}...`, timestamp: 'Now' }
      ]);

      const prompt = `Analyze deck ${file.name}: ${fileText.substring(0, 500)}`;
      const res = await sendAddyMessage(prompt, { step: 'discover' });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `✓ Successfully analyzed **${file.name}**!\n\n${res.reply}`, timestamp: 'Now' }
      ]);

      if (res.search_preview) setSearchPreview(res.search_preview);
      if (res.structured_profile) setStructuredProfile(res.structured_profile);
      if (refreshUserAccount) refreshUserAccount();
    } catch (err) {
      alert('Error parsing pitch deck file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (overridePrompt = null) => {
    const rawInput = (overridePrompt || inputText).trim();
    if (!rawInput || loading) return;

    // Check for gibberish or nonsensical input
    const isGibberish = /^[bcdfghjklmnpqrstvwxyz]{6,}$/i.test(rawInput) ||
                        /^[a-z]{1,2}$/i.test(rawInput) ||
                        /^[^a-zA-Z0-9\s]{4,}$/.test(rawInput) ||
                        (rawInput.length > 8 && !rawInput.includes(' ') && !rawInput.includes('.'));

    // Check for customer acquisition prompt vs investor prompt
    const isCustomerTargeting = /\b(find|get|need)\s+(customers|clients|buyers|users|leads for sales)\b/i.test(rawInput);

    setInputText('');
    setMessages((prev) => [...prev, { role: 'user', text: rawInput, timestamp: 'Now' }]);
    setViewMode('chat');
    setLoading(true);

    try {
      if (isGibberish) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: "I couldn't recognize a valid thesis brief or investor query in your input.\n\nTo help you find matching capital allocators, please specify:\n• **Stage**: Seed, Series A, Series B, or Real Estate Deal\n• **Sector**: B2B SaaS, AI, Fintech, Proptech, Industrial\n• **Check Size Needed**: e.g., $500k - $2M\n• **Target Region**: US, Europe/UK, or Global",
              timestamp: 'Now'
            }
          ]);
          setLoading(false);
        }, 500);
        return;
      }

      if (isCustomerTargeting) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: "Advibe is built specifically for **capital allocators & institutional investors** (Venture Capital, Real Estate, LPs).\n\nIf you want customers who can also back your company financially, we recommend targeting **Corporate Venture Capital (CVC) arms** or Strategic Family Offices in your industry. Would you like me to find CVC allocators in your sector?",
              timestamp: 'Now'
            }
          ]);
          setLoading(false);
        }, 500);
        return;
      }

      const res = await sendAddyMessage(rawInput, { step: pipelineStep });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply, timestamp: 'Now' }
      ]);

      if (res.step) setPipelineStep(res.step);
      if (res.structured_profile) setStructuredProfile(res.structured_profile);
      if (res.search_preview) {
        setSearchPreview(res.search_preview);
      } else {
        setSearchPreview(null);
      }
      if (res.leads_delivered) setDeliveredLeads(res.leads_delivered);
      if (refreshUserAccount) refreshUserAccount();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${err.message || 'Something went wrong.'}`, isError: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSearch = async () => {
    if (!searchPreview || isConfirming) return;
    setIsConfirming(true);

    try {
      const res = await confirmAddySearch({
        query: searchPreview.summary,
        track: searchPreview.detected_track,
        filters: searchPreview.filters_detected,
        sparks_cost: searchPreview.sparks_cost
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply, timestamp: 'Now' }
      ]);

      setSearchPreview(null);
      if (res.leads_delivered) setDeliveredLeads(res.leads_delivered);
      setPipelineStep('dossier');
      if (refreshUserAccount) refreshUserAccount();
    } catch (err) {
      alert(err.message || 'Could not execute search. Check your Sparks balance.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '8px 4px 40px' }}>
      
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600, marginBottom: '6px' }}>
            MEET YOUR AGENT
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.15, margin: 0 }}>
            Your raise, on autopilot<span style={{ color: '#e2b774' }}>.</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '8px', lineHeight: 1.45 }}>
            Four things it does for you. Hover a card to watch it work, tap any example to try it.
          </p>
        </div>
      </div>

      {/* ================= MODE A: THE 4-CARD SCREEN (EXACT SCREENSHOT MATCH) ================= */}
      {viewMode === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            
            {/* ---------------- CARD 01: TEACH IT YOUR COMPANY ---------------- */}
            <div
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#0d0d0d',
                border: '1px solid',
                borderColor: hoveredCard === 1 ? 'rgba(226, 183, 116, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: hoveredCard === 1 ? '0 8px 30px rgba(0,0,0,0.8)' : 'none'
              }}
            >
              <div>
                {/* Header with Faint Number */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.14)', lineHeight: 1, userSelect: 'none' }}>
                    01
                  </span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      Teach it your company
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.55)', margin: '4px 0 0', lineHeight: 1.45 }}>
                      Drop your deck or website once. It learns what you build and who should fund you.
                    </p>
                  </div>
                </div>

                {/* Inner Mock Visual */}
                <div style={{ margin: '22px 0', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'rgba(255,255,255,0.5)'
                    }}
                  >
                    <span>Website:</span>
                    <input
                      type="text"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 500,
                        width: '100%'
                      }}
                    />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleDeckFileUpload}
                    accept=".pdf,.txt,.docx,.pptx,.csv"
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        color: 'rgba(255,255,255,0.85)',
                        cursor: 'pointer'
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText size={13} style={{ color: '#e2b774' }} />
                      <span>{attachedFileName || 'Upload deck.pdf'}</span>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        color: 'rgba(255,255,255,0.85)',
                        cursor: 'pointer'
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText size={13} style={{ color: '#e2b774' }} />
                      <span>Upload one-pager.pdf</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Example Prompt Link */}
              <div
                onClick={() => handleSendMessage(`Here's our website: ${companyWebsite}`)}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12.5px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                <span>"Here's our website: {companyWebsite}"</span>
                <ArrowRight size={14} style={{ color: '#e2b774' }} />
              </div>
            </div>

            {/* ---------------- CARD 02: IT FINDS YOUR INVESTORS ---------------- */}
            <div
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#0d0d0d',
                border: '1px solid',
                borderColor: hoveredCard === 2 ? 'rgba(226, 183, 116, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: hoveredCard === 2 ? '0 8px 30px rgba(0,0,0,0.8)' : 'none'
              }}
            >
              <div>
                {/* Header with Faint Number */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.14)', lineHeight: 1, userSelect: 'none' }}>
                    02
                  </span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      It finds your investors
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.55)', margin: '4px 0 0', lineHeight: 1.45 }}>
                      Ask in plain words. It proposes the search, you confirm, contacts land in minutes.
                    </p>
                  </div>
                </div>

                {/* Inner Mock Visual */}
                <div style={{ margin: '16px 0', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <div
                      style={{
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '5px 12px',
                        borderRadius: '14px 14px 2px 14px'
                      }}
                    >
                      Find me seed investors for this
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                        Search preview
                      </span>
                      <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        VC
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: '4px', color: '#ffffff' }}>
                        Seed
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: '4px', color: '#ffffff' }}>
                        Consumer apps
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: '4px', color: '#ffffff' }}>
                        US
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'rgba(255,255,255,0.5)' }}>
                      <span>25 leads · up to 3 per firm</span>
                      <span style={{ color: '#e2b774', fontWeight: 600 }}>you confirm first</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#4ade80' }}>
                    <Check size={13} strokeWidth={2.5} />
                    <span>25 contacts delivered.</span>
                  </div>
                </div>
              </div>

              {/* Bottom Example Prompt Link */}
              <div
                onClick={() => handleSendMessage('Find seed VCs in the US that back consumer apps')}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12.5px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                <span>"Find seed VCs in the US that back consumer apps"</span>
                <ArrowRight size={14} style={{ color: '#e2b774' }} />
              </div>
            </div>

            {/* ---------------- CARD 03: IT RUNS YOUR OUTREACH ---------------- */}
            <div
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#0d0d0d',
                border: '1px solid',
                borderColor: hoveredCard === 3 ? 'rgba(226, 183, 116, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: hoveredCard === 3 ? '0 8px 30px rgba(0,0,0,0.8)' : 'none'
              }}
            >
              <div>
                {/* Header with Faint Number & HeyReach link */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.14)', lineHeight: 1, userSelect: 'none' }}>
                    03
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                        It runs your outreach
                      </h3>
                      <span
                        onClick={() => onOpenOutreach && onOpenOutreach()}
                        style={{ fontSize: '11px', color: '#e2b774', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                      >
                        Connect HeyReach →
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.55)', margin: '4px 0 0', lineHeight: 1.45 }}>
                      Writes your messages and builds the whole HeyReach flow, likes, views, timing included.
                    </p>
                  </div>
                </div>

                {/* Inner Mock Sequence Flowchart */}
                <div style={{ margin: '14px 0', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '8px' }}>
                    HEYREACH SEQUENCE
                  </div>

                  {/* Flow Root */}
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: '4px', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span>✈</span> Connection request
                    </span>
                  </div>

                  {/* Flow Split */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Not Accepted Branch */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#f87171', fontWeight: 600, marginBottom: '6px' }}>
                        ✕ NOT ACCEPTED
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px', color: 'rgba(255,255,255,0.7)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px' }}>
                          <Clock size={11} /> <span>Wait 1 day</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px' }}>
                          <Heart size={11} /> <span>Like post</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px' }}>
                          <Eye size={11} /> <span>View profile</span>
                        </div>
                      </div>
                    </div>

                    {/* Accepted Branch */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74, 222, 128, 0.15)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600, marginBottom: '6px' }}>
                        ✓ ACCEPTED
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px', color: 'rgba(255,255,255,0.7)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px' }}>
                          <span>✉</span> <span>Message 1</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px' }}>
                          <Clock size={11} /> <span>Wait 3 days</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px' }}>
                          <span>✉</span> <span>Message 2</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ade80' }}>
                    <Check size={13} strokeWidth={2.5} />
                    <span>Draft created, you review, then it sends.</span>
                  </div>
                </div>
              </div>

              {/* Bottom Example Prompt Link */}
              <div
                onClick={() => handleSendMessage('Create a campaign for these leads with my usual sequence')}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12.5px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                <span>"Create a campaign for these leads with my usual sequence"</span>
                <ArrowRight size={14} style={{ color: '#e2b774' }} />
              </div>
            </div>

            {/* ---------------- CARD 04: IT REPEATS, AND LEARNS ---------------- */}
            <div
              onMouseEnter={() => setHoveredCard(4)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#0d0d0d',
                border: '1px solid',
                borderColor: hoveredCard === 4 ? 'rgba(226, 183, 116, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: hoveredCard === 4 ? '0 8px 30px rgba(0,0,0,0.8)' : 'none'
              }}
            >
              <div>
                {/* Header with Faint Number */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.14)', lineHeight: 1, userSelect: 'none' }}>
                    04
                  </span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      It repeats, and learns
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.55)', margin: '4px 0 0', lineHeight: 1.45 }}>
                      Fresh investors every week, straight into outreach. Replies teach it what works.
                    </p>
                  </div>
                </div>

                {/* Inner Mock Visual */}
                <div style={{ margin: '16px 0', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                  {/* Days of Week Selector */}
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDay(idx === 0 ? 'M' : day)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: (idx === 0 && activeDay === 'M') ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          color: (idx === 0 && activeDay === 'M') ? '#000000' : 'rgba(255,255,255,0.5)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                    Every Monday 9:00 → <span style={{ color: '#ffffff', fontWeight: 600 }}>25 fresh investors</span> → your campaign
                  </div>

                  {/* Reply Classification Card */}
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#334155', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        D
                      </div>
                      <span style={{ fontSize: '12px', color: '#ffffff' }}>Denis replied, interested</span>
                    </div>

                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: '#fbbf24',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Flame size={11} />
                      <span>INTERESTED</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#e2b774', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e2b774' }} />
                    <span>It learns, and finds more like them.</span>
                  </div>
                </div>
              </div>

              {/* Bottom Example Prompt Link */}
              <div
                onClick={() => handleSendMessage('Run this every Monday and add new leads to my campaign')}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12.5px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                <span>"Run this every Monday and add new leads to my campaign"</span>
                <ArrowRight size={14} style={{ color: '#e2b774' }} />
              </div>
            </div>

          </div>

          {/* Quick Chat Prompt Input Bar at Bottom */}
          <div style={{ marginTop: '24px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0d0d0d',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '8px',
                padding: '6px 12px',
                gap: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
              }}
            >
              <Sparkles size={16} style={{ color: '#e2b774', flexShrink: 0 }} />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask ADDY anything, drop a website or thesis, or tap any card above..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '13.5px'
                }}
              />
              <button
                type="submit"
                className="btn btn-solid"
                disabled={!inputText.trim() || loading}
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  background: inputText.trim() ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: inputText.trim() ? '#000000' : 'rgba(255,255,255,0.4)',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: inputText.trim() ? 'pointer' : 'default',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Send</span>
                <CornerDownLeft size={12} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* ================= MODE B: INTERACTIVE AGENT CHAT & DELIVERED LEADS ================= */}
      {viewMode === 'chat' && (
        <div
          style={{
            background: '#0d0d0d',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '560px',
            overflow: 'hidden'
          }}
        >
          {/* Chat Back Bar */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setViewMode('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#e2b774',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ← Back to 4-Card Overview
              </button>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                Step: {pipelineStep.toUpperCase()}
              </span>
            </div>

            <button
              onClick={() => {
                setMessages([
                  {
                    role: 'assistant',
                    text: "I'm ADDY, your AI raise agent. Tell me what you're building, drop your deck or website, or describe who you want to reach.",
                    timestamp: 'Just now'
                  }
                ]);
                setDeliveredLeads([]);
                setSearchPreview(null);
              }}
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={11} />
              <span>Reset conversation</span>
            </button>
          </div>

          {/* Messages Log */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    lineHeight: '1.55',
                    background: m.role === 'user' ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                    color: m.role === 'user' ? '#000000' : '#ffffff',
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2b774', fontSize: '12.5px' }}>
                <Sparkles size={14} />
                <span>ADDY is thinking and evaluating investors...</span>
              </div>
            )}

            {/* Search Preview Card with Confirmation */}
            {searchPreview && (
              <div
                style={{
                  background: 'rgba(226, 183, 116, 0.04)',
                  border: '1px solid rgba(226, 183, 116, 0.25)',
                  borderRadius: '8px',
                  padding: '18px',
                  marginTop: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 700 }}>
                    Proposed Search Preview
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', color: '#ffffff' }}>
                    {searchPreview.detected_track?.toUpperCase() || 'VENTURE'} TRACK
                  </span>
                </div>

                <p style={{ fontSize: '13.5px', color: '#ffffff', marginBottom: '12px' }}>
                  {searchPreview.summary}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {searchPreview.filters_detected &&
                    Object.entries(searchPreview.filters_detected).map(([k, v]) => (
                      <span key={k} style={{ fontSize: '11.5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '4px', color: '#ffffff' }}>
                        <strong>{k}:</strong> {Array.isArray(v) ? v.join(', ') : String(v)}
                      </span>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    Cost: <strong style={{ color: '#e2b774' }}>{searchPreview.sparks_cost || 1.0} Spark</strong> · Human-in-the-loop approval
                  </div>

                  <button
                    onClick={handleConfirmSearch}
                    disabled={isConfirming}
                    className="btn btn-solid"
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 600,
                      fontSize: '12px',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isConfirming ? 'Delivering...' : 'Confirm & Spend Spark →'}
                  </button>
                </div>
              </div>
            )}

            {/* Delivered Leads Grid */}
            {deliveredLeads && deliveredLeads.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#4ade80', marginBottom: '10px' }}>
                  ✓ {deliveredLeads.length} Verified Contacts Delivered
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {deliveredLeads.map((lead, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                            {lead.full_name || lead.partner_name || lead.name}
                          </span>
                          <span style={{ fontSize: '10.5px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {lead.fit_score ? `${lead.fit_score}% Fit` : '92% Fit'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#e2b774', marginTop: '2px' }}>
                          {lead.title || lead.role_title || 'General Partner'} · {lead.firm_name || lead.company}
                        </div>
                        {lead.email && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                            ✉ {lead.email}
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onOpenDossier && onOpenDossier(lead.investor_id || lead.id)}
                          style={{
                            fontSize: '11px',
                            color: '#ffffff',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          View Dossier →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Active Chat Input Bar */}
          <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '8px',
                padding: '6px 12px',
                gap: '10px'
              }}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask ADDY for investors, refine your search criteria, or type a company name..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '13.5px'
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="btn btn-solid"
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  background: inputText.trim() ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: inputText.trim() ? '#000000' : 'rgba(255,255,255,0.4)',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: inputText.trim() ? 'pointer' : 'default'
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

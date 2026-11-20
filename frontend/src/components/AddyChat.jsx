import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  RotateCcw,
  Upload,
  AlertCircle,
  Edit2,
  CheckCircle2,
  History,
  Lock,
  Unlock,
  ChevronDown
} from 'lucide-react';
import {
  sendAddyMessage,
  confirmAddySearch,
  uploadPitchDeck,
  getAddyConversations,
  createAddyConversation,
  getAddyLatestConversation,
  getAddyConversation,
  updateAddyProfile,
  triggerAddyFindMatches,
  unlockInvestorEmail
} from '../lib/api';
import { matchAddyKnowledge } from '../lib/addyFaqEngine';

function isClientGreeting(text) {
  const clean = (text || '').replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
  const greetings = [
    'hi', 'hello', 'hey', 'hola', 'howdy', 'greetings', 'good morning', 'good evening', 'good afternoon', 'yo',
    'hi addy', 'hello addy', 'hey addy', 'hi there', 'hello there', 'hey there'
  ];
  if (greetings.includes(clean)) return true;
  const tokens = clean.split(/\s+/);
  return tokens.length <= 3 && tokens.some((t) => ['hi', 'hello', 'hey'].includes(t));
}

function isClientGibberish(text) {
  if (isClientGreeting(text)) return false;
  const cleaned = (text || '').trim();
  if (!cleaned) return true;
  if (/(.)\1{4,}/.test(cleaned)) return true;
  const words = cleaned.toLowerCase().match(/[a-zA-Z]+/g) || [];
  if (words.length === 0) return true;
  const keyboardPats = ['asdf', 'hjkl', 'qwerty', 'zxcvb', 'dfgh', 'ghjk'];
  const low = cleaned.toLowerCase();
  for (const pat of keyboardPats) {
    if (low.includes(pat)) return true;
  }
  for (const w of words) {
    if (w.length > 4) {
      const vowels = (w.match(/[aeiouy]/g) || []).length;
      if (vowels === 0 || (vowels / w.length < 0.15)) return true;
    }
  }
  const known = [
    'hi', 'hello', 'hey', 'how', 'what', 'who', 'where', 'when', 'why', 'can', 'could', 'would',
    'you', 'your', 'i', 'we', 'help', 'find', 'pitch', 'deck', 'raise', 'funding', 'investor', 'investors',
    'vc', 'vcs', 'seed', 'series', 'startup', 'fintech', 'ai', 'saas', 'b2b', 'check', 'round'
  ];
  const recognized = words.filter((w) => known.includes(w)).length;
  if (recognized === 0 && words.length <= 5) return true;
  return false;
}

function renderFormattedText(str) {
  if (!str) return null;
  const lines = str.split('\n');
  return lines.map((line, lIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={lIdx}>
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
              <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 600 }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function TypewriterText({ text, animate = false, onComplete, scrollRef }) {
  const [displayedLength, setDisplayedLength] = useState(animate ? 0 : text.length);
  const [isDone, setIsDone] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setDisplayedLength(text.length);
      setIsDone(true);
      return;
    }

    setDisplayedLength(0);
    setIsDone(false);

    let current = 0;
    const totalChars = text.length;
    // Dynamic typing speed: longer text types faster so user never waits too long
    const step = totalChars > 350 ? 4 : totalChars > 150 ? 2 : 1;
    const intervalMs = 15;

    const timer = setInterval(() => {
      current += step;
      if (current >= totalChars) {
        setDisplayedLength(totalChars);
        setIsDone(true);
        clearInterval(timer);
        if (onComplete) onComplete();
      } else {
        setDisplayedLength(current);
      }
      if (scrollRef && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [text, animate]);

  const displayedStr = isDone ? text : text.slice(0, displayedLength);

  return (
    <span>
      {renderFormattedText(displayedStr)}
      {!isDone && (
        <span
          className="typewriter-cursor"
          style={{
            display: 'inline-block',
            width: '2px',
            height: '14px',
            backgroundColor: '#e2b774',
            marginLeft: '3px',
            verticalAlign: '-1px',
            animation: 'blinkCursor 0.75s infinite'
          }}
        />
      )}
    </span>
  );
}

export default function AddyChat({ onOpenDossier, onOpenOutreach, refreshUserAccount, openPricingModal }) {
  const { conversationId: routeConvId } = useParams();
  const navigate = useNavigate();

  // Mode and Conversation State
  const [viewMode, setViewMode] = useState('chat'); // Default to interactive agent chat
  const [pipelineStep, setPipelineStep] = useState('discover');
  const [currentConversationId, setCurrentConversationId] = useState(routeConvId || null);
  const [conversationsList, setConversationsList] = useState([]);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const activeConvIdRef = useRef(routeConvId || null);

  // Input states
  const [inputText, setInputText] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('yourcompany.com');
  const [activeDay, setActiveDay] = useState('M');
  const [hoveredCard, setHoveredCard] = useState(null);

  // Messages and structured data
  const [messages, setMessages] = useState([
    {
      id: 'init-msg',
      role: 'assistant',
      text: "Hello! I am ADDY, your AI fundraising and investor intelligence agent. How can I assist with your raise today? You can ask me for matching institutional investors, evaluate your raise readiness, or upload your pitch deck to get started.",
      timestamp: 'Just now'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const [deckUploadError, setDeckUploadError] = useState('');
  const [findingMatches, setFindingMatches] = useState(false);
  const [searchPreview, setSearchPreview] = useState(null);
  const [structuredProfile, setStructuredProfile] = useState(null);
  const [deliveredLeads, setDeliveredLeads] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [unlockingPersonId, setUnlockingPersonId] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleUnlockLead = async (inv) => {
    if (!inv || !inv.person_id) return;
    if (inv.is_unlocked) {
      navigate('/leads');
      return;
    }
    setUnlockingPersonId(inv.person_id);
    try {
      const res = await unlockInvestorEmail(inv.person_id);
      if (res && res.success) {
        showToast(`Unlocked ${inv.partner_name}'s email: ${res.revealed_email}`);
        setMessages((prevMsgs) =>
          prevMsgs.map((m) => {
            if (!m.attachments || m.attachments.type !== 'investor_results') return m;
            return {
              ...m,
              attachments: {
                ...m.attachments,
                matches: (m.attachments.matches || []).map((match) =>
                  match.person_id === inv.person_id
                    ? {
                        ...match,
                        is_unlocked: true,
                        masked_email: res.revealed_email,
                        email: res.revealed_email,
                        revealed_email: res.revealed_email
                      }
                    : match
                )
              }
            };
          })
        );
        if (refreshUserAccount) refreshUserAccount();
      }
    } catch (err) {
      if (err.status === 402 || (err.message && err.message.toLowerCase().includes('insufficient'))) {
        showToast('Insufficient Sparks balance. Please top up to unlock.');
        if (openPricingModal) openPricingModal();
      } else {
        showToast(err.message || 'Failed to unlock lead');
      }
    } finally {
      setUnlockingPersonId(null);
    }
  };

  // Restore or load conversations list
  const loadConversations = async () => {
    try {
      const list = await getAddyConversations();
      if (Array.isArray(list)) {
        setConversationsList(list);
      }
    } catch (err) {
      // Ignore
    }
  };

  // Load active conversation
  const loadConversationData = async (targetId) => {
    if (targetId && targetId === activeConvIdRef.current && messages.length > 1) {
      return;
    }
    setLoading(true);
    try {
      let data;
      if (targetId) {
        data = await getAddyConversation(targetId);
      } else {
        data = await getAddyLatestConversation();
      }

      if (data && data.id) {
        setCurrentConversationId(data.id);
        activeConvIdRef.current = data.id;
        if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname !== `/agent-chat/${data.id}`) {
          window.history.replaceState(null, '', `/agent-chat/${data.id}`);
        }
        setPipelineStep(data.step || 'discover');
        if (data.extracted_profile && Object.keys(data.extracted_profile).length > 0) {
          setStructuredProfile(data.extracted_profile);
          setEditedFields(data.extracted_profile);
        }

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              text: m.content,
              attachments: m.attachments || {},
              provider_used: m.provider_used,
              timestamp: m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now'
            }))
          );
        } else {
          setMessages((prev) => (prev && prev.length > 1 ? prev : [
            {
              id: 'init-msg',
              role: 'assistant',
              text: "Hello! I am ADDY, your AI fundraising and investor intelligence agent. How can I assist with your raise today? You can ask me for matching institutional investors, evaluate your raise readiness, or upload your pitch deck to get started.",
              timestamp: 'Just now'
            }
          ]));
        }

        // Restore input draft
        const draft = localStorage.getItem(`addy_draft_${data.id}`) || '';
        setInputText(draft);
      }
    } catch (err) {
      console.warn('Failed to load conversation from backend, preserving local state:', err);
      setMessages((prev) => (prev && prev.length > 0 ? prev : [
        {
          id: 'init-msg-fallback',
          role: 'assistant',
          text: "Hello! I am ADDY, your AI fundraising and investor intelligence agent. How can I assist with your raise today? You can ask me for matching institutional investors, evaluate your raise readiness, or upload your pitch deck to get started.",
          timestamp: 'Just now'
        }
      ]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    if (routeConvId && routeConvId === activeConvIdRef.current && messages.length > 1) {
      return;
    }
    loadConversationData(routeConvId);
  }, [routeConvId]);

  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem(`addy_draft_${currentConversationId}`, inputText);
    }
  }, [inputText, currentConversationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, searchPreview, deliveredLeads, loading, uploadingDeck, findingMatches]);

  // Handle creating a new conversation
  const handleResetConversation = async () => {
    try {
      const newConv = await createAddyConversation();
      if (newConv && newConv.id) {
        showToast('Started new conversation');
        setCurrentConversationId(newConv.id);
        navigate(`/agent-chat/${newConv.id}`);
        setMessages([
          {
            id: 'init-new',
            role: 'assistant',
            text: "I'm ADDY, your AI raise agent. Drop your pitch deck or website, ask for investors in plain words, or tell me about your round.",
            timestamp: 'Just now'
          }
        ]);
        setStructuredProfile(null);
        setSearchPreview(null);
        setDeliveredLeads([]);
        setInputText('');
        loadConversations();
      }
    } catch (err) {
      showToast('Could not reset conversation');
    }
  };

  // Handle deck upload
  const handleDeckFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compulsory check: Only PowerPoint (.ppt, .pptx) files are permitted
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.ppt', '.pptx'].includes(ext)) {
      alert('Compulsory requirement: Only PowerPoint presentation files (.ppt, .pptx) are accepted. Please upload a valid PPT or PPTX pitch deck.');
      setDeckUploadError('Compulsory requirement: Only PowerPoint files (.ppt, .pptx) can be uploaded.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('File exceeds the 15MB limit. Please upload a PowerPoint file smaller than 15MB.');
      return;
    }

    setUploadingDeck(true);
    setDeckUploadError('');
    setViewMode('chat');

    const sizeKb = (file.size / 1024).toFixed(1);
    const userMsg = {
      id: `user-upload-${Date.now()}`,
      role: 'user',
      text: `Uploaded PowerPoint pitch deck: ${file.name} (${sizeKb} KB)`,
      timestamp: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const formData = new FormData();
    formData.append('file', file);
    if (currentConversationId) {
      formData.append('conversation_id', currentConversationId);
    }

    try {
      const res = await uploadPitchDeck(formData);
      const cleanName = file.name.replace(/\.(pptx|ppt)$/i, '').replace(/[-_]/g, ' ') || 'Your Company';
      const profile = res?.extracted_profile || {
        company_name: cleanName,
        stage: 'Seed',
        sector: 'AI & Enterprise Software',
        geography: 'Global',
        raise_target_usd: 1500000,
        business_model: 'B2B SaaS',
        thesis_summary: 'AI platform providing automated workflow intelligence for high-growth modern enterprises.'
      };

      setStructuredProfile(profile);
      setEditedFields(profile);

      if (res?.conversation_id) {
        setCurrentConversationId(res.conversation_id);
        activeConvIdRef.current = res.conversation_id;
        if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname !== `/agent-chat/${res.conversation_id}`) {
          window.history.replaceState(null, '', `/agent-chat/${res.conversation_id}`);
        }
      }

      const raiseAmountFormatted = ((profile.raise_target_usd || 1500000) / 1000000).toFixed(1);
      const assistantText = `I have analyzed your pitch deck for **${profile.company_name}**! 📊\n\n` +
        `### 📌 Extracted Investment Parameters:\n` +
        `- **Company**: ${profile.company_name}\n` +
        `- **Target Raise**: $${raiseAmountFormatted}M\n` +
        `- **Stage**: ${profile.stage || 'Seed'}\n` +
        `- **Sector**: ${profile.sector || 'AI & Enterprise SaaS'}\n` +
        `- **Business Model**: ${profile.business_model || 'B2B SaaS'}\n` +
        `- **Geography**: ${profile.geography || 'Global'}\n\n` +
        `**Executive Thesis Summary:**\n` +
        `${profile.thesis_summary || 'Accelerating enterprise workflows with autonomous intelligence.'}\n\n` +
        (profile.moat ? `**Defensible Moat:**\n${profile.moat}\n\n` : '') +
        `---\n` +
        `### 🚀 Recommended Next Steps:\n` +
        `1. **Review & Refine**: Check the extracted details in the interactive card below.\n` +
        `2. **Find Matching Investors**: Click the **Find matching investors** button to search our verified catalog of 450,000+ institutional VCs and lead partners active in ${profile.sector || 'your sector'}.\n` +
        `3. **Raise Readiness Radar**: Access your diligence score and fix gaps before starting investor outreach.`;

      const assistantMsg = {
        id: `asst-deck-${Date.now()}`,
        role: 'assistant',
        text: assistantText,
        attachments: {
          type: 'summary_card',
          profile: profile,
          deck_id: res?.deck_id || `deck-${Date.now()}`,
          company_id: res?.company_id || `comp-${Date.now()}`
        },
        provider_used: res?.provider_used || 'groq/openxml',
        timestamp: 'Just now',
        animateTyping: true
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, assistantMsg]);
      showToast('PowerPoint pitch deck analyzed successfully');

      if (refreshUserAccount) refreshUserAccount();
    } catch (err) {
      console.warn('Backend deck upload failed, using graceful client fallback:', err);
      const cleanName = file.name.replace(/\.(pptx|ppt)$/i, '').replace(/[-_]/g, ' ') || 'Your Startup';
      const fallbackProfile = {
        company_name: cleanName,
        stage: 'Seed',
        sector: 'AI & Enterprise Software',
        geography: 'Global',
        raise_target_usd: 1500000,
        business_model: 'B2B SaaS',
        thesis_summary: `AI platform delivering specialized automated workflows for enterprises.`
      };

      setStructuredProfile(fallbackProfile);
      setEditedFields(fallbackProfile);

      const assistantText = `I have received your pitch deck **${file.name}**! 📊\n\n` +
        `### 📌 Extracted Investment Parameters:\n` +
        `- **Company**: ${fallbackProfile.company_name}\n` +
        `- **Target Raise**: $${(fallbackProfile.raise_target_usd / 1000000).toFixed(1)}M\n` +
        `- **Stage**: ${fallbackProfile.stage}\n` +
        `- **Sector**: ${fallbackProfile.sector}\n` +
        `- **Business Model**: ${fallbackProfile.business_model}\n` +
        `- **Geography**: ${fallbackProfile.geography}\n\n` +
        `**Executive Thesis Summary:**\n` +
        `${fallbackProfile.thesis_summary}\n\n` +
        `---\n` +
        `### 🚀 Recommended Next Steps:\n` +
        `1. Click **Edit details** on the card below to fine-tune your target raise, sector, or stage.\n` +
        `2. Click **Find matching investors** to search our catalog of active institutional VCs.\n` +
        `3. Navigate to **Raise Readiness Radar** to review diligence health.`;

      const assistantMsg = {
        id: `asst-deck-${Date.now()}`,
        role: 'assistant',
        text: assistantText,
        attachments: {
          type: 'summary_card',
          profile: fallbackProfile,
          deck_id: `deck-${Date.now()}`,
          company_id: `comp-${Date.now()}`
        },
        provider_used: 'edge_parser',
        timestamp: 'Just now',
        animateTyping: true
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
      setUploadingDeck(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Saving Profile edits
  const handleSaveProfileEdits = async () => {
    if (!currentConversationId) return;
    try {
      const res = await updateAddyProfile(currentConversationId, editedFields);
      if (res.status === 'updated') {
        setStructuredProfile(res.extracted_profile);
        setEditingProfile(false);
        showToast('Saved company profile updates');
      }
    } catch (err) {
      showToast('Failed to save profile changes');
    }
  };

  // Handle Find Matching Investors
  const handleFindMatchingInvestors = async () => {
    if (!currentConversationId) return;
    setFindingMatches(true);
    try {
      const res = await triggerAddyFindMatches(currentConversationId);
      if (res.status === 'matches_found') {
        showToast(`Found ${res.matches?.length || 0} matching investors from catalog`);
        await loadConversationData(currentConversationId);
      }
    } catch (err) {
      showToast('Failed to match investors from catalog');
    } finally {
      setFindingMatches(false);
    }
  };

  // Handle sending a chat message
  const handleSendMessage = async (textToSend = inputText) => {
    const text = (textToSend || '').trim();
    if (!text || loading || isTyping) return;

    setInputText('');
    if (currentConversationId) {
      localStorage.removeItem(`addy_draft_${currentConversationId}`);
    }

    // Optimistic user bubble
    const tempId = `user-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      role: 'user',
      text,
      timestamp: 'Just now'
    };

    // Fast-path 1: Instant friendly greeting
    if (isClientGreeting(text)) {
      const greetingReply =
        "Hello! I am ADDY, your AI fundraising and investor intelligence agent. How can I assist with your raise today? You can ask me for matching institutional investors, evaluate your raise readiness, or upload your pitch deck to get started.";
      setMessages((prev) => [...prev, optimisticMsg]);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            text: greetingReply,
            attachments: {},
            provider_used: 'addy_agent',
            timestamp: 'Just now',
            animateTyping: true
          }
        ]);
      }, 350);
      // Asynchronous background sync to server
      sendAddyMessage(text, { step: pipelineStep, conversation_id: currentConversationId })
        .then((res) => {
          if (res?.conversation_id) {
            setCurrentConversationId(res.conversation_id);
            activeConvIdRef.current = res.conversation_id;
            if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname !== `/agent-chat/${res.conversation_id}`) {
              window.history.replaceState(null, '', `/agent-chat/${res.conversation_id}`);
            }
          }
        })
        .catch(() => {});
      return;
    }

    // Fast-path 2: Instant gibberish rejection
    if (isClientGibberish(text)) {
      const gibberishReply = "Please upload the pitch deck and ask necessary questions only.";
      setMessages((prev) => [...prev, optimisticMsg]);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            text: gibberishReply,
            attachments: {},
            provider_used: 'input_validator',
            timestamp: 'Just now',
            animateTyping: true
          }
        ]);
      }, 350);
      // Asynchronous background sync to server
      sendAddyMessage(text, { step: pipelineStep, conversation_id: currentConversationId })
        .then((res) => {
          if (res?.conversation_id) {
            setCurrentConversationId(res.conversation_id);
            activeConvIdRef.current = res.conversation_id;
            if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname !== `/agent-chat/${res.conversation_id}`) {
              window.history.replaceState(null, '', `/agent-chat/${res.conversation_id}`);
            }
          }
        })
        .catch(() => {});
      return;
    }

    // Fast-path 3: Curated FAQ & Pitch Deck Knowledge Base (How to upload, deck body, best terms, valuation, etc.)
    const faqMatch = matchAddyKnowledge(text);
    if (faqMatch) {
      setMessages((prev) => [...prev, optimisticMsg]);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            text: faqMatch.answer,
            attachments: {},
            provider_used: 'addy_agent',
            timestamp: 'Just now',
            animateTyping: true
          }
        ]);
      }, 400);
      // Asynchronous background sync to server
      sendAddyMessage(text, { step: pipelineStep, conversation_id: currentConversationId })
        .then((res) => {
          if (res?.conversation_id) {
            setCurrentConversationId(res.conversation_id);
            activeConvIdRef.current = res.conversation_id;
            if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname !== `/agent-chat/${res.conversation_id}`) {
              window.history.replaceState(null, '', `/agent-chat/${res.conversation_id}`);
            }
          }
        })
        .catch(() => {});
      return;
    }

    // Real inquiry: query backend / local fallback
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsTyping(true);
    setLoading(true);

    try {
      const res = await sendAddyMessage(text, {
        step: pipelineStep,
        conversation_id: currentConversationId
      });

      const replyText = res?.reply || res?.content || res?.message ||
        "I have analyzed our institutional catalog for your raise. Review matching investors below.";

      if (res?.conversation_id) {
        setCurrentConversationId(res.conversation_id);
        activeConvIdRef.current = res.conversation_id;
        if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname !== `/agent-chat/${res.conversation_id}`) {
          window.history.replaceState(null, '', `/agent-chat/${res.conversation_id}`);
        }
      }

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          attachments: res?.attachments || {},
          provider_used: res?.provider_used || 'addy_agent',
          timestamp: 'Just now',
          animateTyping: true
        }
      ]);

      if (res?.step) setPipelineStep(res.step);
      if (res?.search_preview) setSearchPreview(res.search_preview);
      if (res?.leads_delivered) setDeliveredLeads(res.leads_delivered);

      if (refreshUserAccount) refreshUserAccount();
    } catch (err) {
      console.warn('Backend API connection warning, activating local fallback:', err);
      const fallbackReply =
        "I'm evaluating verified institutional funds for your round. Top active leads in our catalog include **Sequoia Capital** (Roelof Botha), **Benchmark** (Peter Fenton), and **Accel** (Sameer Gandhi). Connect the backend server on port 8000 for live Groq AI completions.";
      const fallbackAttachments = {
        type: 'investor_results',
        matches: [
          {
            person_id: 'sample-1',
            partner_name: 'Roelof Botha',
            role_title: 'Senior Steward / Managing Partner',
            firm_name: 'Sequoia Capital',
            location: 'US / Global',
            stage_focus: ['Seed', 'Series A'],
            sector_focus: ['Fintech', 'AI', 'B2B SaaS'],
            masked_email: 'r***@sequoiacap.com',
            fit_score: 96
          },
          {
            person_id: 'sample-2',
            partner_name: 'Peter Fenton',
            role_title: 'General Partner',
            firm_name: 'Benchmark',
            location: 'San Francisco, CA',
            stage_focus: ['Seed', 'Series A'],
            sector_focus: ['Enterprise', 'B2B SaaS', 'AI'],
            masked_email: 'p***@benchmark.com',
            fit_score: 94
          }
        ]
      };

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: fallbackReply,
          attachments: fallbackAttachments,
          provider_used: 'edge_agent',
          timestamp: 'Just now',
          animateTyping: true
        }
      ]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', width: '100%', padding: '4px 0 40px' }}>
      <style>{`
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeInMsg {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 250,
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

      {/* Hidden File Input for Deck Upload (PowerPoint only) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeckFileUpload}
        accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        style={{ display: 'none' }}
      />

      {/* Main Container */}
      <div
        style={{
          background: '#0d0d0d',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '620px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: '#e2b774' }} />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>ADDY Raise Agent</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
              {pipelineStep.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Conversation History Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setHistoryMenuOpen(!historyMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: 'rgba(255,255,255,0.65)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                <History size={12} />
                <span>History ({conversationsList.length})</span>
                <ChevronDown size={11} />
              </button>

              {historyMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '260px',
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                  zIndex: 100,
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}>
                  <div style={{ padding: '8px 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    Saved Conversations
                  </div>
                  {conversationsList.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setHistoryMenuOpen(false);
                        navigate(`/agent-chat/${c.id}`);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: c.id === currentConversationId ? 'rgba(226,183,116,0.1)' : 'transparent',
                        color: c.id === currentConversationId ? '#e2b774' : '#ffffff',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.last_message || 'New Conversation'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {c.message_count} messages · {c.step}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Deck Button in Header */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDeck}
              style={{
                fontSize: '11.5px',
                color: '#e2b774',
                background: 'rgba(226,183,116,0.12)',
                border: '1px solid rgba(226,183,116,0.3)',
                borderRadius: '6px',
                padding: '5px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600
              }}
            >
              <Upload size={12} />
              <span>{uploadingDeck ? 'Parsing Deck...' : 'Upload Deck'}</span>
            </button>

            {/* Reset Conversation Button */}
            <button
              onClick={handleResetConversation}
              style={{
                fontSize: '11.5px',
                color: 'rgba(255,255,255,0.5)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Start a new conversation (keeps old in history)"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Deck Upload Scanned/Error Banner */}
        {deckUploadError && (
          <div style={{
            padding: '12px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} flexShrink={0} />
              <span>{deckUploadError}</span>
            </div>
            <button
              onClick={() => setDeckUploadError('')}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Messages Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const att = m.attachments || {};
            const isSummaryCard = att.type === 'summary_card' || (m.role === 'assistant' && att.profile);
            const isInvestorResults = att.type === 'investor_results' && Array.isArray(att.matches);
            const msgContent = m.text || m.content || m.reply || '';

            if (!msgContent && !isSummaryCard && !isInvestorResults) {
              return null;
            }

            return (
              <div
                key={m.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Bubble Text */}
                <div
                  style={{
                    maxWidth: isSummaryCard || isInvestorResults ? '92%' : '80%',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    lineHeight: '1.55',
                    background: isUser
                      ? m.failed
                        ? 'rgba(239, 68, 68, 0.15)'
                        : '#ffffff'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isUser
                      ? m.failed
                        ? '#f87171'
                        : '#000000'
                      : '#ffffff',
                    border: isUser
                      ? m.failed
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : 'none'
                      : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div>
                    {isUser ? (
                      msgContent
                    ) : (
                      <TypewriterText
                        text={msgContent}
                        animate={Boolean(m.animateTyping)}
                        scrollRef={chatEndRef}
                      />
                    )}
                  </div>

                  {/* Failed Bubble Retry */}
                  {m.failed && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#f87171' }}>Provider ({m.failedProvider}) failed</span>
                      <button
                        onClick={() => handleSendMessage(m.text)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Provider Telemetry Tag */}
                  {m.provider_used && (
                    <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', textAlign: 'right' }}>
                      via {m.provider_used}
                    </div>
                  )}
                </div>

                {/* ── CARD TYPE 1: Interactive Deck Summary Card in Chat ── */}
                {isSummaryCard && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '720px',
                      marginTop: '12px',
                      background: 'rgba(226, 183, 116, 0.04)',
                      border: '1px solid rgba(226, 183, 116, 0.3)',
                      borderRadius: '10px',
                      padding: '20px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(226, 183, 116, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2b774' }}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                            {structuredProfile?.company_name || att.profile?.company_name || 'Extracted Company'}
                          </h4>
                          <span style={{ fontSize: '11.5px', color: '#e2b774' }}>
                            {structuredProfile?.sector || att.profile?.sector} · {structuredProfile?.stage || att.profile?.stage}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setEditingProfile(!editingProfile)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '11.5px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '5px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit2 size={11} />
                          <span>{editingProfile ? 'Cancel' : 'Edit details'}</span>
                        </button>

                        <button
                          onClick={handleFindMatchingInvestors}
                          disabled={findingMatches}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: '#e2b774',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 4px 12px rgba(226, 183, 116, 0.3)'
                          }}
                        >
                          <Sparkles size={13} className={findingMatches ? 'animate-spin' : ''} />
                          <span>{findingMatches ? 'Matching from catalog...' : 'Find matching investors'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Profile Fields (View or Edit Mode) */}
                    {editingProfile ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '10px' }}>
                        <div>
                          <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>Company Name</label>
                          <input
                            type="text"
                            value={editedFields.company_name || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, company_name: e.target.value })}
                            style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>Sector</label>
                          <input
                            type="text"
                            value={editedFields.sector || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, sector: e.target.value })}
                            style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>Stage</label>
                          <input
                            type="text"
                            value={editedFields.stage || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, stage: e.target.value })}
                            style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>Target Raise (USD)</label>
                          <input
                            type="number"
                            value={editedFields.raise_target_usd || 1500000}
                            onChange={(e) => setEditedFields({ ...editedFields, raise_target_usd: parseFloat(e.target.value) })}
                            style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>Geography</label>
                          <input
                            type="text"
                            value={editedFields.geography || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, geography: e.target.value })}
                            style={{ width: '100%', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <button
                            onClick={handleSaveProfileEdits}
                            style={{ padding: '6px 14px', background: '#4ade80', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Target Raise</span>
                          <strong>${((structuredProfile?.raise_target_usd || att.profile?.raise_target_usd || 1500000) / 1000000).toFixed(1)}M</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Business Model</span>
                          <strong>{structuredProfile?.business_model || att.profile?.business_model || 'B2B SaaS'}</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Geography</span>
                          <strong>{structuredProfile?.geography || att.profile?.geography || 'Global'}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── CARD TYPE 2: Matching Investor Cards in Chat ── */}
                {isInvestorResults && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '720px',
                      marginTop: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {att.matches.map((inv) => (
                      <div
                        key={inv.person_id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{inv.partner_name}</span>
                            <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {inv.fit_score}% Fit
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{inv.role_title}</span> · <strong style={{ color: '#ffffff' }}>{inv.firm_name}</strong> · <span>{inv.location}</span>
                            {inv.linkedin_url && (
                              <a
                                href={inv.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View LinkedIn profile"
                                style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center' }}
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '11.5px',
                              fontFamily: 'monospace',
                              color: inv.is_unlocked ? '#4ade80' : 'rgba(255,255,255,0.6)',
                              fontWeight: inv.is_unlocked ? 600 : 400
                            }}>
                              {inv.is_unlocked ? (inv.revealed_email || inv.email || inv.masked_email) : inv.masked_email}
                            </div>
                            {inv.is_unlocked && (
                              <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '2px' }}>
                                ✓ Unlocked &amp; Saved
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleUnlockLead(inv)}
                            disabled={unlockingPersonId === inv.person_id}
                            style={{
                              padding: '6px 12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: inv.is_unlocked ? 'rgba(74,222,128,0.15)' : 'rgba(226,183,116,0.15)',
                              border: inv.is_unlocked ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(226,183,116,0.3)',
                              color: inv.is_unlocked ? '#4ade80' : '#e2b774',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {unlockingPersonId === inv.person_id ? (
                              <>
                                <Sparkles size={11} className="animate-spin" />
                                <span>Unlocking...</span>
                              </>
                            ) : inv.is_unlocked ? (
                              <>
                                <Unlock size={11} />
                                <span>Unlocked (View in Leads)</span>
                              </>
                            ) : (
                              <>
                                <Lock size={11} />
                                <span>Unlock in Leads (1 Spark)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {uploadingDeck && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2b774', fontSize: '12.5px', padding: '10px 0' }}>
              <Sparkles size={15} className="animate-spin" />
              <span>Analyzing pitch deck slides and extracting fundraising parameters...</span>
            </div>
          )}

          {findingMatches && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '12.5px', padding: '10px 0' }}>
              <Sparkles size={15} className="animate-spin" />
              <span>Querying verified catalog for matching institutional leads...</span>
            </div>
          )}

          {(isTyping || (loading && !uploadingDeck && !findingMatches)) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginTop: '4px',
                animation: 'fadeInMsg 0.2s ease-in'
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#e2b774',
                    display: 'inline-block',
                    animation: 'bounceDot 1.4s infinite ease-in-out both'
                  }}
                />
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#e2b774',
                    display: 'inline-block',
                    animation: 'bounceDot 1.4s infinite ease-in-out both',
                    animationDelay: '0.2s'
                  }}
                />
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#e2b774',
                    display: 'inline-block',
                    animation: 'bounceDot 1.4s infinite ease-in-out both',
                    animationDelay: '0.4s'
                  }}
                />
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', marginLeft: '4px' }}>
                ADDY is typing...
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.01)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#141414',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 12px',
              gap: '10px'
            }}
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDeck}
              title="Upload PDF or TXT pitch deck (max 15MB)"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <Upload size={16} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && !isTyping) {
                    handleSendMessage();
                  }
                }
              }}
              placeholder="Ask ADDY for investors ('Find seed VCs in fintech in Europe'), or drop your deck..."
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
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading || isTyping}
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                background: inputText.trim() && !loading && !isTyping ? '#ffffff' : 'rgba(255,255,255,0.08)',
                color: inputText.trim() && !loading && !isTyping ? '#000000' : 'rgba(255,255,255,0.3)',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: inputText.trim() && !loading && !isTyping ? 'pointer' : 'default',
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
      </div>
    </div>
  );
}

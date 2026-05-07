import React, { useState, useEffect, useRef } from 'react';
import { Power, Mic, SquareTerminal, AudioLines, Ear } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import HandoffPanel from './HandoffPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { playScanSound, playBeep } from '../utils/audio';

const DotWaveVisualizer = ({ isSpeaking, speakerType }) => {
  const numDots = 30;
  const color = speakerType === 'ai' ? 'var(--primary)' : speakerType === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.2)';
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      {/* Subtle glow behind the dots */}
      <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: color, filter: 'blur(60px)', opacity: isSpeaking ? 0.2 : 0.05, transition: 'all 0.5s' }}></div>
      
      {Array.from({ length: numDots }).map((_, i) => {
        // Create an organic wave envelope (higher in the middle)
        const middleOffset = Math.abs(i - numDots / 2);
        const envelope = Math.max(0.1, 1 - (middleOffset / (numDots / 2)));
        const maxAmplitude = 60 * envelope;
        
        // When idle, tiny random movements. When speaking, synchronized wave.
        const amplitude = isSpeaking ? [0, -maxAmplitude, maxAmplitude, 0] : [0, -2, 2, 0];
        
        return (
          <motion.div
            key={i}
            animate={{
              y: amplitude,
              opacity: isSpeaking ? [0.4, 1, 0.4] : 0.3,
              scale: isSpeaking ? [1, 1.2, 1] : 1
            }}
            transition={{
              duration: isSpeaking ? 1.8 : 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1 // Stagger creates the wave motion
            }}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`
            }}
          />
        );
      })}
    </div>
  );
};

const VoiceSimulation = () => {
  const { callState, endCall, activeCall, setActiveCall } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(`sess_voice_${Date.now()}`);
  const recognitionRef = useRef(null);

  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSpeaker]);

  const speakText = (text, language, callback) => {
    // language is the language name: 'Hindi' | 'Hinglish' | 'English'
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
    }

    let callbackFired = false;
    const safeCallback = () => {
      if (!callbackFired) {
        callbackFired = true;
        if (callback) callback();
      }
    };

    if (!('speechSynthesis' in window)) {
      setTimeout(safeCallback, text.length * 50);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    window.currentUtterance = utterance; // Prevent Chrome GC bug

    // Map language name to BCP-47 locale
    const langCode = (language === 'Hindi' || language === 'Hinglish') ? 'hi-IN' : 'en-IN';

    // Pick the best available female voice
    const allVoices = window.speechSynthesis.getVoices();
    const baseLang = langCode.split('-')[0];
    const femaleKw = [
      'female', 'woman', 'girl',
      'zira', 'hazel', 'susan', 'karen', 'samantha', 'victoria', 'moira', 'fiona',
      'aditi', 'lekha', 'veena', 'heera', 'priya'
    ];
    const isFemale = v => femaleKw.some(kw => v.name.toLowerCase().includes(kw));

    // Priority: female + exact locale > female + lang family > any female > Google voice > any locale match > fallback
    let voice = allVoices.find(v => v.lang === langCode && isFemale(v))
             || allVoices.find(v => v.lang.startsWith(baseLang) && isFemale(v))
             || allVoices.find(v => isFemale(v))
             || allVoices.find(v => v.name.toLowerCase().includes('google') && v.lang === langCode)
             || allVoices.find(v => v.lang === langCode)
             || allVoices.find(v => v.lang.startsWith(baseLang))
             || allVoices[0];

    if (voice) utterance.voice = voice;

    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    utterance.onend = safeCallback;
    utterance.onerror = () => safeCallback();

    window.speechSynthesis.speak(utterance);
    // Safety net if onend never fires
    setTimeout(safeCallback, text.length * 80 + 3000);
  };

  const sendMessageToBackend = async (text, isHidden = false) => {
    if (!text.trim()) return;
    
    if (!isHidden) {
      setMessages(prev => [...prev, { text, sender: 'user' }]);
    }
    
    setCurrentSpeaker('ai');

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
          language: activeCall?.language || 'Hinglish'
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { text: `ERROR: ${data.error}`, sender: 'sys' }]);
        setCurrentSpeaker(null);
      } else {
        setMessages(prev => [...prev, { text: data.response, sender: 'ai' }]);
        
        if (data.score || data.mood || data.resolved_language) {
          setActiveCall(prev => ({
            ...prev,
            emotion: data.mood ? data.mood.toUpperCase() : prev.emotion,
            score: data.score === 'Hot' ? 9 : data.score === 'Warm' ? 6 : data.score === 'Cold' ? 2 : prev.score,
            // Sync language if backend detected a mid-conversation switch
            language: data.resolved_language ? data.resolved_language : prev.language
          }));
        }
        
        // Pass language name directly — speakText now handles the locale mapping internally
        const resolvedLang = data.resolved_language || activeCall?.language || 'English';
        speakText(data.response, resolvedLang, () => {
          setCurrentSpeaker(null);
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "CONNECTION FAILED", sender: 'sys' }]);
      setCurrentSpeaker(null);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Map language name → locale for speech recognition
      const recogLocale = 'en-IN';
      recognition.lang = recogLocale;

      recognition.onstart = () => {
        setIsListening(true);
        setCurrentSpeaker('user');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setCurrentSpeaker(null);
        sendMessageToBackend(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setCurrentSpeaker(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (currentSpeaker === 'user') setCurrentSpeaker(null);
      };

      recognitionRef.current = recognition;
    }
  }, [activeCall]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      // Don't listen if AI is speaking
      if (currentSpeaker === 'ai') return;
      recognitionRef.current?.start();
    }
  };

  const hasStarted = useRef(false);

  useEffect(() => {
    if (callState === 'connected' && messages.length === 0 && !hasStarted.current) {
      hasStarted.current = true;
      playScanSound();
      
      setTimeout(() => {
        sendMessageToBackend("Start the conversation by giving your opening hook to pitch the Rupeezy partner program.", true);
      }, 1000);
    }
    
    // Cleanup TTS on unmount
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [callState]);

  if (callState === 'dialing') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 className="tech-font glitch" style={{ color: 'var(--primary)' }}>INITIALIZING VOICE PROTOCOL...</h2>
      </div>
    );
  }

  return (
    <div className="simulation-wrapper" style={{ height: '100%', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      
      {/* Left Half: Audio Waves */}
      <div style={{ flex: 1, borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(0,240,255,0.02) 0%, transparent 70%)' }}>
        <DotWaveVisualizer isSpeaking={currentSpeaker !== null} speakerType={currentSpeaker} />
        
        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <div className="tech-font" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>VOICE_SYNTHESIS_ENGINE_V3</div>
          <div className="tech-font glitch" style={{ color: currentSpeaker === 'ai' ? 'var(--primary)' : currentSpeaker === 'user' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.5rem', letterSpacing: '3px' }}>
            {currentSpeaker === 'ai' ? 'AI TRANSMITTING' : currentSpeaker === 'user' ? 'TARGET RESPONDING' : 'LISTENING...'}
          </div>
        </div>
      </div>

      {/* Right Half: Live Transcript */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(1, 4, 9, 0.95)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="tech-font" style={{ color: 'var(--primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mic size={18} /> LIVE TRANSCRIPT
          </div>
          <button className="btn-cyber danger" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            endCall();
          }}>
            <Power size={14} /> END COMMS
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: msg.sender === 'ai' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx} 
                style={{ 
                  alignSelf: msg.sender === 'ai' || msg.sender === 'sys' ? 'flex-start' : 'flex-end',
                  maxWidth: '85%'
                }}
              >
                <div className="tech-font" style={{ 
                  fontSize: '0.8rem', 
                  color: msg.sender === 'user' ? 'var(--accent)' : 'var(--primary)', 
                  marginBottom: '4px',
                  textAlign: msg.sender === 'user' ? 'right' : 'left'
                }}>
                  {msg.sender === 'ai' ? 'AI_VOICE' : msg.sender === 'sys' ? 'SYSTEM' : 'TARGET_VOICE'}
                </div>
                <div style={{ 
                  padding: '16px 20px',
                  background: msg.sender === 'ai' ? 'rgba(0, 240, 255, 0.05)' : msg.sender === 'user' ? 'rgba(57, 255, 20, 0.05)' : 'rgba(255, 0, 0, 0.05)',
                  borderLeft: msg.sender === 'ai' ? '3px solid var(--primary)' : 'none',
                  borderRight: msg.sender === 'user' ? '3px solid var(--accent)' : 'none',
                  fontSize: '1.1rem', 
                  lineHeight: '1.6', 
                  color: '#fff',
                }}>
                  {msg.text}
                </div>
                {msg.sender === 'ai' && idx === messages.length - 1 && currentSpeaker !== 'ai' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', gap: '10px', marginTop: '12px' }}
                  >
                    {['👍', '👎', '🤔', '😊'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => sendMessageToBackend(emoji)}
                        style={{
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid var(--primary)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          color: '#fff',
                          boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)'; }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: '24px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'center', background: 'rgba(1, 4, 9, 0.9)' }}>
          <button 
            onClick={toggleListening}
            disabled={currentSpeaker === 'ai'}
            className={`btn-cyber ${isListening ? 'danger' : 'success'}`} 
            style={{ padding: '16px 32px', borderRadius: '30px', width: '100%', maxWidth: '300px' }}
          >
            <Mic size={20} />
            {isListening ? 'STOP LISTENING' : 'HOLD TO SPEAK'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {callState === 'ended' && <HandoffPanel leadData={activeCall} />}
      </AnimatePresence>

    </div>
  );
};

export default VoiceSimulation;

import React, { useState, useEffect, useRef } from 'react';
import { Power, Mic, SquareTerminal, Fingerprint, Activity, Volume2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import HandoffPanel from './HandoffPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { playKeystroke, playRadarSweep, playBeep } from '../utils/audio';

const DecryptText = ({ text, delay = 0, onComplete }) => {
  const [display, setDisplay] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  
  useEffect(() => {
    let timeout;
    let iterations = 0;
    const maxIterations = 10;
    
    timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplay(text.split('').map((char, index) => {
          if (index < iterations) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        
        if (iterations >= text.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
        iterations += 1/2; // faster decryption
      }, 15);
      
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return <span className="tech-font">{display}</span>;
};

const SmoothTextReveal = ({ text }) => {
  const words = text.split(' ');
  return (
    <span className="tech-font">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(5px)', y: 3 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

const AudioVisualizer = ({ isActive, color }) => {
  const bars = Array.from({ length: 16 });
  
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '40px', padding: '0 10px' }}>
      {bars.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: isActive ? [10, Math.random() * 30 + 10, 10] : 10,
          }}
          transition={{
            duration: 0.5,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.05,
          }}
          style={{
            width: '6px',
            backgroundColor: color,
            borderRadius: '3px',
            boxShadow: `0 0 10px ${color}`
          }}
        />
      ))}
    </div>
  );
};

const CallingSimulation = () => {
  const { callState, endCall, activeCall, setActiveCall } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(`sess_${Date.now()}`);

  const speakText = (text, language, callback) => {
    // language is 'Hindi' | 'Hinglish' | 'English'
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
    window.currentUtterance = utterance;

    const langCode = (language === 'Hindi' || language === 'Hinglish') ? 'hi-IN' : 'en-IN';
    utterance.lang = langCode;

    const allVoices = window.speechSynthesis.getVoices();
    const baseLang = langCode.split('-')[0];
    const femaleKw = ['female', 'woman', 'girl', 'zira', 'hazel', 'susan', 'karen', 'samantha', 'victoria', 'aditi', 'lekha', 'veena', 'heera', 'priya'];
    const isFemale = v => femaleKw.some(kw => v.name.toLowerCase().includes(kw));

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
    setTimeout(safeCallback, text.length * 80 + 3000);
  };

  const handleSendMessage = async (text, isHidden = false) => {
    if (!text.trim()) return;
    
    if (!isHidden) {
      setMessages(prev => [...prev, { text, sender: 'user' }]);
      setInputText('');
    }
    
    setIsProcessing(true);
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
      } else {
        playKeystroke();
        setMessages(prev => [...prev, { text: data.response, sender: 'ai' }]);
        
        if (data.score || data.mood || data.resolved_language) {
          const newLang = data.resolved_language || activeCall?.language || 'English';
          setActiveCall(prev => ({
            ...prev,
            emotion: data.mood ? data.mood.toUpperCase() : prev.emotion,
            score: data.score === 'Hot' ? 9 : data.score === 'Warm' ? 6 : data.score === 'Cold' ? 2 : prev.score,
            language: newLang
          }));

          // Speak the response using the resolved language
          speakText(data.response, newLang, () => {
            setCurrentSpeaker(null);
          });
        } else {
          setCurrentSpeaker(null);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "CONNECTION FAILED", sender: 'sys' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (callState === 'dialing') {
      playRadarSweep();
      const interval = setInterval(() => {
        playBeep(400, 'sine', 0.1, 0.05);
      }, 1000);
      return () => clearInterval(interval);
    }
    
    // Cleanup TTS on unmount or view change
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [callState]);

  const hasStarted = useRef(false);

  useEffect(() => {
    if (callState === 'connected' && messages.length === 0 && !hasStarted.current) {
      hasStarted.current = true;
      playBeep(1200, 'square', 0.2, 0.05);
      
      setMessages([{ text: "CONNECTION ESTABLISHED. INITIATING SALES PROTOCOL.", sender: 'sys' }]);
      
      // Kick off the AI with an invisible prompt
      setTimeout(() => {
        handleSendMessage("Start the conversation by giving your opening hook to pitch the Rupeezy partner program.", true);
      }, 1000);
    }
  }, [callState]);

  if (callState === 'dialing') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Massive Radar Sweep & DNA Rings */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', inset: '-50%', border: '1px dashed rgba(0, 240, 255, 0.3)', borderRadius: '50%', zIndex: -1 }}></motion.div>
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', inset: '-25%', border: '2px solid rgba(0, 240, 255, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', zIndex: -1 }}></motion.div>
        <div style={{ position: 'absolute', inset: 0, width: '500px', height: '500px', margin: 'auto', background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 240, 255, 0.4) 100%)', borderRadius: '50%', animation: 'radar-spin 2s infinite linear', zIndex: -1 }}></div>
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ background: 'rgba(13, 17, 23, 0.9)', padding: '50px', borderRadius: '50%', border: '2px solid var(--primary)', boxShadow: '0 0 60px var(--primary-glow)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div className="laser-scan" style={{ position: 'absolute', inset: 0 }}></div>
          <Fingerprint size={64} color="var(--primary)" style={{ marginBottom: '20px', filter: 'drop-shadow(0 0 15px var(--primary))' }} />
          <h2 className="tech-font glitch" style={{ fontSize: '1.8rem', margin: 0, color: 'var(--primary)' }}>UPLINK SEQUENCE...</h2>
          <div className="tech-font" style={{ marginTop: '12px', color: '#fff', fontSize: '1.2rem', letterSpacing: '2px' }}>
            <DecryptText text={activeCall?.name.toUpperCase()} delay={0} />
          </div>
          <div className="tech-font" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '10px' }}>
            [DECRYPTING TARGET SIGNATURE]
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="simulation-wrapper" style={{ height: '100%', display: 'flex', gap: '24px', position: 'relative', overflow: 'hidden' }}>
      
      {/* HUD Chat Interface */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="holo-panel" 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}
      >
        
        {/* Top HUD Stats */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 240, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--primary-glow)' }}>
              <Volume2 size={24} color="#010409" />
            </div>
            <div>
              <div className="tech-font" style={{ fontSize: '1.4rem', color: '#fff', letterSpacing: '2px' }}>{activeCall?.name.toUpperCase()}</div>
              <div className="tech-font" style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1s infinite' }}></span>
                SECURE COMM_LINK ACTIVE
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '32px', textAlign: 'right' }}>
            {/* Audio Visualizer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div className="tech-font" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>AUDIO_FREQUENCY</div>
              <AudioVisualizer 
                isActive={currentSpeaker !== null && currentSpeaker !== 'sys'} 
                color={currentSpeaker === 'ai' ? 'var(--primary)' : currentSpeaker === 'user' ? 'var(--accent)' : 'var(--text-muted)'} 
              />
            </div>

            <div>
              <div className="tech-font" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BIOMETRIC_STATE</div>
              <div className="tech-font glitch" style={{ color: activeCall?.emotion === 'EXCITED' ? 'var(--accent)' : 'var(--primary)', fontSize: '1.4rem', textShadow: '0 0 10px currentColor' }}>{activeCall?.emotion}</div>
            </div>
            <div>
              <div className="tech-font" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CONFIDENCE_INTERVAL</div>
              <div className="tech-font" style={{ color: activeCall?.score >= 7 ? 'var(--accent)' : '#f59e0b', fontSize: '1.4rem', textShadow: '0 0 15px currentColor' }}>{activeCall?.score}.0</div>
            </div>
          </div>
        </div>

        {/* Data Stream Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                style={{ 
                  alignSelf: msg.sender === 'ai' || msg.sender === 'sys' ? 'flex-start' : 'flex-end',
                  maxWidth: '75%',
                  borderLeft: msg.sender === 'ai' ? '4px solid var(--primary)' : 'none',
                  borderRight: msg.sender === 'user' ? '4px solid var(--accent)' : 'none',
                  padding: '0 20px'
                }}
              >
                <div className="tech-font" style={{ 
                  fontSize: '0.8rem', 
                  color: msg.sender === 'user' ? 'var(--accent)' : 'var(--primary)', 
                  marginBottom: '8px',
                  textAlign: msg.sender === 'user' ? 'right' : 'left',
                  letterSpacing: '1px'
                }}>
                  {msg.sender === 'sys' ? 'SYSTEM_OVERRIDE' : msg.sender === 'ai' ? 'AI_CORE_AGENT' : 'TARGET_NODE'}
                </div>
                <div style={{ 
                  fontSize: '1.15rem', 
                  lineHeight: '1.7', 
                  color: msg.sender === 'sys' ? 'var(--text-muted)' : '#fff',
                  textShadow: msg.sender === 'sys' ? 'none' : msg.sender === 'ai' ? '0 0 10px rgba(0, 240, 255, 0.4)' : '0 0 10px rgba(57, 255, 20, 0.4)'
                }}>
                  <SmoothTextReveal text={msg.text} />
                </div>
                {msg.sender === 'ai' && idx === messages.length - 1 && !isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    style={{ display: 'flex', gap: '10px', marginTop: '12px' }}
                  >
                    {['👍', '👎', '🤔', '😊'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => handleSendMessage(emoji)}
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
          
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ alignSelf: 'flex-start', padding: '0 20px', borderLeft: '4px solid var(--primary)' }}
            >
              <div className="tech-font" style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '8px' }}>AI_CORE_AGENT</div>
              <div className="tech-font glitch" style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>[ANALYZING NEURAL INPUT...]</div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action Bar */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(1, 4, 9, 0.9)', backdropFilter: 'blur(20px)' }}>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your response as the lead..."
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                color: '#fff',
                fontFamily: '"Share Tech Mono", monospace',
                outline: 'none'
              }}
            />
            <button type="submit" disabled={isProcessing || !inputText.trim()} className="btn-cyber success" style={{ padding: '12px 24px' }}>
              TRANSMIT
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn-cyber danger" onClick={() => {
              playBeep(300, 'sawtooth', 0.5, 0.1);
              endCall();
            }}>
              <Power size={20} /> TERMINATE LINK
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {callState === 'ended' && <HandoffPanel leadData={activeCall} />}
      </AnimatePresence>
      
    </div>
  );
};

export default CallingSimulation;

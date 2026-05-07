import React, { useState, useEffect } from 'react';
import { Network, Send, AlertTriangle, Fingerprint, ScanEye } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { playScanSound, playBeep } from '../utils/audio';

const HandoffPanel = ({ leadData }) => {
  const { closeSummary } = useAppContext();
  const [whatsappSent, setWhatsappSent] = useState(false);

  const isHot = leadData.score >= 7;
  const isWarm = leadData.score >= 4 && leadData.score < 7;
  
  const statusColor = isHot ? 'var(--accent)' : isWarm ? '#f59e0b' : 'var(--text-muted)';
  const statusLabel = isHot ? 'HOT_TARGET' : isWarm ? 'WARM_TARGET' : 'COLD_TARGET';

  useEffect(() => {
    // Play scan sound when dossier opens
    playScanSound();
  }, []);

  const handleConnectRM = () => {
    playBeep(1500, 'sine', 0.1, 0.05);
    
    const cleanPhone = leadData.phone.replace(/[^0-9]/g, '');
    const message = `[SYSTEM OVERRIDE] SalesGenie AI Handoff 🤖\n\nTarget: ${leadData.name}\nStatus: HOT_LEAD 🔥\nConfidence Score: ${leadData.score}0%\n\nThe AI agent has primed this lead. Ready for human onboarding sequence.`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    closeSummary(leadData.score, isHot ? 'Hot' : isWarm ? 'Warm' : 'Cold');
  };

  const handleSendWhatsapp = () => {
    playBeep(1200, 'square', 0.1, 0.05);
    setWhatsappSent(true);
    
    const cleanPhone = leadData.phone.replace(/[^0-9]/g, '');
    const message = `[SalesGenie AI Automated Comms]\n\nHello ${leadData.name}, here is the Rupeezy partner program brochure as discussed with our AI assistant. Let us know when you are ready to earn 100% brokerage!`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    setTimeout(() => {
      closeSummary(leadData.score, isHot ? 'Hot' : isWarm ? 'Warm' : 'Cold');
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="holo-panel" 
      style={{ 
        position: 'absolute', top: '0', right: '0', bottom: '0', width: '480px',
        borderRadius: '0', borderLeft: `3px solid ${statusColor}`,
        display: 'flex', flexDirection: 'column', zIndex: 100,
        background: 'rgba(1, 4, 9, 0.98)',
      }}
    >
      
      <div style={{ padding: '32px', borderBottom: '1px solid var(--surface-border)', background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 240, 255, 0.05) 10px, rgba(0, 240, 255, 0.05) 20px)' }}>
        <div className="tech-font glitch" style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          SESSION_TERMINATED
        </div>
        <h2 className="glitch" style={{ margin: '0 0 16px 0', fontSize: '2rem', color: '#fff', textShadow: `0 0 20px ${statusColor}` }}>TARGET DOSSIER</h2>
        <div className="tech-font" style={{ display: 'inline-block', background: statusColor, color: '#010409', padding: '6px 16px', fontWeight: 'bold', letterSpacing: '1px' }}>
          {statusLabel} // PROB:{leadData.score}0%
        </div>
      </div>

      <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Contact Info */}
        <div style={{ border: '1px solid var(--surface-border)', padding: '20px', background: 'rgba(0, 240, 255, 0.05)', position: 'relative', overflow: 'hidden' }}>
          <ScanEye size={100} color="var(--primary)" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }} />
          <div className="tech-font" style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Fingerprint size={16} /> IDENTIFICATION_RECORD
          </div>
          <div style={{ fontWeight: 600, fontSize: '1.4rem', color: '#fff', letterSpacing: '2px' }}>{leadData.name.toUpperCase()}</div>
          <div className="tech-font" style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '1rem' }}>UPLINK_ID: {leadData.phone}</div>
        </div>

        {/* AI Analysis */}
        <div>
          <div className="tech-font" style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '12px' }}>NEURAL_ANALYSIS_REPORT</div>
          <div style={{ borderLeft: `3px solid ${statusColor}`, paddingLeft: '20px', background: 'linear-gradient(90deg, rgba(255,255,255,0.02), transparent)' }}>
            <p className="tech-font" style={{ margin: 0, fontSize: '1.1rem', lineHeight: '1.8', color: '#e6edf3' }}>
              {isHot 
                ? "> Target confirmed 15 external nodes (clients).\n> Interest level peaked during 100% margin reveal.\n> Resistance bypassed successfully.\n> IMMEDIATE HUMAN OVERRIDE RECOMMENDED." 
                : isWarm 
                ? "> Target requested processing time.\n> Secondary engagement sequence required.\n> Initiate automated tracking."
                : "> Target hostile or unresponsive.\n> Archiving signature."}
            </p>
          </div>
        </div>

        {/* Action Items */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--surface-border)' }}>
          <div className="tech-font" style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '16px' }}>EXECUTE_COMMAND</div>
          
          {isHot ? (
            <button className="btn-cyber success" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.1rem' }} onClick={handleConnectRM}>
              <Network size={22} /> TRANSFER TO HUMAN AGENT
            </button>
          ) : (
            <button 
              className="btn-cyber" 
              style={{ width: '100%', justifyContent: 'center', padding: '16px', borderColor: whatsappSent ? 'var(--accent)' : 'var(--primary)' }} 
              onClick={handleSendWhatsapp}
              disabled={whatsappSent}
            >
              <Send size={22} /> {whatsappSent ? 'PAYLOAD DELIVERED' : 'DEPLOY AUTOMATED SEQUENCE'}
            </button>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default HandoffPanel;

import React, { useRef } from 'react';
import { Target, Activity, Zap, Clock, TerminalSquare, Network, RadioTower } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { playBeep } from '../utils/audio';

const TiltCard = ({ title, value, icon, color }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateY, rotateX, transformStyle: "preserve-3d", perspective: "1000px" }}
      className="holo-panel"
      onMouseEnter={() => playBeep(1200, 'sine', 0.05, 0.02)}
    >
      <div style={{ transform: "translateZ(30px)", width: '100%', height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color, boxShadow: `0 0 10px ${color}` }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div className="tech-font" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>// {title}</div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', border: `1px solid rgba(255,255,255,0.1)` }}>
            {icon}
          </div>
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: '#fff', textShadow: `0 0 15px ${color}` }}>
          {value}
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const { leads, startCall } = useAppContext();

  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === 'Hot').length;
  const conversionRate = totalLeads ? Math.round((hotLeads / totalLeads) * 100) : 0;

  // Mock streaming data for the chart
  const streamData = Array.from({ length: 20 }).map((_, i) => ({
    name: i,
    value: Math.floor(Math.random() * 50) + 50 + (i * 2),
    intensity: Math.random() * 100
  }));

  const handleStartCall = () => {
    playBeep(800, 'square', 0.1, 0.05);
    setTimeout(() => playBeep(1200, 'square', 0.1, 0.05), 150);
    startCall('Vikram Singh', '+91 99887 77665');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="glitch" style={{ fontSize: '2.5rem', margin: 0, fontWeight: 800, letterSpacing: '2px', textShadow: '0 0 15px var(--primary-glow)', color: 'var(--primary)' }}>SALES GENIE</h1>
          <p className="tech-font" style={{ color: 'var(--text-tech)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'pulse 1.5s infinite' }}></span>
            INITIALIZING NEURAL SALES FEED...
          </p>
        </div>
        <button className="btn-cyber" onClick={handleStartCall}>
          <RadioTower size={18} />
          <span>INJECT LEAD</span>
        </button>
      </header>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px', perspective: '1000px' }}>
        <TiltCard title="TOTAL ENTITIES" value={totalLeads} icon={<Target size={28} color="var(--primary)" />} color="var(--primary)" />
        <TiltCard title="HOT TARGETS" value={hotLeads} icon={<Activity size={28} color="var(--accent)" />} color="var(--accent)" />
        <TiltCard title="CONVERSION YIELD" value={`${conversionRate}%`} icon={<Zap size={28} color="var(--secondary)" />} color="var(--secondary)" />
        <TiltCard title="AVG CYCLE TIME" value="2m 14s" icon={<Clock size={28} color="#f59e0b" />} color="#f59e0b" />
      </div>

      <div className="dashboard-grid-container" style={{ display: 'grid', gap: '24px', flex: 1, minHeight: '400px' }}>
        
        {/* Dynamic Data Grid */}
        <div className="holo-panel" style={{ display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative' }}>
          <h3 className="tech-font" style={{ color: 'var(--primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
            <Network size={18} /> INTERACTIVE_NODE_MAP
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', alignContent: 'start' }}>
            <AnimatePresence>
              {leads.map((lead, idx) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.1 }}
                  key={lead.id || idx} 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    background: 'rgba(13, 17, 23, 0.8)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={() => playBeep(2000, 'sine', 0.02, 0.01)}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '2px', width: `${lead.score * 10}%`, background: lead.status === 'Hot' ? 'var(--accent)' : lead.status === 'Warm' ? '#f59e0b' : 'var(--text-muted)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '1px' }}>{lead.name.toUpperCase()}</div>
                    <span className={`badge-tech ${lead.status.toLowerCase()}`}>{lead.status}</span>
                  </div>
                  <div className="tech-font" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <span>[ID: {lead.phone}]</span>
                    <span>LANG: {lead.language}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div className="tech-font" style={{ color: 'var(--text-tech)', fontSize: '0.8rem' }}>CONFIDENCE: {lead.score}0%</div>
                    <div className="tech-font" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{lead.duration}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Neural Network Activity */}
        <div className="holo-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <h3 className="tech-font" style={{ color: 'var(--accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} />
            NETWORK_TRAFFIC
          </h3>
          <div style={{ flex: 1, position: 'relative', minHeight: '200px' }}>
            {/* Grid overlay for radar look */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(57, 255, 20, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 20, 0.1) 1px, transparent 1px)', backgroundSize: '30px 30px', zIndex: 0, pointerEvents: 'none' }}></div>
            
            <ResponsiveContainer width="100%" height="100%" style={{ zIndex: 1, position: 'relative' }}>
              <LineChart data={streamData}>
                <Tooltip 
                  contentStyle={{ background: 'rgba(1, 4, 9, 0.9)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: '"Share Tech Mono", monospace', backdropFilter: 'blur(10px)' }} 
                  itemStyle={{ color: 'var(--accent)' }}
                  cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={false} activeDot={{ r: 8, fill: 'var(--bg-deep)', stroke: 'var(--accent)', strokeWidth: 2 }} animationDuration={2000} />
                <Line type="step" dataKey="intensity" stroke="rgba(0, 240, 255, 0.4)" strokeWidth={1} dot={false} animationDuration={2000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;

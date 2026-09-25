import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * RUET Academic Intelligence Network
 * Interactive 2.5D Canvas-based academic ecosystem visualization
 * 
 * Features:
 * - Constant safe angular distance (360° / 7 = ~51.4°) so nodes NEVER overlap or collide
 * - Harmonious, synchronized slow orbital rotation
 * - Rich Multi-Color Visual System:
 *   - Courses: Electric Blue (#2563EB)
 *   - Teachers: Indigo / Violet (#6366F1)
 *   - Students: Cyan / Teal (#06B6D4)
 *   - Results: Emerald (#10B981)
 *   - Requests: Amber / Gold (#F59E0B)
 *   - Reports: Rose / Crimson (#F43F5E)
 *   - Departments: Purple (#8B5CF6)
 * - Central Core: Deep Navy / Midnight with Cyan & Electric Blue aura
 * - Mouse parallax shift (±15px)
 * - Interactive hover with contextual academic info tooltips
 * - High-DPI crisp retina canvas rendering
 */

const NODES_DATA = [
  { id: 'courses',     label: 'COURSES',     count: '42 Sessional Courses', detail: 'Elective & Core Lab Curriculum', color: '#2563eb', glow: 'rgba(37, 99, 235, 0.45)' },
  { id: 'teachers',    label: 'TEACHERS',    count: '31 Faculty Members',   detail: 'Authorized Department Faculty', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.45)' },
  { id: 'students',    label: 'STUDENTS',    count: '684 Enrolled Students', detail: 'Series 21, 22, 23 & 24',        color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)' },
  { id: 'results',     label: 'RESULTS',     count: '98.4% Published',      detail: 'Calculated Grade Point Average', color: '#10b981', glow: 'rgba(16, 185, 129, 0.45)' },
  { id: 'requests',    label: 'REQUESTS',    count: 'Mark Verification',    detail: 'Direct Student-to-Teacher Flow', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' },
  { id: 'reports',     label: 'REPORTS',     count: 'Official PDF & XLSX',  detail: 'Dean-Approved Academic Formats', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)' },
  { id: 'departments', label: 'DEPARTMENTS', count: '8 Academic Depts',     detail: 'ECE, ETE, CSE, EEE & More',     color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.45)' }
];

// Constant angular step guarantees uniform safe spacing across all 7 nodes (never overlaps)
const NODE_COUNT = NODES_DATA.length;
const ANGLE_STEP = (Math.PI * 2) / NODE_COUNT;

// Connection flows for animated data particles
const DATA_FLOW_PATHS = [
  ['courses', 'teachers'],
  ['teachers', 'students'],
  ['students', 'results'],
  ['results', 'reports'],
  ['students', 'requests'],
  ['requests', 'teachers'],
  ['departments', 'courses'],
  ['departments', 'teachers']
];

export default function AcademicIntelligenceNetwork({ onNodeClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { isDarkMode } = useTheme();

  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Particles flowing along paths
  const particlesRef = useRef([
    { pathIdx: 0, progress: 0.1, speed: 0.0035, color: '#2563eb' },
    { pathIdx: 1, progress: 0.45, speed: 0.0032, color: '#6366f1' },
    { pathIdx: 2, progress: 0.78, speed: 0.0038, color: '#06b6d4' },
    { pathIdx: 3, progress: 0.25, speed: 0.0028, color: '#10b981' },
    { pathIdx: 4, progress: 0.6, speed: 0.0034, color: '#f59e0b' },
    { pathIdx: 6, progress: 0.35, speed: 0.003, color: '#8b5cf6' }
  ]);

  // Track mouse coordinates for subtle parallax
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mousePosRef.current.targetX = (x / (rect.width / 2)) * 16;
    mousePosRef.current.targetY = (y / (rect.height / 2)) * 10;

    // Check node hover hit-test
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    let hit = null;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const cx = width / 2 + mousePosRef.current.x;
    const cy = height / 2 + mousePosRef.current.y;
    const baseRadius = Math.min(width, height) * 0.38;

    // Safe synchronized rotation angle calculation
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const rotationAngle = elapsed * 0.07; // gentle, steady rotation

    NODES_DATA.forEach((n, idx) => {
      const angle = ANGLE_STEP * idx + rotationAngle;
      const r = baseRadius * 0.82;
      const nx = cx + Math.cos(angle) * r;
      const ny = cy + Math.sin(angle) * r * 0.72; // 2.5D perspective squish

      const dist = Math.hypot(canvasX - nx, canvasY - ny);
      if (dist < 28) {
        hit = { ...n, x: nx, y: ny };
      }
    });

    if (hit) {
      setHoveredNode(hit);
      setTooltipPos({ x: hit.x, y: hit.y });
    } else {
      setHoveredNode(null);
    }
  }, []);

  const handleMouseLeave = () => {
    mousePosRef.current.targetX = 0;
    mousePosRef.current.targetY = 0;
    setHoveredNode(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      // Smooth entrance sequence: 0 to 1 over 1.6 seconds
      const entrance = Math.min(1, elapsed / 1.6);
      const easeEntrance = 1 - Math.pow(1 - entrance, 3);

      // Smooth parallax damping
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * 0.05;
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2 + mousePosRef.current.x;
      const cy = height / 2 + mousePosRef.current.y;
      const baseRadius = Math.min(width, height) * 0.38;

      // Multi-Color Palette Configuration
      const lineColor = isDarkMode ? 'rgba(99, 102, 241, 0.16)' : 'rgba(37, 99, 235, 0.14)';
      const lineActiveColor = isDarkMode ? 'rgba(56, 189, 248, 0.65)' : 'rgba(37, 99, 235, 0.6)';
      const centerFill = isDarkMode ? '#0b132b' : '#f0f7ff';
      const centerBorder = isDarkMode ? '#38bdf8' : '#2563eb';

      // 1. Draw Subtle Orbital Guide Rings (2.5D perspective)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, baseRadius * 0.82, baseRadius * 0.59, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(37, 99, 235, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, baseRadius * 0.52, baseRadius * 0.37, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isDarkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(6, 182, 212, 0.08)';
      ctx.setLineDash([2, 5]);
      ctx.stroke();
      ctx.restore();

      // Constant angular velocity guarantees safe distance between all nodes (NO OVERLAPPING!)
      const rotationAngle = elapsed * 0.07;
      const nodePos = {};

      NODES_DATA.forEach((n, idx) => {
        const angle = ANGLE_STEP * idx + rotationAngle;
        const r = baseRadius * 0.82 * easeEntrance;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * 0.72; // 2.5D perspective tilt
        nodePos[n.id] = { ...n, x, y, angle };
      });

      // 2. Draw Connection Lines from Center Core to Outer Nodes
      NODES_DATA.forEach((n) => {
        const p = nodePos[n.id];
        if (!p) return;

        const isHover = hoveredNode && hoveredNode.id === n.id;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = isHover ? (n.glow || lineActiveColor) : lineColor;
        ctx.lineWidth = isHover ? 2.2 : 1;
        ctx.stroke();
      });

      // 3. Draw Inter-node Flow Connections
      DATA_FLOW_PATHS.forEach(([fromId, toId]) => {
        const from = nodePos[fromId];
        const to = nodePos[toId];
        if (!from || !to) return;

        const isRelated = hoveredNode && (hoveredNode.id === fromId || hoveredNode.id === toId);

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = isRelated ? (from.glow || lineActiveColor) : (isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.1)');
        ctx.lineWidth = isRelated ? 2 : 0.85;
        ctx.stroke();
      });

      // 4. Draw Flowing Light Particles along Data Paths
      particlesRef.current.forEach((part) => {
        part.progress += part.speed;
        if (part.progress > 1) part.progress = 0;

        const [fromId, toId] = DATA_FLOW_PATHS[part.pathIdx] || [];
        const from = nodePos[fromId];
        const to = nodePos[toId];
        if (!from || !to) return;

        const px = from.x + (to.x - from.x) * part.progress;
        const py = from.y + (to.y - from.y) * part.progress;

        // Particle Glow using node's semantic color
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 7);
        pGrad.addColorStop(0, part.color || '#38bdf8');
        pGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Central Core: "RUET ACADEMIC INTELLIGENCE" (Deep Navy & Cyan/Electric Blue)
      const coreRadius = Math.max(34, Math.min(width, height) * 0.068) * easeEntrance;

      // Atmospheric outer glow
      const coreGlow = ctx.createRadialGradient(cx, cy, coreRadius * 0.4, cx, cy, coreRadius * 2.2);
      coreGlow.addColorStop(0, isDarkMode ? 'rgba(56, 189, 248, 0.28)' : 'rgba(37, 99, 235, 0.2)');
      coreGlow.addColorStop(0.7, isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)');
      coreGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Core Circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = centerFill;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = centerBorder;
      ctx.stroke();

      // Central Pulse Ring
      const pulseTime = (elapsed % 3) / 3;
      const pulseRadius = coreRadius + pulseTime * 26;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 * (1 - pulseTime)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Central Typography
      ctx.font = `bold ${Math.max(8.5, coreRadius * 0.23)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RUET', cx, cy - coreRadius * 0.32);
      ctx.font = `600 ${Math.max(6.5, coreRadius * 0.17)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText('ACADEMIC', cx, cy);
      ctx.font = `500 ${Math.max(6, coreRadius * 0.15)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = isDarkMode ? '#38bdf8' : '#2563eb';
      ctx.fillText('INTELLIGENCE', cx, cy + coreRadius * 0.32);
      ctx.restore();

      // 6. Draw Orbiting Nodes (Each with distinct semantic multi-color)
      NODES_DATA.forEach((n) => {
        const p = nodePos[n.id];
        if (!p) return;

        const isHover = hoveredNode && hoveredNode.id === n.id;
        const radius = (isHover ? 18 : 13) * easeEntrance;

        // Node Glow with node's specific vibrant color
        const glowGrad = ctx.createRadialGradient(p.x, p.y, radius * 0.4, p.x, p.y, radius * 2.3);
        glowGrad.addColorStop(0, isHover ? n.glow : (isDarkMode ? n.glow.replace('0.45', '0.22') : n.glow.replace('0.45', '0.15')));
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.3, 0, Math.PI * 2);
        ctx.fill();

        // Node Circle Frame
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = isHover ? 2.8 : 2;
        ctx.strokeStyle = isHover ? n.color : (isDarkMode ? '#334155' : '#cbd5e1');
        ctx.stroke();

        // Inner Vibrant Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Node Label
        ctx.font = `bold ${isHover ? 11 : 9.5}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isDarkMode ? (isHover ? n.color : '#cbd5e1') : (isHover ? n.color : '#334155');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(n.label, p.x, p.y + radius + 4);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDarkMode, hoveredNode]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[460px] md:h-[580px] lg:h-[620px] select-none flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        aria-label="RUET Academic Intelligence Interactive Visualization"
      />

      {/* Floating Hover Contextual Academic Data Badge */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 14}px`,
            borderColor: hoveredNode.color
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredNode.color }}></span>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tracking-wider uppercase">
              {hoveredNode.label}
            </span>
          </div>
          <div className="text-[12px] font-bold mt-0.5" style={{ color: hoveredNode.color }}>
            {hoveredNode.count}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {hoveredNode.detail}
          </div>
        </div>
      )}

      {/* Subtle Bottom System Status Caption */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[10px] font-mono text-slate-500 dark:text-slate-400 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          Synchronized Academic Constellation &bull; Safe-distance Orbital Flow
        </span>
      </div>
    </div>
  );
}

import React, { useRef, useState } from 'react';

interface TouchJoystickProps {
  onVectorChange: (x: number, y: number) => void;
}

export const TouchJoystick: React.FC<TouchJoystickProps> = ({ onVectorChange }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const maxRadius = 38;

  const updateFromClient = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy });
    onVectorChange(dx / maxRadius, dy / maxRadius);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || activePointerId.current !== e.pointerId) return;
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onVectorChange(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-28 h-28 rounded-full touch-none select-none flex items-center justify-center border border-[#c4984a]/50 bg-[#0d0c10]/65 shadow-[0_6px_24px_rgba(0,0,0,0.75)]"
      aria-label="Movement Joystick"
    >
      <div className="absolute inset-2.5 rounded-full border border-[#c4984a]/20 pointer-events-none" />
      <div
        className="w-11 h-11 rounded-full border-2 border-[#f3c669] bg-gradient-to-b from-[#3d3122] to-[#1a1512] shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none transition-transform duration-75"
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px) scale(${active ? 1.06 : 1})`,
        }}
      />
    </div>
  );
};

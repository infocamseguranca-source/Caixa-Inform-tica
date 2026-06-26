import React, { useState } from 'react';

export default function PatternLockWidget({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const activeDots = value ? value.split('-').map(Number) : [];
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDotInteraction = (dotIndex: number) => {
    if (activeDots.includes(dotIndex)) return;
    const newDots = [...activeDots, dotIndex];
    onChange(newDots.join('-'));
  };

  const handleStart = (dotIndex: number) => {
    setIsDrawing(true);
    onChange(dotIndex.toString());
  };

  const handleEnter = (dotIndex: number) => {
    if (!isDrawing) return;
    if (activeDots.includes(dotIndex)) return;
    const newDots = [...activeDots, dotIndex];
    onChange(newDots.join('-'));
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const clearPattern = () => {
    onChange('');
  };

  const getDotCoords = (idx: number) => {
    const row = Math.floor((idx - 1) / 3);
    const col = (idx - 1) % 3;
    return {
      x: 35 + col * 70,
      y: 35 + row * 70
    };
  };

  return (
    <div className="flex flex-col items-center space-y-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl max-w-xs mx-auto">
      <div 
        className="relative w-[210px] h-[210px] bg-white rounded-xl shadow-inner border border-zinc-150 overflow-hidden select-none"
        onMouseUp={handleEnd}
        onTouchEnd={handleEnd}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {activeDots.map((dotIdx, i) => {
            if (i === 0) return null;
            const prev = getDotCoords(activeDots[i - 1]);
            const curr = getDotCoords(dotIdx);
            return (
              <line
                key={i}
                x1={prev.x}
                y1={prev.y}
                x2={curr.x}
                y2={curr.y}
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => {
            const isActive = activeDots.includes(idx);
            const order = activeDots.indexOf(idx) + 1;
            return (
              <div
                key={idx}
                onMouseDown={() => handleStart(idx)}
                onMouseEnter={() => handleEnter(idx)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleStart(idx);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const element = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (element) {
                    const dataIdx = element.getAttribute('data-dot-index');
                    if (dataIdx) {
                      const dotIdx = parseInt(dataIdx);
                      if (!isNaN(dotIdx) && !activeDots.includes(dotIdx)) {
                        onChange([...activeDots, dotIdx].join('-'));
                      }
                    }
                  }
                }}
                onClick={() => handleDotInteraction(idx)}
                data-dot-index={idx}
                className="relative flex items-center justify-center cursor-pointer group rounded-full"
              >
                <div 
                  data-dot-index={idx}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
                    isActive 
                      ? 'bg-emerald-500 text-white shadow-md scale-110' 
                      : 'bg-zinc-200 group-hover:bg-zinc-300 scale-100'
                  }`}
                >
                  {isActive ? (
                    <span data-dot-index={idx} className="text-[10px] font-black">{order}</span>
                  ) : (
                    <span data-dot-index={idx} className="text-[8px] text-zinc-400 font-bold">{idx}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 w-full justify-between items-center px-1">
        <div className="text-[9px] font-mono font-bold text-zinc-500">
          Seq: <span className="text-zinc-900">{value || 'Nenhuma'}</span>
        </div>
        {value && (
          <button
            type="button"
            onClick={clearPattern}
            className="text-[9px] text-rose-600 hover:text-rose-700 font-bold uppercase"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

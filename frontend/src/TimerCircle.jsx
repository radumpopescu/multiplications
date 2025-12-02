import React, { useState, useEffect, useRef } from "react";

function TimerCircle({ startTime, targetTime, timerActive }) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const requestRef = useRef();

  useEffect(() => {
    if (!timerActive) { 
      setElapsed(0);
      setProgress(0);
      return;
    }

    const animate = () => {
      const now = Date.now();
      const timePassed = now - startTime;
      setElapsed(timePassed);

      if (targetTime) {
        const p = Math.min(timePassed / targetTime, 1);
        setProgress(p);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [startTime, targetTime, timerActive]);

  // Circle config
  const size = 60;
  const strokeWidth = 6;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
    if (!timerActive) { 
       return (
           <div className="flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full bg-white shadow-sm border-2 border-blue-100">
               <span className="text-xs font-bold text-gray-400">0.0s</span>
               {targetTime && <span className="text-[8px] text-gray-400">/ {(targetTime / 1000).toFixed(1)}s</span>}
           </div>
       );
    }
    
    // If timer is active but no target time exists, don't show anything.
    if (targetTime === null) {
        return null;
    }
    
    const strokeDashoffset = circumference * progress;   const isOvertime = elapsed > targetTime;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
            <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                fill="transparent"
            />
            {/* Progress Circle */}
            <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={isOvertime ? "#ef4444" : "#3b82f6"}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-75 ease-linear"
            />
        </svg>
        <div className="flex flex-col items-center z-10">
            <span className={`text-xs font-bold ${isOvertime ? 'text-red-500' : 'text-gray-600'}`}>
                {(elapsed / 1000).toFixed(1)}s
            </span>
            <span className="text-[8px] text-gray-400">
                / {(targetTime / 1000).toFixed(1)}s
            </span>
        </div>
    </div>
  );
}

export default TimerCircle;

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

function TimerCircle({ startTime, targetTime, timerActive, finalElapsed, beatAverage, newRecord }) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const requestRef = useRef();

  useEffect(() => {
    // Case 1: The result is final. Show static data.
    if (finalElapsed !== null && finalElapsed !== undefined) {
        setElapsed(finalElapsed);
        if (targetTime) {
            const p = Math.min(finalElapsed / targetTime, 1);
            setProgress(p);
        }
        return;
    }

    // Case 2: Timer hasn't started yet.
    if (!timerActive) { 
      setElapsed(0);
      setProgress(0);
      return;
    }

    // Case 3: Timer is running.
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
  }, [startTime, targetTime, timerActive, finalElapsed]);

  // Circle config
  const size = 60;
  const strokeWidth = 6;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
    if (!timerActive && finalElapsed === null) { 
       return (
           <div className="flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full bg-white shadow-sm border-2 border-blue-100">
               <span className="text-xs font-bold text-gray-400">0.0s</span>
               {targetTime && <span className="text-[8px] text-gray-400">/ {(targetTime / 1000).toFixed(1)}s</span>}
           </div>
       );
    }
    
    // If timer is active but no target time exists, don't show anything.
    if (targetTime === null && finalElapsed === null) {
        return null;
    }
    
    const strokeDashoffset = circumference * progress;   
    const isOvertime = elapsed > targetTime;

    // Animation variants for "beat average" or "new record"
    const isCelebration = beatAverage || newRecord;
    const variants = isCelebration ? {
        animate: {
            scale: [1, 1.4, 1.1], // Bigger initial pop
            boxShadow: newRecord 
                ? "0 0 30px 10px rgba(236, 72, 153, 0.6)" 
                : "0 0 25px 8px rgba(250, 204, 21, 0.7)", 
            transition: { duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
        }
    } : {};

  return (
    <div className="relative flex flex-col items-center">
        <motion.div 
            className="relative flex items-center justify-center rounded-full bg-white" 
            style={{ width: size, height: size }}
            variants={variants}
            animate={isCelebration ? "animate" : undefined}
        >
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
                    stroke={newRecord ? "#ec4899" : (beatAverage ? "#fbbf24" : (isOvertime ? "#ef4444" : "#3b82f6"))}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-75 ease-linear"
                />
            </svg>
            <div className="flex flex-col items-center z-10">
                <span className={`text-xs font-bold ${newRecord ? 'text-pink-500' : (beatAverage ? 'text-yellow-500' : (isOvertime ? 'text-red-500' : 'text-gray-600'))}`}>
                    {(elapsed / 1000).toFixed(1)}s
                </span>
                {targetTime && (
                    <span className="text-[8px] text-gray-400">
                        / {(targetTime / 1000).toFixed(1)}s
                    </span>
                )}
            </div>
        </motion.div>

        {/* Badges */}
        <AnimatePresence>
            {newRecord && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.5, y: 50, x: "-50%" }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, scale: 0.5, y: -50, x: "-50%" }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="fixed top-[30%] left-1/2 bg-pink-500 text-white text-2xl sm:text-4xl font-black px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(236,72,153,0.5)] whitespace-nowrap z-50 border-4 border-white pointer-events-none"
                >
                    NEW RECORD! 🏆
                </motion.div>
            )}
            {!newRecord && beatAverage && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.5, y: 50, x: "-50%" }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, scale: 0.5, y: -50, x: "-50%" }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="fixed top-[30%] left-1/2 bg-yellow-400 text-white text-xl sm:text-3xl font-black px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(250,204,21,0.5)] whitespace-nowrap z-50 border-4 border-white pointer-events-none"
                >
                    IMPROVED AVG! ⚡
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}

export default TimerCircle;

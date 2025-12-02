import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import confetti from "canvas-confetti";
import { ArrowLeft, BarChart2, Delete, User, Edit, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TimerCircle from './TimerCircle'; // NEW: Import TimerCircle

const API_URL = "/api";

// --- ANIMATION VARIANTS ---

// 1. The Container for the Question (Orchestrates the children)
const containerVariants = {
  enter: { transition: { staggerChildren: 0.1 } },
  exit: { transition: { staggerChildren: 0.05 } },
};

// 2. The Digits (Explosion Exit + Slide Entry)
const digitVariants = {
  initial: (direction) => ({
    x: direction === "left" ? -150 : 150, // Slide in from sides
    y: 20,
    opacity: 0,
    scale: 0.5,
    rotate: direction === "left" ? -20 : 20,
  }),
  animate: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  exit: (direction) => ({
    x: direction === "left" ? -400 : 400, // Fly outward vigorously (Explosion)
    y: -300, // Fly upward
    opacity: 0,
    scale: 0.2,
    rotate: direction === "left" ? -140 : 140, // Spin while flying
    transition: { duration: 0.5, ease: "backIn" },
  }),
};

// 3. The Operator (Fade in/out)
const operatorVariants = {
  initial: { opacity: 0, scale: 0 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.2, type: "spring" },
  },
  exit: {
    opacity: 0,
    scale: 2,
    transition: { duration: 0.3 },
  },
};

// 4. The Input Box (Slide up / Drop down)
const inputVariants = {
  initial: { y: 100, opacity: 0 },
  animate: {
    y: 0,
    x: 0,
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  // FIXED WIN VARIANT
  win: {
    opacity: 1, // 1. Ensure it stays visible
    y: 0, // 2. Ensure it stays in the center (doesn't drop)
    x: [0, -10, 10, -10, 10, 0], // 3. The wobble (Keyframes)
    scale: [1, 1.1, 1], // 4. The pulse
    transition: { duration: 0.4, ease: "easeInOut" },
  },
  exit: {
    y: 150,
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.3 },
  },
};

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  // Game State
  const [question, setQuestion] = useState({ a: 0, b: 0 });
  const [input, setInput] = useState("");
  const [lastWrongAnswer, setLastWrongAnswer] = useState(null); // The ghost text
  const [startTime, setStartTime] = useState(() => Date.now());
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [streak, setStreak] = useState(0);
  const [mode, setMode] = useState("smart");
  const [showMenu, setShowMenu] = useState(false);
  const [disabledFactors, setDisabledFactors] = useState([]);
  const [loadingDisabled, setLoadingDisabled] = useState(true);
  const [targetTime, setTargetTime] = useState(null);
  const [timerActive, setTimerActive] = useState(false);

  // Animation Key: Changing this forces the "Explosion" animation to run
  const [questionKey, setQuestionKey] = useState(0);

  // NEW: Add a ref to track the input box position
  const inputRef = useRef(null);

  // Move functions here to avoid hoisting issues
  const generateQuestion = async () => {
    setInput("");
    setLastWrongAnswer(null);
    setStartTime(Date.now()); 
    setFeedback(null);
    setTargetTime(null); // Reset target time
    setTimerActive(false); // Deactivate timer immediately
    setQuestionKey((prev) => prev + 1); // Trigger Enter animation

    try {
      let nextQuestion;
      // Always fetch from smart endpoint
      const response = await axios.get(
        `${API_URL}/questions/smart/${user.id}`
      );
      nextQuestion = response.data.data;
      
      setQuestion(nextQuestion);
      setTimeout(() => {
        setTimerActive(true);
      }, 1000); // 1 second delay
    } catch (error) {
      console.error(`Error generating question`, error);
      const a = Math.floor(Math.random() * 11);
      const b = Math.floor(Math.random() * 11);
      setQuestion({ a, b });
      setTimeout(() => {
        setTimerActive(true);
      }, 1000); // 1 second delay
    }
  };

  // Fetch stats for the current question
  useEffect(() => {
      if (user && question) {
          axios.get(`${API_URL}/stats/${user.id}/pair`, {
              params: { a: question.a, b: question.b }
          })
          .then(res => {
              if (res.data.data && res.data.data.avg_time) {
                  setTargetTime(res.data.data.avg_time);
              } else {
                  setTargetTime(null);
              }
          })
          .catch(err => console.error("Error fetching question stats", err));
      }
  }, [question, user]);

  const handleInput = (e, num) => {
    if (e) e.preventDefault();

    // UX Improvement: If they type, clear any previous "Wrong" status immediately
    if (feedback === "wrong") {
      setFeedback(null);
      setLastWrongAnswer(null); // Clear the ghost
    }
    // Also clear ghost if they just start typing normally without feedback state
    if (lastWrongAnswer) {
      setLastWrongAnswer(null);
    }

    if (input.length >= 3) return;
    setInput((prev) => prev + num);
  };

  const handleDelete = (e) => {
    if (e) e.preventDefault();

    // Clear error state on interaction
    if (feedback === "wrong") {
      setFeedback(null);
      setLastWrongAnswer(null);
    }

    setInput((prev) => prev.slice(0, -1));
  };

  const checkAnswer = async (e) => {
    if (e) e.preventDefault();
    if (!input) return;

    const answer = parseInt(input);
    const correctAnswer = question.a * question.b;
    const isCorrect = answer === correctAnswer;
    const timeTaken = Date.now() - startTime;

    if (isCorrect) {
      setFeedback("correct");
      setLastWrongAnswer(null);
      const newStreak = streak + 1;
      setStreak(newStreak);

      const isMilestone = newStreak % 10 === 0;
      triggerConfetti(isMilestone);

      try {
        await axios.post(`${API_URL}/results`, {
          user_id: user.id,
          factor_a: question.a,
          factor_b: question.b,
          user_answer: answer,
          time_taken_ms: timeTaken,
        });
      } catch (error) {
        console.error("Error saving result", error);
      }

      // Wait for confetti/celebration, then explode/switch
      setTimeout(() => {
        generateQuestion();
      }, 800);
    } else {
      // --- WRONG ANSWER LOGIC ---
      setLastWrongAnswer(input); // Save input as ghost
      setInput(""); // Clear actual input
      setFeedback("wrong");
      setStreak(0);

      // Auto-hide the red text after 1.5s, but leave the ghost until interaction
      setTimeout(() => {
        if (feedback === "wrong") {
          setFeedback(null);
        }
      }, 1500);
    }
  };

  const triggerConfetti = (isMilestone) => {
    // Get position of the input box
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();

    // Convert pixels to normalized coordinates (0 to 1) for canvas-confetti
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const count = isMilestone ? 250 : 150;
    const defaults = {
      origin: { x, y },
      colors: ["#22c55e", "#ef4444", "#eab308", "#3b82f6"], // Bright colors
    };

    // Fire a 360 degree explosion
    confetti({
      ...defaults,
      particleCount: count,
      spread: 360, // Explode in all directions
      startVelocity: 35, // Speed of explosion
      scalar: 1,
      decay: 0.92,
      ticks: 200, // Last slightly longer
    });

    // Optional: Add a second delayed burst for milestones
    if (isMilestone) {
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 100,
          spread: 360,
          startVelocity: 45,
        });
      }, 150);
    }
  };

  // NEW: Keyboard input handler
  const handleKeyDown = useCallback((event) => {
    if (event.key >= '0' && event.key <= '9') {
      handleInput(null, event.key);
    } else if (event.key === 'Enter') {
      checkAnswer();
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      handleDelete();
    }
  }, [handleInput, checkAnswer, handleDelete]); // Dependencies for useCallback

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (!storedUser) {
      navigate("/");
      return;
    }
    const currentUser = JSON.parse(storedUser);
    setUser(currentUser);
    // Mode is always 'smart' now
  }, [navigate]);

  useEffect(() => {
    if (user) {
         // We still fetch disabled factors to use for local fallback or stats
         axios.get(`${API_URL}/settings/${user.id}/disabled`)
             .then(res => {
                 setDisabledFactors(res.data.data);
                 setLoadingDisabled(false);
             })
             .catch(err => {
                 console.error(err);
                 setLoadingDisabled(false);
             });
    }
  }, [user]);

  useEffect(() => {
    // Trigger initial question when user is ready
    if (user && !loadingDisabled) {
      generateQuestion();
    }
  }, [user, loadingDisabled]);

  // NEW: Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Prevent scrolling on mobile while playing
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col transition-colors duration-500 ${
        feedback === "correct"
          ? "bg-green-100"
          : feedback === "wrong"
          ? "bg-red-100"
          : "bg-yellow-50"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <button
          onClick={() => navigate("/stats")}
          className="p-2 rounded-full hover:bg-black/10"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="text-lg font-bold text-gray-600">
          Streak: <span className="text-orange-500">{streak}</span> 🔥
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate("/stats")}
            className="p-3 rounded-full hover:bg-black/10"
          >
            <BarChart2 className="w-7 h-7 text-gray-600" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-3 rounded-full hover:bg-black/10"
            >
              <User className="w-7 h-7 text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute right-0 z-20 py-1 mt-2 w-48 bg-white rounded-md shadow-lg">
                <button
                  onClick={() => navigate("/edit-profile")}
                  className="flex items-center px-4 py-2 w-full text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="mr-2 w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center px-4 py-2 w-full text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="mr-2 w-4 h-4" />
                  Change Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex relative flex-col flex-1 pb-12 landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-8 landscape:p-8 sm:pb-16">
        <div className="flex flex-col flex-1 justify-center items-center mb-4 w-full landscape:mb-0 relative">
          {/* Timer Circle - Top Right of this section */}
          <div className="absolute top-4 right-4 sm:top-10 sm:right-10 z-0">
             <TimerCircle startTime={startTime} targetTime={targetTime} timerActive={timerActive} />
          </div>

          {/* QUESTION ANIMATION CONTAINER */}
          {/* mode="wait" ensures exit finishes before enter starts */}
          <AnimatePresence mode="wait">
            <motion.div
              key={questionKey}
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center"
            >
              {/* Equation Row */}
              <div className="flex overflow-visible relative gap-4 justify-center items-center mb-8 text-7xl font-bold text-gray-800 sm:text-8xl">
                {/* LEFT DIGIT */}
                <motion.div custom="left" variants={digitVariants}>
                  {question.a}
                </motion.div>

                {/* OPERATOR */}
                <motion.span
                  variants={operatorVariants}
                  className="text-gray-400"
                >
                  ×
                </motion.span>

                {/* RIGHT DIGIT */}
                <motion.div custom="right" variants={digitVariants}>
                  {question.b}
                </motion.div>
              </div>

              {/* Input Box Area */}
              <motion.div
                // NEW: Attach the ref here so confetti knows where to start
                ref={inputRef}
                variants={inputVariants}
                // NEW: Switch to 'win' variant when feedback is correct
                animate={feedback === "correct" ? "win" : "animate"}
                initial="initial"
                // exit prop stays handled by the parent AnimatePresence usually,
                // but can be explicit here too:
                exit="exit"
                className="relative"
              >
                <div
                  className={`relative h-20 sm:h-24 min-w-[120px] px-8 flex items-center justify-center text-5xl sm:text-6xl font-bold rounded-2xl border-4 transition-colors duration-300 ${
                    feedback === "correct"
                      ? "border-green-500 bg-green-50 text-green-600"
                      : feedback === "wrong"
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-gray-300 bg-white text-gray-800 shadow-inner"
                  }`}
                >
                  {/* Real Input - High Z-Index */}
                  <span className="relative z-10">{input}</span>

                  {/* Ghost Input (Faded Wrong Answer) */}
                  <AnimatePresence>
                    {input === "" && lastWrongAnswer && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 0.3, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex absolute inset-0 z-0 justify-center items-center text-red-400 select-none"
                      >
                        {lastWrongAnswer}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Wrong Feedback Text Overlay */}
                <AnimatePresence>
                  {feedback === "wrong" && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-0 left-0 -bottom-10 text-xl font-bold text-center text-red-500"
                    >
                      Try Again!
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* KEYPAD */}
        <div className="bg-white rounded-t-3xl landscape:rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 sm:p-6 pb-8 sm:pb-10 landscape:pb-4 landscape:sm:pb-6 landscape:w-full landscape:max-w-[320px] landscape:shrink-0 flex-shrink-0 mt-auto landscape:mt-0">
          <div className="grid grid-cols-3 gap-2 mx-auto max-w-md sm:gap-4 landscape:max-w-none landscape:mx-0">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onPointerDown={(e) => handleInput(e, num.toString())}
                className="h-14 text-3xl font-bold text-blue-600 bg-blue-50 rounded-xl shadow-sm transition-all sm:h-16 hover:bg-blue-100 active:bg-blue-200 active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onPointerDown={(e) => handleDelete(e)}
              className="flex justify-center items-center h-14 text-red-500 bg-red-50 rounded-xl shadow-sm transition-all sm:h-16 hover:bg-red-100 active:bg-red-200 active:scale-95"
            >
              <Delete className="w-8 h-8" />
            </button>
            <button
              onPointerDown={(e) => handleInput(e, "0")}
              className="h-14 text-3xl font-bold text-blue-600 bg-blue-50 rounded-xl shadow-sm transition-all sm:h-16 hover:bg-blue-100 active:bg-blue-200 active:scale-95"
            >
              0
            </button>
            <button
              onPointerDown={checkAnswer}
              className="flex justify-center items-center h-14 text-white bg-green-500 rounded-xl shadow-md transition-all sm:h-16 hover:bg-green-600 active:bg-green-700 active:scale-95"
            >
              <span className="text-xl font-bold">GO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

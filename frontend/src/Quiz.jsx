import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { ArrowLeft, BarChart2, Delete, User, Edit, LogOut } from 'lucide-react';

const API_URL = '/api';

export default function Quiz() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [question, setQuestion] = useState({ a: 0, b: 0 });
    const [input, setInput] = useState('');
    const [startTime, setStartTime] = useState(Date.now());
    const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
    const [streak, setStreak] = useState(0);
    const [mode, setMode] = useState('random');
    const [showMenu, setShowMenu] = useState(false);


    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        const searchParams = new URLSearchParams(location.search);
        const newMode = searchParams.get('mode') || 'random';
        setMode(newMode);
    }, [location]);

    useEffect(() => {
        if (user && mode) {
            generateQuestion();
        }
    }, [user, mode]);
    
    useEffect(() => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, []);
    
    const generateQuestion = async () => {
        setInput('');
        setStartTime(Date.now());
        setFeedback(null);

        try {
            let nextQuestion;
            if (mode === 'random') {
                const a = Math.floor(Math.random() * 11);
                const b = Math.floor(Math.random() * 11);
                nextQuestion = { a, b };
            } else {
                const response = await axios.get(`${API_URL}/questions/${mode}/${user.id}`);
                nextQuestion = response.data.data;
                if (!nextQuestion) {
                    alert("Congratulations! You've completed all questions in this mode.");
                    navigate('/mode-select');
                    return;
                }
            }
            setQuestion(nextQuestion);
        } catch (error) {
            console.error(`Error generating question for mode ${mode}`, error);
            const a = Math.floor(Math.random() * 11);
            const b = Math.floor(Math.random() * 11);
            setQuestion({ a, b });
        }
    };
    
    const handleInput = (e, num) => {
        if (e) e.preventDefault();
        if (feedback) return;
        if (input.length >= 3) return;
        setInput(prev => prev + num);
    };
    
    const handleDelete = (e) => {
        if (e) e.preventDefault();
        if (feedback) return;
        setInput(prev => prev.slice(0, -1));
    };
    
    const checkAnswer = async (e) => {
        if (e) e.preventDefault();
        if (!input) return;
        
        const answer = parseInt(input);
        const correctAnswer = question.a * question.b;
        const isCorrect = answer === correctAnswer;
        const timeTaken = Date.now() - startTime;
        
        setFeedback(isCorrect ? 'correct' : 'wrong');
        
        try {
            await axios.post(`${API_URL}/results`, {
                user_id: user.id,
                factor_a: question.a,
                factor_b: question.b,
                user_answer: answer,
                time_taken_ms: timeTaken
            });
        } catch (error) {
            console.error("Error saving result", error);
        }
        
        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            
            const isMilestone = newStreak % 10 === 0;
            triggerConfetti(isMilestone, question.a, question.b, correctAnswer);
            
            setTimeout(generateQuestion, 1000);
        } else {
            setStreak(0);
            setTimeout(() => {
                setFeedback(null);
                setInput('');
                setStartTime(Date.now());
            }, 1000);
        }
    };
    
    const triggerConfetti = (
      isMilestone = false,
      a = 5,
      b = 5,
      product = 25
    ) => {
      // Burst for factor A from left
      confetti({
        particleCount: Math.max(a * 4, 10),
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.4 },
        colors: ["#ff6b6b", "#ffd93d"],
      });

      // Burst for factor B from right
      confetti({
        particleCount: Math.max(b * 4, 10),
        angle: 120,
        spread: 55,
        origin: { x: 0.8, y: 0.4 },
        colors: ["#6bcf9c", "#4d96ff"],
      });

      // Burst for product from bottom center
      confetti({
        particleCount: Math.min(product, 100),
        angle: 90,
        spread: 70,
        origin: { x: 0.5, y: 0.7 },
        colors: ["#ff9ff3", "#feca57", "#48dbfb", "#54a0ff"],
      });

      if (isMilestone) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.5 },
          });
          confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.5 },
          });
        }, 300);
      }
    };
    
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
        <div className="flex justify-between items-center p-4">
          <button
            onClick={() => navigate("/mode-select")}
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
                <div className="absolute right-0 z-10 py-1 mt-2 w-48 bg-white rounded-md shadow-lg">
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

        <div className="flex flex-col flex-1 pb-12 landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-8 landscape:p-8 sm:pb-16">
          <div className="flex flex-col flex-1 justify-center items-center mb-4 landscape:mb-0">
            <div className="flex gap-4 items-center mb-4 text-7xl font-bold text-gray-800 sm:text-8xl">
              <span>{question.a}</span>
              <span className="text-gray-400">×</span>
              <span>{question.b}</span>
            </div>

            <div
              className={`h-20 sm:h-24 min-w-[120px] px-8 flex items-center justify-center text-5xl sm:text-6xl font-bold rounded-2xl border-4 transition-all ${
                feedback === "correct"
                  ? "border-green-500 bg-green-50 text-green-600"
                  : feedback === "wrong"
                  ? "border-red-500 bg-red-50 text-red-600"
                  : "border-gray-300 bg-white text-gray-800 shadow-inner"
              }`}
            >
              {input}
            </div>

            {feedback === "wrong" && (
              <p className="mt-4 text-xl font-bold text-red-500 animate-bounce">
                Try Again!
              </p>
            )}
            {feedback === "correct" && (
              <p className="mt-4 text-xl font-bold text-green-500 animate-bounce">
                Great Job!
              </p>
            )}
          </div>

          <div className="bg-white rounded-t-3xl landscape:rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 sm:p-6 pb-8 sm:pb-10 landscape:pb-4 landscape:sm:pb-6 landscape:w-full landscape:max-w-[320px] landscape:shrink-0">
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

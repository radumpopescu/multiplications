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
    
    const handleInput = (num) => {
        if (feedback) return;
        if (input.length >= 3) return;
        setInput(prev => prev + num);
    };
    
    const handleDelete = () => {
        if (feedback) return;
        setInput(prev => prev.slice(0, -1));
    };
    
    const checkAnswer = async () => {
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
            triggerConfetti(isMilestone);
            
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
    
    const triggerConfetti = (isMilestone = false) => {
        const options = {
            particleCount: isMilestone ? 200 : 50,
            spread: isMilestone ? 90 : 70,
            origin: { y: 0.6 }
        };
        if (isMilestone) {
            confetti(options);
            setTimeout(() => {
                confetti({ ...options, particleCount: 100, angle: 60, spread: 55 });
                confetti({ ...options, particleCount: 100, angle: 120, spread: 55 });
            }, 250);
        } else {
            confetti(options);
        }
    };
    
    return (
        <div className={`h-screen overflow-hidden flex flex-col transition-colors duration-500 ${
            feedback === 'correct' ? 'bg-green-100' :
            feedback === 'wrong' ? 'bg-red-100' : 'bg-yellow-50'
        }`}>
            <div className="p-4 flex justify-between items-center">
                <button onClick={() => navigate('/mode-select')} className="p-2 rounded-full hover:bg-black/10">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="font-bold text-gray-600 text-lg">
                    Streak: <span className="text-orange-500">{streak}</span> 🔥
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/stats')} className="p-3 rounded-full hover:bg-black/10">
                        <BarChart2 className="w-7 h-7 text-gray-600" />
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="p-3 rounded-full hover:bg-black/10">
                            <User className="w-7 h-7 text-gray-600" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                                <button
                                    onClick={() => navigate('/edit-profile')}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Change Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-8 landscape:p-8">
                <div className="flex-1 flex flex-col items-center justify-center mb-4 landscape:mb-0">
                    <div className="text-7xl sm:text-8xl font-bold text-gray-800 mb-4 flex items-center gap-4">
                        <span>{question.a}</span>
                        <span className="text-gray-400">×</span>
                        <span>{question.b}</span>
                    </div>

                    <div className={`h-20 sm:h-24 min-w-[120px] px-8 flex items-center justify-center text-5xl sm:text-6xl font-bold rounded-2xl border-4 transition-all ${
                        feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-600' :
                        feedback === 'wrong' ? 'border-red-500 bg-red-50 text-red-600' :
                        'border-gray-300 bg-white text-gray-800 shadow-inner'
                    }`}>
                        {input}
                    </div>

                    {feedback === 'wrong' && (
                        <p className="mt-4 text-red-500 font-bold text-xl animate-bounce">Try Again!</p>
                    )}
                    {feedback === 'correct' && (
                        <p className="mt-4 text-green-500 font-bold text-xl animate-bounce">Great Job!</p>
                    )}
                </div>
                
                <div className="bg-white rounded-t-3xl landscape:rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 sm:p-6 pb-8 sm:pb-10 landscape:pb-4 landscape:sm:pb-6 landscape:w-full landscape:max-w-[320px] landscape:shrink-0">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto landscape:max-w-none landscape:mx-0">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleInput(num.toString())}
                                className="h-14 sm:h-16 rounded-xl bg-blue-50 text-blue-600 text-3xl font-bold hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all shadow-sm"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleDelete}
                            className="h-14 sm:h-16 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:bg-red-200 active:scale-95 transition-all shadow-sm"
                        >
                            <Delete className="w-8 h-8" />
                        </button>
                        <button
                            onClick={() => handleInput('0')}
                            className="h-14 sm:h-16 rounded-xl bg-blue-50 text-blue-600 text-3xl font-bold hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all shadow-sm"
                        >
                            0
                        </button>
                        <button
                            onClick={checkAnswer}
                            className="h-14 sm:h-16 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 active:bg-green-700 active:scale-95 transition-all shadow-md"
                        >
                            <span className="text-xl font-bold">GO</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

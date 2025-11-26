import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { ArrowLeft, BarChart2, Delete, RotateCcw, Settings } from 'lucide-react';

const API_URL = '/api';

export default function Quiz() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [question, setQuestion] = useState({ a: 0, b: 0 });
    const [input, setInput] = useState('');
    const [startTime, setStartTime] = useState(Date.now());
    const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
    const [streak, setStreak] = useState(0);
    
    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
        generateQuestion();
    }, []);
    
    const generateQuestion = () => {
        const a = Math.floor(Math.random() * 11);
        const b = Math.floor(Math.random() * 11);
        setQuestion({ a, b });
        setInput('');
        setStartTime(Date.now());
        setFeedback(null);
    };
    
    const handleInput = (num) => {
        if (feedback) return; // Block input during feedback animation
        if (input.length >= 3) return; // Limit length
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
        
        // Visual feedback
        setFeedback(isCorrect ? 'correct' : 'wrong');
        
        // Save result
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
            
            // Trigger confetti on every correct answer
            const isMilestone = newStreak % 10 === 0;
            triggerConfetti(isMilestone);
            
            setTimeout(generateQuestion, 1000);
        } else {
            setStreak(0);
            setTimeout(() => {
                setFeedback(null);
                setInput('');
                setStartTime(Date.now()); // Reset timer for retry
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
            // Bigger burst for milestones
            confetti(options);
            setTimeout(() => {
                confetti({
                    ...options,
                    particleCount: 100,
                    angle: 60,
                    spread: 55
                });
                confetti({
                    ...options,
                    particleCount: 100,
                    angle: 120,
                    spread: 55
                });
            }, 250);
        } else {
            confetti(options);
        }
    };
    
    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
            feedback === 'correct' ? 'bg-green-100' : 
            feedback === 'wrong' ? 'bg-red-100' : 'bg-yellow-50'
        }`}>
            {/* Header */}
            <div className="p-4 flex justify-between items-center">
                <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-black/10">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="font-bold text-gray-600 text-lg">
                    Streak: <span className="text-orange-500">{streak}</span> 🔥
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/stats')} className="p-2 rounded-full hover:bg-black/10">
                        <BarChart2 className="w-6 h-6 text-gray-600" />
                    </button>
                    <button onClick={() => navigate('/edit-profile')} className="p-2 rounded-full hover:bg-black/10">
                        <Settings className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
            </div>
            
            {/* Question Area */}
            <div className="flex-1 flex flex-col items-center justify-center mb-8">
                <div className="text-8xl font-bold text-gray-800 mb-8 flex items-center gap-4">
                    <span>{question.a}</span>
                    <span className="text-gray-400">×</span>
                    <span>{question.b}</span>
                </div>
                
                <div className={`h-24 min-w-[120px] px-8 flex items-center justify-center text-6xl font-bold rounded-2xl border-4 transition-all ${
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
            
            {/* Numpad */}
            <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-6 pb-10">
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleInput(num.toString())}
                            className="h-16 rounded-xl bg-blue-50 text-blue-600 text-3xl font-bold hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all shadow-sm"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleDelete}
                        className="h-16 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:bg-red-200 active:scale-95 transition-all shadow-sm"
                    >
                        <Delete className="w-8 h-8" />
                    </button>
                    <button
                        onClick={() => handleInput('0')}
                        className="h-16 rounded-xl bg-blue-50 text-blue-600 text-3xl font-bold hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all shadow-sm"
                    >
                        0
                    </button>
                    <button
                        onClick={checkAnswer}
                        className="h-16 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 active:bg-green-700 active:scale-95 transition-all shadow-md"
                    >
                        <span className="text-xl font-bold">GO</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

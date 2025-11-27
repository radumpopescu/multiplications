import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';

const API_URL = '/api';

export default function ModeSelect() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [unansweredQuestions, setUnansweredQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        if (user) {
            axios.get(`${API_URL}/unanswered-questions/${user.id}`)
                .then(response => {
                    setUnansweredQuestions(response.data.data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error("Error fetching unanswered questions", error);
                    setLoading(false);
                });
        }
    }, [user]);

    const handleModeSelect = (mode) => {
        navigate(`/quiz?mode=${mode}`);
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <div className="absolute top-4 left-4">
                <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-black/10">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
            </div>
            <h1 className="text-4xl font-bold mb-8">Select a Mode</h1>
            <div className="space-y-4">
                <button
                    onClick={() => handleModeSelect('random')}
                    className="w-64 bg-white p-4 rounded-lg shadow-md text-lg font-semibold hover:bg-gray-200"
                >
                    Random Any
                </button>
                <button
                    onClick={() => handleModeSelect('lowest-scores')}
                    className="w-64 bg-white p-4 rounded-lg shadow-md text-lg font-semibold hover:bg-gray-200"
                >
                    Improve Lowest Scores
                </button>
                {unansweredQuestions.length > 0 && (
                    <button
                        onClick={() => handleModeSelect('all-remaining')}
                        className="w-64 bg-white p-4 rounded-lg shadow-md text-lg font-semibold hover:bg-gray-200"
                    >
                        Fill the Board
                    </button>
                )}
            </div>
        </div>
    );
}

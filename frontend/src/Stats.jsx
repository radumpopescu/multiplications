import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Settings, Ban, Check } from 'lucide-react';

const API_URL = '/api';

export default function Stats() {
    const navigate = useNavigate();
    const [stats, setStats] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [disabledFactors, setDisabledFactors] = useState([]);

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
            fetchStats();
            fetchDisabledFactors();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/stats/${user.id}`);
            setStats(res.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching stats", error);
            setLoading(false);
        }
    };

    const fetchDisabledFactors = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings/${user.id}/disabled`);
            setDisabledFactors(res.data.data);
        } catch (error) {
            console.error("Error fetching disabled factors", error);
        }
    };

    const toggleDisable = async (factor) => {
        try {
            const res = await axios.post(`${API_URL}/settings/${user.id}/toggle-disable`, { factor });
            setDisabledFactors(res.data.data);
        } catch (error) {
             console.error("Error toggling factor", error);
        }
    };

    const getCellData = (a, b) => {
        // Find stat for this combination. Note: database stores a, b.
        // We should check both a,b and b,a if we want to merge them, 
        // but usually the loop generates random a and b, so they are distinct entries.
        // Let's aggregate them client side for symmetric table if desired,
        // OR just show what was practiced.
        // For simplicity and clarity, let's aggregate (3x4 is same as 4x3).
        
        const items = stats.filter(s => 
            (s.factor_a === a && s.factor_b === b) || 
            (s.factor_a === b && s.factor_b === a)
        );

        if (items.length === 0) return null;

        const totalAttempts = items.reduce((acc, curr) => acc + curr.attempts, 0);
        const totalCorrect = items.reduce((acc, curr) => acc + curr.correct_count, 0);
        // Weighted average time
        const totalTime = items.reduce((acc, curr) => acc + (curr.avg_time * curr.attempts), 0);
        const avgTime = totalTime / totalAttempts;

        return {
            attempts: totalAttempts,
            accuracy: totalCorrect / totalAttempts,
            avgTime: avgTime
        };
    };

    const getCellColor = (data, row, col) => {
        if (disabledFactors.includes(row) || disabledFactors.includes(col)) {
            return 'bg-gray-100 text-gray-400 grayscale opacity-50'; // Disabled look
        }

        if (!data) return 'bg-gray-100 text-gray-300'; // No data

        const { accuracy, avgTime } = data;
        
        // Logic for color
        // High accuracy (> 90%) AND Fast (< 3s) -> Green
        // High accuracy BUT Slow -> Yellow
        // Low accuracy -> Red
        
        if (accuracy < 0.8) return 'bg-red-200 text-red-800';
        if (avgTime > 5000) return 'bg-yellow-200 text-yellow-800'; // Slower than 5s
        if (accuracy >= 0.9) return 'bg-green-200 text-green-800';
        
        return 'bg-blue-100 text-blue-800'; // Decent
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="h-screen bg-white flex flex-col">
            <div className="p-4 flex items-center justify-between bg-blue-50 sticky top-0 z-10 shadow-sm">
                <button onClick={() => navigate('/quiz')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="w-6 h-6" />
                    <span className="font-bold hidden sm:inline">Back to Quiz</span>
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-blue-800 text-center">{user?.name}'s Progress</h1>
                <div className="flex items-center gap-2">
                    <button onClick={fetchStats} className="p-2 rounded-full hover:bg-blue-200 text-blue-600">
                        <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button onClick={() => navigate('/edit-profile')} className="p-2 rounded-full hover:bg-blue-200 text-blue-600">
                        <Settings className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex justify-center">
                <div className="grid grid-cols-12 gap-1 max-w-3xl w-full">
                    {/* Header Row */}
                    <div className="col-span-1"></div>
                    {[...Array(11)].map((_, i) => (
                        <div 
                            key={`h-${i}`} 
                            className={`font-bold text-center py-2 text-xs sm:text-base cursor-pointer select-none hover:bg-gray-100 rounded flex flex-col items-center justify-center ${disabledFactors.includes(i) ? 'text-red-400 line-through decoration-2' : 'text-gray-500'}`}
                            onClick={() => toggleDisable(i)}
                            title={disabledFactors.includes(i) ? "Enable this number" : "Disable this number"}
                        >
                            {i}
                        </div>
                    ))}

                    {/* Grid */}
                    {[...Array(11)].map((_, row) => (
                        <React.Fragment key={`row-${row}`}>
                            {/* Row Header */}
                            <div 
                                className={`font-bold text-center py-2 text-xs sm:text-base flex items-center justify-center cursor-pointer select-none hover:bg-gray-100 rounded ${disabledFactors.includes(row) ? 'text-red-400 line-through decoration-2' : 'text-gray-500'}`}
                                onClick={() => toggleDisable(row)}
                                title={disabledFactors.includes(row) ? "Enable this number" : "Disable this number"}
                            >
                                {row}
                            </div>
                            
                            {/* Cells */}
                            {[...Array(11)].map((_, col) => {
                                const data = getCellData(row, col);
                                const colorClass = getCellColor(data, row, col);
                                
                                return (
                                    <div
                                        key={`${row}-${col}`}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-medium transition-transform hover:scale-110 cursor-default ${colorClass}`}
                                        title={data ? `Avg: ${(data.avgTime/1000).toFixed(1)}s\nAcc: ${(data.accuracy*100).toFixed(0)}%` : 'No data'}
                                    >
                                        {data && (
                                            <>
                                                <span>{(data.accuracy * 100).toFixed(0)}%</span>
                                                <span className="text-[8px] sm:text-[9px] opacity-75">{(data.avgTime/1000).toFixed(1)}s</span>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            
            <div className="p-4 bg-gray-50 text-xs text-gray-500 text-center">
                Click row/column headers to enable/disable numbers. <br/>
                Green: Fast & Accurate • Yellow: Good but Slow • Red: Needs Practice
            </div>
        </div>
    );
}

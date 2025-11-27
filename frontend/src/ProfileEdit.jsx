import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Rabbit, Bot, Cat, Dog, Fish, Bird, User, Smile } from 'lucide-react';

const API_URL = '/api';

const ICONS = {
    smile: Smile,
    rabbit: Rabbit,
    bot: Bot,
    cat: Cat,
    dog: Dog,
    fish: Fish,
    bird: Bird,
    user: User
};

const ICON_KEYS = ['smile', 'rabbit', 'bot', 'cat', 'dog', 'fish', 'bird'];

export default function ProfileEdit() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const u = JSON.parse(storedUser);
        setUser(u);
        setName(u.name);
        const defaultIcon = ICON_KEYS.includes(u.icon) ? u.icon : ICON_KEYS[0];
        setSelectedIcon(defaultIcon);
        setLoading(false);
    }, [navigate]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center">Loading...</div>;
    }

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await axios.put(`${API_URL}/users/${user.id}`, {
                name: name.trim(),
                icon: selectedIcon
            });
            const updatedUser = res.data.data;
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            navigate('/quiz');
        } catch (error) {
            console.error("Error updating profile", error);
            // TODO: Show error message
        } finally {
            setSaving(false);
        }
    };

    const IconComponent = (iconName) => {
        const Icon = ICONS[iconName] || User;
        return <Icon className="w-8 h-8" />;
    };

    return (
        <div className="h-screen bg-blue-50 flex flex-col">
            <div className="p-4">
                <button 
                    onClick={() => navigate('/quiz')} 
                    className="p-2 rounded-full hover:bg-gray-200"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4 pt-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-6 text-center">Edit Profile</h1>
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                                placeholder="Enter your name"
                                disabled={saving}
                            />
                        </div>

                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Choose Avatar</label>
                        <div className="grid grid-cols-3 gap-3">
                            {ICON_KEYS.map(iconKey => {
                                const Icon = ICONS[iconKey];
                                return (
                                    <button
                                        key={iconKey}
                                        type="button"
                                        onClick={() => setSelectedIcon(iconKey)}
                                        className={`p-3 rounded-xl border-2 flex justify-center items-center transition-all ${
                                            selectedIcon === iconKey 
                                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                                            : 'border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-500'
                                        }`}
                                        disabled={saving}
                                    >
                                        <Icon className="w-8 h-8" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/quiz')}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

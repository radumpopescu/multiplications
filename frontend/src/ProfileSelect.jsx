import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Plus, Rabbit, Bot, Cat, Dog, Fish, Bird } from 'lucide-react';

const API_URL = '/api';

const ICONS = {
    rabbit: Rabbit,
    bot: Bot,
    cat: Cat,
    dog: Dog,
    fish: Fish,
    bird: Bird,
    user: User
};

const ICON_KEYS = ['rabbit', 'bot', 'cat', 'dog', 'fish', 'bird'];

export default function ProfileSelect() {
    const [users, setUsers] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('rabbit');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data.data);
        } catch (error) {
            console.error("Error fetching users", error);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newName) return;

        try {
            const res = await axios.post(`${API_URL}/users`, {
                name: newName,
                icon: selectedIcon
            });
            setUsers([...users, res.data.data]);
            setIsCreating(false);
            setNewName('');
        } catch (error) {
            console.error("Error creating user", error);
        }
    };

    const selectUser = (user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        navigate('/mode-select');
    };

    const IconComponent = (iconName) => {
        const Icon = ICONS[iconName] || User;
        return <Icon className="w-8 h-8" />;
    };

    return (
        <div className="h-screen bg-blue-50 flex flex-col items-center justify-center p-4 overflow-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 mb-6 sm:mb-8">Who is playing?</h1>
            
            {!isCreating ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl">
                    {users.map(user => (
                        <button
                            key={user.id}
                            onClick={() => selectUser(user)}
                            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex flex-col items-center gap-4 border-4 border-transparent hover:border-blue-300"
                        >
                            <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                                {IconComponent(user.icon)}
                            </div>
                            <span className="text-xl font-bold text-gray-700">{user.name}</span>
                        </button>
                    ))}
                    
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-blue-600 p-6 rounded-2xl shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex flex-col items-center gap-4 text-white"
                    >
                        <div className="bg-blue-500 p-4 rounded-full">
                            <Plus className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-bold">New Profile</span>
                    </button>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create New Profile</h2>
                    <form onSubmit={handleCreateUser} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                                placeholder="Enter your name"
                                autoFocus
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
                                                : 'border-gray-200 text-gray-400 hover:border-blue-200'
                                            }`}
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
                                onClick={() => setIsCreating(false)}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

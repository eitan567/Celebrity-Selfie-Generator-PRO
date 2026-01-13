import React, { useState } from 'react';
import { Icon } from './Icons';

interface AuthModalProps {
    onClose: () => void;
    onAuthSuccess: (user: { name: string }) => void;
    onGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess, onGuest }) => {
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Fake authentication
        const userName = activeTab === 'signup' ? name : email.split('@')[0];
        if (activeTab === 'signup' && !name) {
            alert('נא להזין שם');
            return;
        }
        if (!email || !password) {
             alert('נא למלא אימייל וסיסמה');
             return;
        }
        onAuthSuccess({ name: userName });
    };

    const inputStyle = "w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none transition duration-200 focus:ring-2 focus:ring-yellow-400 placeholder:text-gray-400 text-gray-900 caret-yellow-500";

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><Icon name="XCircle" size={24}/></button>
                <div className="text-center mb-6">
                    <Icon name="Sparkles" size={32} className="text-yellow-500 mx-auto mb-2"/>
                    <h2 className="text-2xl font-bold text-gray-800">ברוכים הבאים לסטודיו AI</h2>
                    <p className="text-gray-500 mt-1">התחבר או הירשם כדי להתחיל ליצור.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button onClick={() => setActiveTab('login')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'login' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>התחברות</button>
                    <button onClick={() => setActiveTab('signup')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'signup' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>הרשמה</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {activeTab === 'signup' && (
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">שם מלא</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} dir="auto" className={inputStyle} placeholder="ישראל ישראלי" required />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">כתובת אימייל</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="auto" className={inputStyle} placeholder="your@email.com" required />
                    </div>
                     <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">סיסמה</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputStyle} placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition shadow-md">
                        {activeTab === 'login' ? 'התחבר' : 'צור חשבון'}
                    </button>
                </form>

                <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 text-xs font-bold text-gray-400">או</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button onClick={onGuest} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition">
                    המשך כאורח
                </button>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { Generator } from './Generator';
import { Icon } from './components/Icons';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [user, setUser] = useState<{ name: string } | null>(null);

    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            setUser(JSON.parse(loggedInUser));
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    const handleLoginSuccess = (userData: { name: string }) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);
    };

    const handleGuest = () => {
        const guestUser = { name: 'אורח' };
        setUser(guestUser);
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    if (isAuthenticated === null) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                <Icon name="Loader2" className="animate-spin text-yellow-500" size={48} />
            </div>
        );
    }
    
    return (
        <div className="font-heebo">
            {!isAuthenticated ? (
                <>
                    <LandingPage onLogin={() => setIsAuthModalOpen(true)} />
                    {isAuthModalOpen && (
                        <AuthModal 
                            onClose={() => setIsAuthModalOpen(false)}
                            onAuthSuccess={handleLoginSuccess}
                            onGuest={handleGuest}
                        />
                    )}
                </>
            ) : (
                <Generator user={user!} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;

import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { TooltipProps } from '../types';

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, place: 'top' });
    const triggerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;
            
            let place = 'top';
            let top = rect.top - 10;

            if (spaceAbove < 200 && spaceBelow > 200) {
                place = 'bottom';
                top = rect.bottom + 10;
            }

            let left = rect.left + (rect.width / 2) - 128; // Center
            
            // Prevent overflow left/right
            if (left < 10) left = 10;
            
            setPosition({ top, left, place });
            setIsVisible(true);
        }
    };

    return (
        <>
            <div 
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsVisible(false)}
                className="inline-block relative"
            >
                {children}
            </div>
            {isVisible && ReactDOM.createPortal(
                <div 
                    className="fixed z-[9999] w-64 p-3 bg-gray-900/95 backdrop-blur text-white text-xs rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ 
                        top: position.top, 
                        left: position.left,
                        transform: position.place === 'top' ? 'translateY(-100%)' : 'translateY(0)'
                    }}
                >
                    {content}
                    <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-8 border-transparent ${
                        position.place === 'top' 
                            ? 'border-t-gray-900/95 -bottom-4' 
                            : 'border-b-gray-900/95 -top-4'
                    }`}></div>
                </div>,
                document.body
            )}
        </>
    );
};
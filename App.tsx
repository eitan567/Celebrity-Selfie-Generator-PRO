import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Icon } from './components/Icons';
import { Tooltip } from './components/Tooltip';
import { UserImage, Scenario, EditModalData } from './types';

function App() {
    // State
    const [userImages, setUserImages] = useState<UserImage[]>([]);
    // Changed: activeImageId is now an array activeImageIds
    const [activeImageIds, setActiveImageIds] = useState<number[]>([]);
    
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPausedForApproval, setIsPausedForApproval] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentPendingId, setCurrentPendingId] = useState<number | null>(null);
    const [inputMode, setInputMode] = useState<'manual' | 'bulk'>('manual');
    
    const [currentForm, setCurrentForm] = useState({
        celebrity: '',
        location: '',
        phone: 'Samsung S23 Ultra Black Case'
    });

    const [bulkText, setBulkText] = useState('');
    const [aiTopic, setAiTopic] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isParsingBulk, setIsParsingBulk] = useState(false);

    const [editModalData, setEditModalData] = useState<EditModalData | null>(null);
    const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Helper: Get selected images objects
    const selectedImages = userImages.filter(img => activeImageIds.includes(img.id));

    // --- Construct Prompt ---
    const constructPrompt = (scenario: Scenario | EditModalData) => {
        if (scenario.customFullPrompt) return scenario.customFullPrompt;

        let basePrompt = `Generate an image of:
The exact facial features, skin tone, bone structure, hairstyle, and expression of the attached
person (or persons), with no alteration or face swapping. The attached person is taking a selfie with
${scenario.celebrity}, standing at ${scenario.location}. Crew members are adjusting internal lighting and
equipment, with cables and gear visible.
Directors and managers are standing behind, discussing the next take.

Show the attached person(smiling with closed lips) on the left and the actor - hugging the person lightly with its right hand - on the right - while only the attached person is taking the selfie with its ${scenario.phone} - naturally.`;

        if (scenario.additionalDetails) {
            basePrompt += `\n\nAdditional Requirements: ${scenario.additionalDetails}`;
        }

        return basePrompt;
    };

    // --- Handlers ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length === 0) return;

        const fileReaders = files.map(file => {
            return new Promise<UserImage>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        id: Date.now() + Math.random(),
                        preview: reader.result as string,
                        base64: (reader.result as string).split(',')[1],
                        mimeType: file.type
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(fileReaders).then(newImages => {
            setUserImages(prev => [...prev, ...newImages]);
            // Auto select newly uploaded images
            setActiveImageIds(prev => [...prev, ...newImages.map(img => img.id)]);
        });
    };

    const deleteUserImage = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setUserImages(prev => prev.filter(img => img.id !== id));
        setActiveImageIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const toggleImageSelection = (id: number) => {
        setActiveImageIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const addScenario = () => {
        if (!currentForm.celebrity || !currentForm.location) return;
        setScenarios(prev => [...prev, {
            id: Date.now(),
            ...currentForm,
            status: 'idle', 
            isSelected: true,
            resultImage: null,
            additionalDetails: '',
            customFullPrompt: null
        }]);
        setCurrentForm(prev => ({ ...prev, celebrity: '', location: '' }));
    };

    const toggleSelection = (id: number) => {
        setScenarios(scenarios.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s));
    };

    const toggleSelectAll = () => {
        const allSelected = scenarios.every(s => s.isSelected);
        setScenarios(scenarios.map(s => ({ ...s, isSelected: !allSelected })));
    };

    const removeScenario = (id: number) => {
        setScenarios(scenarios.filter(s => s.id !== id));
    };

    // --- AI Logic ---
    const processBulkInputWithAI = async () => {
        if (!bulkText.trim()) return;
        setIsParsingBulk(true);
        try {
            const prompt = `You are a parser. Convert the following text list into a strictly formatted JSON array of objects. 
            Each object must have exactly two keys: "celebrity" and "location".
            Extract the celebrity name and the location/movie/context from each line.
            If the location is implied or missing, try to infer it from context or use "Unknown".
            
            Text to parse:
            """
            ${bulkText}
            """
            
            Return ONLY the raw JSON array. Do not include markdown formatting.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-09-2025',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let items: any[] = [];
            try {
                let rawText = response.text || '';
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonStart = rawText.indexOf('[');
                const jsonEnd = rawText.lastIndexOf(']');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    items = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
                } else if (rawText.startsWith('[') && rawText.endsWith(']')) {
                    items = JSON.parse(rawText);
                }
            } catch (err) {
                console.error("AI Parse Error", err);
                alert("ה-AI לא הצליח לפענח את הרשימה.");
                return;
            }

            if (items && Array.isArray(items) && items.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newScenarios: Scenario[] = items.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    celebrity: item.celebrity || 'Unknown',
                    location: item.location || 'Unknown',
                    phone: currentForm.phone,
                    status: 'idle',
                    isSelected: true,
                    resultImage: null,
                    additionalDetails: '',
                    customFullPrompt: null
                }));
                setScenarios(prev => [...prev, ...newScenarios]);
                setBulkText('');
                setInputMode('manual'); 
            } else {
                 alert("ה-AI החזיר רשימה ריקה.");
            }
        } catch (e) {
            console.error(e);
            alert("שגיאה בתקשורת עם ה-AI.");
        } finally {
            setIsParsingBulk(false);
        }
    };

    const generateAiSuggestions = async () => {
        if (!aiTopic) return;
        setIsAiLoading(true);
        try {
            const prompt = `Generate a JSON list of 5 scenarios for a selfie. Topic: "${aiTopic}". 
            Format: [{ "celebrity": "Name", "location": "Location" }]. Return ONLY raw JSON.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-09-2025',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let items: any[] = [];
            try {
                const rawText = response.text || '';
                const jsonMatch = rawText.match(/\[[\s\S]*\]/); 
                if (jsonMatch) items = JSON.parse(jsonMatch[0]);
            } catch (err) {
                // Ignore parsing errors for suggestions
            }

            if (items && items.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newScenarios: Scenario[] = items.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    celebrity: item.celebrity || item.Name || 'Unknown',
                    location: item.location || item.Location || 'Unknown',
                    phone: currentForm.phone,
                    status: 'idle',
                    isSelected: true,
                    resultImage: null,
                    additionalDetails: '',
                    customFullPrompt: null
                }));
                setScenarios(prev => [...prev, ...newScenarios]);
                setInputMode('manual');
            }
        } catch (e) {
            console.error(e);
            alert("שגיאה ביצירת רשימה");
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Generation Logic ---
    const generateImageCall = async (scenarioData: Scenario) => {
        const imgsToSend = userImages.filter(img => activeImageIds.includes(img.id));
        if (imgsToSend.length === 0) throw new Error("No active images selected");

        const finalPrompt = constructPrompt(scenarioData);
        
        // Build parts: 1 Text Prompt + N Images
        const parts = [
            { text: finalPrompt },
            ...imgsToSend.map(img => ({
                inlineData: { mimeType: img.mimeType, data: img.base64 }
            }))
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts }
        });

        // Iterate through all parts to find the image part
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/jpeg;base64,${part.inlineData.data}`;
                }
            }
        }
        
        throw new Error('No image generated');
    };

    const processQueue = async () => {
        if (activeImageIds.length === 0) return alert("נא לבחור לפחות תמונת מקור אחת");
        if (isProcessing) return; 
        
        setIsProcessing(true);
        setIsPausedForApproval(false);
    };

    const handleIndividualGenerate = async (id: number) => {
        if (activeImageIds.length === 0) return alert("נא לבחור לפחות תמונת מקור אחת");
        if (isProcessing) return alert("המערכת עסוקה בעיבוד רשימה");
        
        const item = scenarios.find(s => s.id === id);
        if (!item) return;

        setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'processing' } : s));
        
        try {
            const url = await generateImageCall(item);
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', resultImage: url } : s));
        } catch (e) {
            console.error(e);
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s));
        }
    };

    // Queue Effect
    useEffect(() => {
        if (isProcessing && !isPausedForApproval && !editModalData) {
            const nextItem = scenarios.find(s => s.isSelected && s.status === 'idle');
            
            if (nextItem) {
                const processItem = async () => {
                    setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'processing' } : s));
                    try {
                        const url = await generateImageCall(nextItem);
                        setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'approval_pending', resultImage: url } : s));
                        setIsPausedForApproval(true); // PAUSE HERE
                        setCurrentPendingId(nextItem.id);
                    } catch (e) {
                        console.error(e);
                        setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'error' } : s));
                        setIsPausedForApproval(false); 
                    }
                };
                processItem();
            } else {
                setIsProcessing(false);
            }
        }
    }, [scenarios, isProcessing, isPausedForApproval, editModalData, userImages, activeImageIds]); // Added deps to fix exhaustive-deps

    const stopProcessing = () => {
        setIsProcessing(false);
        setIsPausedForApproval(false);
        setCurrentPendingId(null);
    };

    const handleApprove = (id: number) => {
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s));
        setIsPausedForApproval(false);
        setCurrentPendingId(null);
    };

    const openEditModal = (scenario: Scenario) => {
        setEditModalData({ 
            ...scenario, 
            calculatedPrompt: constructPrompt(scenario) 
        }); 
        setShowAdvancedPrompt(false);
    };

    const handleReGenerate = async () => {
        if (!editModalData) return;
        setScenarios(prev => prev.map(s => s.id === editModalData.id ? { 
            ...s, 
            celebrity: editModalData.celebrity,
            location: editModalData.location,
            additionalDetails: editModalData.additionalDetails,
            customFullPrompt: editModalData.customFullPrompt,
            status: 'idle',
            resultImage: null
        } : s));
        setEditModalData(null); 
        setIsPausedForApproval(false); 
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-gradient-to-l from-yellow-500 to-yellow-700 text-white p-6 shadow-lg sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Icon name="Camera" /> מחולל סלפי PRO
                        </h1>
                        <p className="text-yellow-100 opacity-90 text-sm mt-1">יצירה מרובה • AI אוטומטי • בקרת איכות</p>
                    </div>
                    <div className="bg-black/20 px-4 py-2 rounded-lg">
                        <span className="text-sm font-bold">מצב מערכת: </span>
                        <span className={`font-bold ${isProcessing ? (isPausedForApproval ? 'text-blue-200' : 'text-green-300 animate-pulse') : 'text-gray-200'}`}>
                            {isProcessing ? (isPausedForApproval ? 'ממתין לאישור' : 'מעבד...') : 'מוכן'}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* --- LEFT COLUMN (Sticky) --- */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    
                    {/* 1. Gallery */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                            <Icon name="Upload" size={18} /> 1. תמונות מקור (גלריה)
                        </h2>
                        
                        <div className="relative border-2 border-yellow-400 rounded-xl bg-gray-50 h-56 flex flex-col items-center justify-center text-center overflow-hidden mb-4 shadow-sm">
                            {selectedImages.length > 0 ? (
                                <div className="w-full h-full p-2 grid gap-1 auto-rows-fr" style={{ 
                                    gridTemplateColumns: selectedImages.length === 1 ? '1fr' : 'repeat(2, 1fr)' 
                                }}>
                                    {selectedImages.slice(0, 4).map((img, idx) => (
                                        <div key={idx} className="relative w-full h-full overflow-hidden rounded-md border border-yellow-300">
                                            <img src={img.preview} className="w-full h-full object-cover" alt="Selected" />
                                            {idx === 3 && selectedImages.length > 4 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">
                                                    +{selectedImages.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <Icon name="ImageIcon" size={48} className="mb-2 opacity-50"/>
                                    <span className="text-sm">לא נבחרו תמונות</span>
                                </div>
                            )}
                            {selectedImages.length > 0 && <div className="absolute bottom-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded shadow-md font-bold">{selectedImages.length} נבחרו</div>}
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <div className="relative shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-yellow-500 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-yellow-50 transition">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple
                                    onChange={handleImageUpload} 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    title="הוסף תמונות חדשות"
                                />
                                <Icon name="Plus" className="text-gray-400" />
                            </div>

                            {userImages.map(img => {
                                const isSelected = activeImageIds.includes(img.id);
                                return (
                                    <div 
                                        key={img.id}
                                        onClick={() => toggleImageSelection(img.id)}
                                        className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition
                                            ${isSelected ? 'border-yellow-500 ring-2 ring-yellow-200 opacity-100' : 'border-gray-200 hover:border-gray-400 opacity-70'}
                                        `}
                                    >
                                        <img src={img.preview} className="w-full h-full object-cover" alt="Thumbnail" />
                                        <button 
                                            onClick={(e) => deleteUserImage(img.id, e)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600 z-10"
                                            title="מחק תמונה"
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                        {isSelected && <div className="absolute inset-0 bg-yellow-500/20 pointer-events-none"></div>}
                                        {isSelected && <div className="absolute bottom-0 right-0 bg-yellow-500 text-white p-0.5 rounded-tl"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">לחץ על תמונות כדי לסמן אותן (ניתן לבחור כמה). כולן ישלחו ל-AI לשיפור הדיוק.</p>
                    </div>

                    {/* 2. Scenarios Input */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                            <Icon name="Plus" size={18} /> 2. הוספת סצינות
                        </h2>
                        
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button onClick={() => setInputMode('manual')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${inputMode === 'manual' ? 'bg-white shadow text-yellow-600' : 'text-gray-500'}`}>ידני</button>
                            <button onClick={() => setInputMode('bulk')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${inputMode === 'bulk' ? 'bg-white shadow text-yellow-600' : 'text-gray-500'}`}>רשימה / AI</button>
                        </div>

                        {inputMode === 'manual' ? (
                            <div className="space-y-3 fade-in">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">מפורסם</label>
                                    <input type="text" value={currentForm.celebrity} onChange={(e) => setCurrentForm({...currentForm, celebrity: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900" placeholder="Modi Rosenfeld" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">מיקום</label>
                                    <input type="text" value={currentForm.location} onChange={(e) => setCurrentForm({...currentForm, location: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900" placeholder="Last Comic Standing" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">טלפון</label>
                                    <input type="text" value={currentForm.phone} onChange={(e) => setCurrentForm({...currentForm, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" disabled />
                                </div>
                                <button onClick={addScenario} disabled={!currentForm.celebrity} className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-700 flex justify-center gap-2">
                                    <Icon name="Plus" size={16} /> הוסף בודד
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 fade-in">
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <label className="text-xs font-bold text-blue-800 mb-1 block flex items-center gap-1"><Icon name="Wand2" size={12}/> AI מחולל רעיונות</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded text-sm bg-white text-gray-900" placeholder="נושא: גיבורי על, זמרים..." />
                                        <button onClick={generateAiSuggestions} disabled={isAiLoading || !aiTopic} className="bg-blue-600 text-white px-3 rounded text-sm font-bold">
                                            {isAiLoading ? <Icon name="Loader2" className="animate-spin"/> : 'צור'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-200 pt-2">
                                    <label className="text-xs font-semibold text-gray-500">הדבקת רשימה (פורמט: שם, מיקום)</label>
                                    <textarea 
                                        value={bulkText}
                                        onChange={(e) => setBulkText(e.target.value)}
                                        className="w-full h-32 p-2 border border-gray-300 rounded-lg text-sm font-mono bg-white text-gray-900"
                                        placeholder={`Gal Gadot, Wonder Woman Set\nBrad Pitt, Hollywood Red Carpet\n...`}
                                    ></textarea>
                                    <button 
                                        onClick={processBulkInputWithAI} 
                                        disabled={!bulkText || isParsingBulk} 
                                        className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                                    >
                                        {isParsingBulk ? <Icon name="Loader2" className="animate-spin" /> : <Icon name="List" />}
                                        {isParsingBulk ? 'מפענח רשימה...' : 'טען רשימה (AI)'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN (Normal Flow) --- */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4 sticky top-24 z-10 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <h2 className="font-bold text-gray-700 text-lg">תור יצירה ({scenarios.length})</h2>
                            <div className="flex gap-2 text-sm text-gray-500">
                                <button onClick={toggleSelectAll} className="hover:text-yellow-600 underline">סמן הכל</button>
                                <span>•</span>
                                <button onClick={() => setScenarios(scenarios.filter(s => !s.isSelected))} className="hover:text-red-500 underline">מחק מסומנים</button>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            {isProcessing ? (
                                <button onClick={stopProcessing} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg animate-pulse">
                                    <Icon name="Pause" /> עצור תהליך
                                </button>
                            ) : (
                                <button 
                                    onClick={processQueue} 
                                    disabled={scenarios.filter(s => s.isSelected && s.status === 'idle').length === 0 || selectedImages.length === 0}
                                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icon name="Play" /> צור נבחרים
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Queue List */}
                    <div className="space-y-4">
                        {scenarios.length === 0 && (
                            <div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed border-gray-300 text-gray-400">
                                <Icon name="List" size={48} className="mx-auto mb-2 opacity-20"/>
                                הרשימה ריקה. הוסף סצינות משמאל.
                            </div>
                        )}

                        {scenarios.map((item, index) => (
                            <div key={item.id} className={`relative bg-white rounded-xl shadow-sm border transition-all duration-300
                                ${item.status === 'approval_pending' ? 'border-blue-500 ring-4 ring-blue-100 scale-[1.02] z-10' : 'border-gray-100 hover:border-gray-300'}
                            `}>
                                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    
                                    {/* Checkbox & Status */}
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={item.isSelected} 
                                            onChange={() => toggleSelection(item.id)}
                                            disabled={isProcessing}
                                            className="w-5 h-5 rounded text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                                        />
                                        <div className="w-8">
                                            {item.status === 'completed' && <Icon name="CheckCircle" className="text-green-500" />}
                                            {item.status === 'processing' && <Icon name="Loader2" className="text-yellow-500 animate-spin" />}
                                            {item.status === 'error' && <Icon name="XCircle" className="text-red-500" />}
                                            {item.status === 'approval_pending' && <span className="text-xl">👀</span>}
                                            {item.status === 'idle' && <span className="text-gray-300 font-mono text-xs">#{index+1}</span>}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            {item.celebrity}
                                            {item.customFullPrompt && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded border border-purple-200">פרומפט מותאם</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500">{item.location}</p>
                                        {item.additionalDetails && <p className="text-xs text-yellow-600 mt-1 truncate max-w-[200px]">+ {item.additionalDetails}</p>}
                                    </div>

                                    {/* Item Actions */}
                                    <div className="flex items-center gap-2">
                                        
                                        <Tooltip content={constructPrompt(item)}>
                                            <div className="p-2 text-gray-400 hover:text-blue-500 cursor-help transition">
                                                <Icon name="Info" size={18} />
                                            </div>
                                        </Tooltip>

                                        <button 
                                            onClick={() => openEditModal(item)} 
                                            className="p-2 text-gray-400 hover:text-blue-600 transition" 
                                            title="ערוך פרומפט ספציפי"
                                        >
                                            <Icon name="FileText" size={18} />
                                        </button>

                                        {(item.status === 'idle' || item.status === 'error') && !isProcessing && (
                                            <button 
                                                onClick={() => handleIndividualGenerate(item.id)} 
                                                className="p-2 text-green-500 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded-full transition" 
                                                title="צור רק את זה"
                                            >
                                                <Icon name="Play" size={18} />
                                            </button>
                                        )}

                                        {!isProcessing && (
                                            <button onClick={() => removeScenario(item.id)} className="text-gray-300 hover:text-red-500 p-2">
                                                <Icon name="Trash2" size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* --- APPROVAL AREA --- */}
                                {item.status === 'approval_pending' && item.resultImage && (
                                    <div className="bg-blue-50 p-4 rounded-b-xl border-t border-blue-100 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            
                                            {/* Image with Overlays */}
                                            <div className="relative group rounded-lg overflow-hidden border-2 border-white shadow-md">
                                                <img src={item.resultImage} className="w-full h-auto object-cover" alt="Result" />
                                                
                                                <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a 
                                                        href={item.resultImage} 
                                                        download={`selfie_${item.celebrity}.jpg`}
                                                        className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 hover:text-blue-600 shadow-sm"
                                                        title="הורדה"
                                                    >
                                                        <Icon name="Download" size={16}/>
                                                    </a>
                                                    <button 
                                                        onClick={() => setFullscreenImage(item.resultImage)}
                                                        className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 hover:text-blue-600 shadow-sm"
                                                        title="הגדל"
                                                    >
                                                        <Icon name="Maximize" size={16}/>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-center gap-3">
                                                <h4 className="font-bold text-blue-900">ממתין לאישור שלך</h4>
                                                <p className="text-sm text-blue-700">האם התמונה תקינה? ניתן לאשר או לערוך ולנסות שוב.</p>
                                                
                                                <button 
                                                    onClick={() => handleApprove(item.id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 w-full"
                                                >
                                                    <Icon name="CheckCircle" /> אשר והמשך לבא
                                                </button>
                                                
                                                <button 
                                                    onClick={() => openEditModal(item)}
                                                    className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 py-3 rounded-lg font-bold flex items-center justify-center gap-2 w-full"
                                                >
                                                    <Icon name="Edit" /> ערוך / נסה שוב
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Completed Image Preview */}
                                {item.status === 'completed' && item.resultImage && (
                                    <div className="px-4 pb-4">
                                        <div className="relative group w-24 h-24">
                                            <img src={item.resultImage} className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm" alt="Completed" />
                                            
                                            <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <a 
                                                    href={item.resultImage} 
                                                    download={`selfie_${item.celebrity}.jpg`}
                                                    className="bg-white/90 p-1 rounded-full hover:bg-white text-gray-800"
                                                    title="הורדה"
                                                >
                                                    <Icon name="Download" size={12}/>
                                                </a>
                                                <button 
                                                    onClick={() => setFullscreenImage(item.resultImage)}
                                                    className="bg-white/90 p-1 rounded-full hover:bg-white text-gray-800"
                                                    title="הגדל"
                                                >
                                                    <Icon name="Maximize" size={12}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* --- Edit Modal --- */}
            {editModalData && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl transform scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">עריכה ויצירה מחדש</h3>
                            <button onClick={() => setEditModalData(null)} className="text-gray-400 hover:text-gray-600">
                                <Icon name="XCircle" size={24}/>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700">מפורסם</label>
                                    <input 
                                        type="text" 
                                        value={editModalData.celebrity} 
                                        onChange={(e) => setEditModalData({...editModalData, celebrity: e.target.value})}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700">מיקום</label>
                                    <input 
                                        type="text" 
                                        value={editModalData.location} 
                                        onChange={(e) => setEditModalData({...editModalData, location: e.target.value})}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    תוספת לפרומפט (לדיוק)
                                    <span className="text-xs font-normal text-gray-400">(אופציונלי)</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={editModalData.additionalDetails || ''} 
                                    onChange={(e) => setEditModalData({...editModalData, additionalDetails: e.target.value})}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none placeholder-gray-300"
                                    placeholder="לדוגמה: תאורה חשוכה, הבעה מופתעת..."
                                />
                            </div>

                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <button 
                                    onClick={() => setShowAdvancedPrompt(!showAdvancedPrompt)}
                                    className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1"
                                >
                                    <Icon name="FileText" size={14}/> 
                                    {showAdvancedPrompt ? 'הסתר עריכת פרומפט מלא' : 'מתקדם: ערוך את הפרומפט המלא'}
                                </button>
                                
                                {showAdvancedPrompt && (
                                    <div className="mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-2">עריכה כאן תנתק את התמונה מהתבנית הכללית ותשתמש רק בטקסט הזה.</p>
                                        <textarea 
                                            value={editModalData.customFullPrompt || constructPrompt(editModalData)}
                                            onChange={(e) => setEditModalData({...editModalData, customFullPrompt: e.target.value})}
                                            className="w-full h-32 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 outline-none font-mono"
                                        ></textarea>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={handleReGenerate}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 flex justify-center gap-2"
                            >
                                <Icon name="Camera" /> שמור וצור מחדש
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Fullscreen Modal --- */}
            {fullscreenImage && (
                <div 
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 fade-in cursor-zoom-out"
                    onClick={() => setFullscreenImage(null)}
                >
                    <img 
                        src={fullscreenImage} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                        onClick={(e) => e.stopPropagation()} 
                        alt="Fullscreen"
                    />
                    <button 
                        onClick={() => setFullscreenImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                    >
                        <Icon name="XCircle" size={40} />
                    </button>
                </div>
            )}

        </div>
    );
}

export default App;
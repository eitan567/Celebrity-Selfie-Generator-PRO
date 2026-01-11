import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Icon } from './components/Icons';
import { Tooltip } from './components/Tooltip';
import { UserImage, Scenario, EditModalData, PromptTemplate, ToastMessage, ImageVersion } from './types';

// --- DEFINED TEMPLATES ---
const DEFAULT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'celebrity-selfie',
        title: 'סלפי עם מפורסם',
        description: 'צור תמונת סלפי ריאליסטית שלך עם המפורסם האהוב עליך, כולל צוות הפקה וציוד ברקע.',
        iconName: 'Camera',
        colorFrom: 'from-yellow-500',
        colorTo: 'to-yellow-700', // Reverted to original darker yellow/gold
        basePromptGenerator: (celebrity, location, phone, details) => {
            let prompt = `Generate an image of:
The exact facial features, skin tone, bone structure, hairstyle, and expression of the attached
person (or persons), with no alteration or face swapping. The attached person is taking a selfie with
${celebrity}, standing at ${location}. Crew members are adjusting internal lighting and
equipment, with cables and gear visible.
Directors and managers are standing behind, discussing the next take.

Show the attached person(smiling with closed lips) on the left and the actor - hugging the person lightly with its right hand - on the right - while only the attached person is taking the selfie with its ${phone} - naturally.`;
            if (details) prompt += `\n\nAdditional Requirements: ${details}`;
            return prompt;
        }
    },
    {
        id: 'red-carpet',
        title: 'פפראצי שטיח אדום',
        description: 'אתה והמפורסם צועדים יחד על השטיח האדום, מוקפים בצלמים ואורות פלאש.',
        iconName: 'Star',
        colorFrom: 'from-red-500',
        colorTo: 'to-orange-500',
        basePromptGenerator: (celebrity, location, phone, details) => {
            let prompt = `Generate a high-quality paparazzi style photo of the attached person walking side-by-side with ${celebrity} on a prestigious red carpet event at ${location}. 
            The attached person should look glamorous and confident. 
            Background should include blurred photographers with flashbulbs going off, red velvet ropes, and an excited crowd.
            Lighting should be dramatic and high-contrast typical of night events.`;
            if (details) prompt += `\n\nAdditional Requirements: ${details}`;
            return prompt;
        }
    },
    {
        id: 'coffee-date',
        title: 'פגישת קפה',
        description: 'תמונה קזואלית ואינטימית שלך יושב לקפה עם מפורסם בבית קפה אופנתי.',
        iconName: 'LayoutGrid',
        colorFrom: 'from-amber-700',
        colorTo: 'to-yellow-600',
        basePromptGenerator: (celebrity, location, phone, details) => {
            let prompt = `Generate a candid photo of the attached person sitting at a cafe table across from ${celebrity} at ${location}. 
            They are laughing and enjoying coffee. The atmosphere is warm, cozy, and natural sunlight is coming through the window.
            The attached person is visible clearly. Focus on realistic textures and casual clothing.`;
            if (details) prompt += `\n\nAdditional Requirements: ${details}`;
            return prompt;
        }
    }
];

// --- SUGGESTED TOPICS FOR AI ---
const SUGGESTED_TOPICS = [
    "גיבורי על בסרט פעולה",
    "זמרים מפורסמים בהופעה חיה",
    "דמויות היסטוריות במאה ה-21",
    "שחקני כדורגל במונדיאל",
    "כוכבי קולנוע על סט צילומים",
    "דמויות מצוירות בעולם אמיתי",
    "פוליטיקאים בפגישה סודית",
    "אסטרונאוטים בחלל",
    "שפים מפורסמים במטבח",
    "דוגמניות בשבוע האופנה בפריז",
    "מנכ\"לי הייטק בעמק הסיליקון",
    "זוכי אוסקר בטקס הפרסים"
];

function App() {
    // --- State: View Mode & Templates ---
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

    // --- State: New Template Form ---
    const [newTemplateForm, setNewTemplateForm] = useState({
        title: '',
        description: '',
        userTemplateString: 'Generate a photo of the attached person with {celebrity} at {location}. They are holding {phone}...'
    });

    // --- State: Generator ---
    const [userImages, setUserImages] = useState<UserImage[]>([]);
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

    // --- State: Bulk / AI Input ---
    const [bulkText, setBulkText] = useState('');
    const [aiTopic, setAiTopic] = useState('');
    const [showTopicDropdown, setShowTopicDropdown] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isParsingBulk, setIsParsingBulk] = useState(false);

    const [editModalData, setEditModalData] = useState<EditModalData | null>(null);
    const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [modificationPrompt, setModificationPrompt] = useState('');
    // Global flag (optional, but good for blocking queue), we now mostly use item.isModifying
    const [isModifyingGlobal, setIsModifyingGlobal] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowTopicDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Toast System ---
    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Helper: Get selected images objects
    const selectedImages = userImages.filter(img => activeImageIds.includes(img.id));

    // --- Construct Prompt (Dynamic based on Template) ---
    const constructPrompt = (scenario: Scenario | EditModalData) => {
        if (scenario.customFullPrompt) return scenario.customFullPrompt;
        if (!selectedTemplate) return "";

        // Handle Custom String Templates
        if (selectedTemplate.userTemplateString) {
            let prompt = selectedTemplate.userTemplateString
                .replace(/{celebrity}/g, scenario.celebrity)
                .replace(/{location}/g, scenario.location)
                .replace(/{phone}/g, scenario.phone);
            
            if (scenario.additionalDetails) {
                prompt += `\n\nAdditional details: ${scenario.additionalDetails}`;
            }
            // Always append the technical requirement for the attached person
            prompt += `\n\n(IMPORTANT: Use the attached face image for the main subject. Keep facial features exact. No face swapping.)`;
            return prompt;
        }

        // Handle Built-in Function Templates
        if (selectedTemplate.basePromptGenerator) {
            return selectedTemplate.basePromptGenerator(
                scenario.celebrity,
                scenario.location,
                scenario.phone,
                scenario.additionalDetails
            );
        }

        return "";
    };

    // --- Handlers ---
    const handleSaveTemplate = () => {
        if (!newTemplateForm.title || !newTemplateForm.userTemplateString) {
            addToast("נא למלא כותרת ותבנית פרומפט", 'error');
            return;
        }
        
        const newTemplate: PromptTemplate = {
            id: `custom-${Date.now()}`,
            title: newTemplateForm.title,
            description: newTemplateForm.description || 'תבנית מותאמת אישית',
            iconName: 'Wand2',
            colorFrom: 'from-gray-700',
            colorTo: 'to-gray-900',
            userTemplateString: newTemplateForm.userTemplateString,
            isCustom: true
        };

        setCustomTemplates([...customTemplates, newTemplate]);
        setIsCreatingTemplate(false);
        setNewTemplateForm({ title: '', description: '', userTemplateString: 'Generate a photo of the attached person with {celebrity} at {location}. They are holding {phone}...' });
        addToast("תבנית חדשה נשמרה בהצלחה", 'success');
    };

    const deleteTemplate = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setCustomTemplates(prev => prev.filter(t => t.id !== id));
        addToast("התבנית נמחקה", 'info');
    };

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
            setActiveImageIds(prev => [...prev, ...newImages.map(img => img.id)]);
            addToast(`${newImages.length} תמונות הועלו בהצלחה`, 'success');
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
            customFullPrompt: null,
            aspectRatio: '1:1',
            isModifying: false,
            isExpanded: false,
            history: [] // Initialize history
        }]);
        setCurrentForm(prev => ({ ...prev, celebrity: '', location: '' }));
    };

    const updateScenarioRatio = (id: number, ratio: string) => {
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, aspectRatio: ratio } : s));
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

    // --- History Helper ---
    const restoreVersion = (scenarioId: number, version: ImageVersion) => {
        setScenarios(prev => prev.map(s => {
            if (s.id === scenarioId) {
                return {
                    ...s,
                    resultImage: version.imageUrl,
                    // We don't change the main prompts, just the visual result.
                    // Future edits will be based on this restored version.
                };
            }
            return s;
        }));
    };

    const toggleExpand = (id: number) => {
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s));
    };

    // --- AI Logic (Same as before) ---
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
                addToast("ה-AI לא הצליח לפענח את הרשימה.", 'error');
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
                    customFullPrompt: null,
                    aspectRatio: '1:1',
                    isModifying: false,
                    isExpanded: false,
                    history: []
                }));
                setScenarios(prev => [...prev, ...newScenarios]);
                setBulkText('');
                setInputMode('manual'); 
                addToast(`${newScenarios.length} סצינות נוספו בהצלחה`, 'success');
            } else {
                 addToast("ה-AI החזיר רשימה ריקה.", 'error');
            }
        } catch (e) {
            console.error(e);
            addToast("שגיאה בתקשורת עם ה-AI.", 'error');
        } finally {
            setIsParsingBulk(false);
        }
    };

    const generateAiSuggestions = async () => {
        if (!aiTopic) return;
        setIsAiLoading(true);
        setShowTopicDropdown(false);
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
                    customFullPrompt: null,
                    aspectRatio: '1:1',
                    isModifying: false,
                    isExpanded: false,
                    history: []
                }));
                setScenarios(prev => [...prev, ...newScenarios]);
                setInputMode('manual');
            }
        } catch (e) {
            console.error(e);
            addToast("שגיאה ביצירת רשימה", 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Generation Logic ---
    const generateImageCall = async (scenarioData: Scenario) => {
        const imgsToSend = userImages.filter(img => activeImageIds.includes(img.id));
        if (imgsToSend.length === 0) throw new Error("No active images selected");

        const finalPrompt = constructPrompt(scenarioData);
        
        const parts = [
            { text: finalPrompt },
            ...imgsToSend.map(img => ({
                inlineData: { mimeType: img.mimeType, data: img.base64 }
            }))
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: scenarioData.aspectRatio || "1:1"
                }
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const content = candidates[0].content;
            if (content && content.parts) {
                // Priority: Check for image
                for (const part of content.parts) {
                    if (part.inlineData) {
                        return `data:image/jpeg;base64,${part.inlineData.data}`;
                    }
                }
                // Fallback: Check for text (refusal/error)
                for (const part of content.parts) {
                    if (part.text) {
                         throw new Error(part.text);
                    }
                }
            }
        }
        
        throw new Error('No image generated (Unknown reason)');
    };

    // --- Modify Generated Image ---
    const modifyGeneratedImage = async (id: number, instruction: string) => {
        if (!instruction.trim()) return;
        
        const scenario = scenarios.find(s => s.id === id);
        if (!scenario || !scenario.resultImage) return;

        setIsModifyingGlobal(true);
        // CHANGE: Do NOT change status to 'processing', instead set isModifying: true to keep card open
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, isModifying: true } : s));

        try {
            const base64Data = scenario.resultImage.split(',')[1];
            
            // Refined prompt to ensure image output
            const refinedInstruction = `Edit the attached image according to this instruction: ${instruction}. Return the edited image.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: refinedInstruction }
                    ]
                },
                config: {
                    imageConfig: {
                        aspectRatio: scenario.aspectRatio || "1:1"
                    }
                }
            });

            let newImageUrl = null;
            const candidates = response.candidates;
            if (candidates && candidates.length > 0) {
                const content = candidates[0].content;
                 if (content && content.parts) {
                    for (const part of content.parts) {
                        if (part.inlineData) {
                            newImageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
                            break;
                        }
                    }
                    if (!newImageUrl) {
                         for (const part of content.parts) {
                            if (part.text) {
                                throw new Error(part.text);
                            }
                        }
                    }
                 }
            }

            if (newImageUrl) {
                const newVersion: ImageVersion = {
                    id: Date.now().toString(),
                    imageUrl: newImageUrl,
                    prompt: instruction,
                    timestamp: Date.now(),
                    type: 'edit'
                };

                // Update image, clear isModifying, keep status as approval_pending (or whatever it was)
                setScenarios(prev => prev.map(s => s.id === id ? { 
                    ...s, 
                    isModifying: false, 
                    resultImage: newImageUrl,
                    history: [...s.history, newVersion] // Add to history
                } : s));
                
                setModificationPrompt(''); // Clear input
                addToast("התמונה עודכנה בהצלחה!", 'success');
            } else {
                throw new Error("No image returned from modification");
            }

        } catch (e) {
            console.error("Modification Error", e);
            addToast("שגיאה בעריכת התמונה: " + (e instanceof Error ? e.message : ''), 'error');
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, isModifying: false } : s));
        } finally {
            setIsModifyingGlobal(false);
        }
    };

    const processQueue = async () => {
        if (activeImageIds.length === 0) {
            addToast("נא לבחור לפחות תמונת מקור אחת מהגלריה", 'error');
            return;
        }
        if (isProcessing) return; 
        
        setIsProcessing(true);
        setIsPausedForApproval(false);
    };

    const handleIndividualGenerate = async (id: number) => {
        if (activeImageIds.length === 0) {
            addToast("נא לבחור לפחות תמונת מקור אחת מהגלריה", 'error');
            return;
        }
        if (isProcessing) {
            addToast("המערכת עסוקה בעיבוד רשימה", 'info');
            return;
        }
        
        const item = scenarios.find(s => s.id === id);
        if (!item) return;

        setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'processing' } : s));
        
        try {
            const url = await generateImageCall(item);
            
            const newVersion: ImageVersion = {
                id: Date.now().toString(),
                imageUrl: url,
                prompt: constructPrompt(item),
                timestamp: Date.now(),
                type: 'initial'
            };

            // CHANGE: Set status to 'approval_pending' and add history
            setScenarios(prev => prev.map(s => s.id === id ? { 
                ...s, 
                status: 'approval_pending', 
                resultImage: url,
                history: [...s.history, newVersion]
            } : s));
        } catch (e) {
            console.error(e);
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s));
        }
    };

    // Queue Effect
    useEffect(() => {
        if (isProcessing && !isPausedForApproval && !editModalData && !isModifyingGlobal) {
            const nextItem = scenarios.find(s => s.isSelected && s.status === 'idle');
            
            if (nextItem) {
                const processItem = async () => {
                    setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'processing' } : s));
                    try {
                        const url = await generateImageCall(nextItem);
                        
                        const newVersion: ImageVersion = {
                            id: Date.now().toString(),
                            imageUrl: url,
                            prompt: constructPrompt(nextItem),
                            timestamp: Date.now(),
                            type: 'initial'
                        };

                        setScenarios(prev => prev.map(s => s.id === nextItem.id ? { 
                            ...s, 
                            status: 'approval_pending', 
                            resultImage: url,
                            history: [...s.history, newVersion] 
                        } : s));
                        setIsPausedForApproval(true);
                        setCurrentPendingId(nextItem.id);
                    } catch (e) {
                        console.error(e);
                        // Make sure to display the error text from the throw in generateImageCall
                        addToast(e instanceof Error ? e.message : "שגיאה לא ידועה", 'error');
                        setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'error' } : s));
                        setIsPausedForApproval(false); 
                    }
                };
                processItem();
            } else {
                setIsProcessing(false);
                if (scenarios.some(s => s.isSelected && s.status === 'completed')) {
                    addToast("תהליך העיבוד הסתיים!", 'success');
                }
            }
        }
    }, [scenarios, isProcessing, isPausedForApproval, editModalData, userImages, activeImageIds, selectedTemplate, isModifyingGlobal]); 

    const stopProcessing = () => {
        setIsProcessing(false);
        setIsPausedForApproval(false);
        setCurrentPendingId(null);
        addToast("תהליך העיבוד נעצר", 'info');
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

        // 1. Capture data needed
        const currentId = editModalData.id;
        const updatedScenarioData: Scenario = {
            ...scenarios.find(s => s.id === currentId)!,
            celebrity: editModalData.celebrity,
            location: editModalData.location,
            additionalDetails: editModalData.additionalDetails,
            customFullPrompt: editModalData.customFullPrompt,
            aspectRatio: editModalData.aspectRatio,
        };

        // 2. Close Modal immediately
        setEditModalData(null);

        // 3. Set UI state to "Modifying" on the card
        setScenarios(prev => prev.map(s => s.id === currentId ? {
            ...updatedScenarioData, // Update text fields
            status: 'approval_pending', // Keep expanded
            isModifying: true // Show loader overlay
        } : s));

        try {
            // 4. Generate
            const url = await generateImageCall(updatedScenarioData);

            const newVersion: ImageVersion = {
                id: Date.now().toString(),
                imageUrl: url,
                prompt: constructPrompt(updatedScenarioData),
                timestamp: Date.now(),
                type: 'regeneration'
            };

            // 5. Update result
            setScenarios(prev => prev.map(s => s.id === currentId ? {
                ...s,
                status: 'approval_pending',
                isModifying: false,
                resultImage: url,
                history: [...s.history, newVersion]
            } : s));

            addToast("נוצרה גרסה חדשה בהצלחה", 'success');
        } catch (e) {
            console.error("Regeneration Error", e);
            addToast("שגיאה ביצירה מחדש: " + (e instanceof Error ? e.message : ''), 'error');
            // Reset state on error
            setScenarios(prev => prev.map(s => s.id === currentId ? { ...s, isModifying: false } : s));
        }
    };

    const exitToSelection = () => {
        // Removed window.confirm for faster navigation based on feedback
        setSelectedTemplate(null);
        setScenarios([]);
        setUserImages([]);
        setActiveImageIds([]);
    };

    // --- RENDER: SELECTION SCREEN ---
    if (!selectedTemplate) {
        return (
            <div className="min-h-screen bg-gray-50 font-heebo">
                <header className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white p-8 pb-16 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="max-w-7xl mx-auto relative z-10 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white/20 p-3 rounded-full border border-white/20 backdrop-blur">
                                <Icon name="Sparkles" size={32} className="text-white" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">סטודיו AI PRO</h1>
                        <p className="text-xl text-yellow-50 max-w-2xl mx-auto">בחר תבנית, העלה תמונה, וה-AI ישלב אותך בסצינות מדהימות.</p>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto -mt-8 px-4 pb-20 space-y-8">
                    
                    {/* Default Templates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DEFAULT_TEMPLATES.map(template => (
                            <button 
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className="group bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-right hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full"
                            >
                                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${template.colorFrom} ${template.colorTo}`}></div>
                                
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${template.colorFrom} ${template.colorTo} text-white shadow-md group-hover:scale-110 transition-transform`}>
                                        <Icon name={template.iconName} size={28} />
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                                        <Icon name="ArrowRight" />
                                    </div>
                                </div>
                                
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{template.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow">{template.description}</p>
                                
                                <div className="mt-auto w-full bg-gray-50 text-gray-600 font-bold py-3 rounded-lg group-hover:bg-gray-800 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                                    התחל ליצור
                                </div>
                            </button>
                        ))}

                        {/* Custom Templates Render */}
                        {customTemplates.map(template => (
                             <button 
                             key={template.id}
                             onClick={() => setSelectedTemplate(template)}
                             className="group bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-6 text-right hover:border-gray-500 hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
                         >
                             <div className="absolute top-2 left-2 flex gap-2 z-10">
                                 <div 
                                     onClick={(e) => deleteTemplate(e, template.id)} 
                                     className="bg-gray-200 hover:bg-red-500 hover:text-white p-1.5 rounded-full transition"
                                 >
                                     <Icon name="Trash2" size={14} />
                                 </div>
                             </div>

                             <div className="flex items-start justify-between mb-4">
                                 <div className={`p-3 rounded-xl bg-gradient-to-br ${template.colorFrom} ${template.colorTo} text-white shadow-md`}>
                                     <Icon name={template.iconName} size={28} />
                                 </div>
                                 <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">מותאם אישית</span>
                             </div>
                             
                             <h3 className="text-xl font-bold text-gray-800 mb-2">{template.title}</h3>
                             <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow truncate">{template.description}</p>
                             
                             <div className="mt-auto w-full bg-gray-800 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                                 הפעל תבנית
                             </div>
                         </button>
                        ))}

                        {/* Create New Template Card */}
                        <button 
                            onClick={() => setIsCreatingTemplate(true)}
                            className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-yellow-500 hover:bg-yellow-50 p-6 flex flex-col items-center justify-center text-center gap-4 transition-all group min-h-[250px]"
                        >
                            <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                <Icon name="Plus" size={32} className="text-gray-400 group-hover:text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-600 group-hover:text-gray-800">צור תבנית חדשה</h3>
                            <p className="text-xs text-gray-400">הגדר פרומפט קבוע משלך לשימוש חוזר</p>
                        </button>
                    </div>

                    {/* Create Template Modal */}
                    {isCreatingTemplate && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm fade-in">
                            <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
                                <button onClick={() => setIsCreatingTemplate(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                    <Icon name="XCircle" size={24}/>
                                </button>
                                
                                {/* Moved Wand Icon here */}
                                <div className="absolute top-4 left-4 text-yellow-500">
                                    <Icon name="Wand2" size={24}/>
                                </div>
                                
                                <h2 className="text-xl font-bold mb-4">
                                     יצירת תבנית חדשה
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">שם התבנית</label>
                                        <input 
                                            type="text" 
                                            value={newTemplateForm.title}
                                            onChange={(e) => setNewTemplateForm({...newTemplateForm, title: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900"
                                            placeholder="לדוגמה: צילום בחוף הים"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">תיאור קצר</label>
                                        <input 
                                            type="text" 
                                            value={newTemplateForm.description}
                                            onChange={(e) => setNewTemplateForm({...newTemplateForm, description: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900"
                                            placeholder="תיאור שיופיע בכרטיסיה"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">תבנית הפרומפט (באנגלית)</label>
                                        <p className="text-xs text-gray-500 mb-2">השתמש בסוגריים מסולסלים כדי להוסיף את המשתנים: <span className="font-mono bg-gray-100 px-1 rounded">{`{celebrity}`}</span>, <span className="font-mono bg-gray-100 px-1 rounded">{`{location}`}</span>, <span className="font-mono bg-gray-100 px-1 rounded">{`{phone}`}</span>.</p>
                                        <textarea 
                                            value={newTemplateForm.userTemplateString}
                                            onChange={(e) => setNewTemplateForm({...newTemplateForm, userTemplateString: e.target.value})}
                                            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none font-mono text-sm bg-white text-gray-900"
                                        ></textarea>
                                    </div>

                                    <button 
                                        onClick={handleSaveTemplate}
                                        className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition"
                                    >
                                        שמור תבנית
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* TOAST CONTAINER FOR SELECTION SCREEN */}
                     <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                        {toasts.map(toast => (
                            <div 
                                key={toast.id} 
                                onClick={() => removeToast(toast.id)}
                                className={`
                                    pointer-events-auto shadow-2xl rounded-lg p-4 text-white min-w-[300px] flex items-center justify-between gap-3 cursor-pointer
                                    animate-in slide-in-from-bottom-5 fade-in duration-300
                                    ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-gray-800'}
                                `}
                            >
                                <span className="font-bold text-sm">{toast.message}</span>
                                <Icon name="XCircle" size={16} className="opacity-70 hover:opacity-100"/>
                            </div>
                        ))}
                    </div>
                </main>

                <footer className="text-center text-gray-400 text-sm py-8">
                    Powered by Google Gemini 2.5
                </footer>
            </div>
        );
    }

    // --- RENDER: GENERATOR SCREEN (Existing UI) ---
    return (
        <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
            <header className={`bg-gradient-to-l ${selectedTemplate.colorFrom} ${selectedTemplate.colorTo} text-white p-6 shadow-lg z-20 shrink-0`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={exitToSelection}
                            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition backdrop-blur cursor-pointer z-50"
                            title="חזרה לתפריט ראשי"
                        >
                            <Icon name="Home" size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Icon name={selectedTemplate.iconName} /> {selectedTemplate.title}
                            </h1>
                            <p className="text-white/80 text-sm mt-1 opacity-90">מחולל סלפי AI PRO</p>
                        </div>
                    </div>
                    <div className="bg-black/20 px-4 py-2 rounded-lg backdrop-blur">
                        <span className="text-sm font-bold">מצב: </span>
                        <span className={`font-bold ${isProcessing ? (isPausedForApproval ? 'text-blue-200' : 'text-green-300 animate-pulse') : 'text-gray-200'}`}>
                            {isProcessing ? (isPausedForApproval ? 'ממתין לאישור' : 'מעבד...') : 'מוכן'}
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                
                {/* --- LEFT COLUMN (Sticky) --- */}
                <div className="lg:col-span-4 h-full overflow-y-auto pr-2 pb-4 scrollbar-hide">
                    <div className="space-y-6">
                    {/* 1. Gallery */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                            <Icon name="Upload" size={18} /> 1. תמונות מקור (גלריה)
                        </h2>
                        
                        <div className={`relative border-2 border-dashed rounded-xl h-56 flex flex-col items-center justify-center text-center overflow-hidden mb-4 shadow-sm transition-all duration-300 group
                            ${selectedImages.length > 0 
                                ? 'border-transparent bg-gray-50' 
                                : 'border-gray-300 bg-gray-50 hover:border-yellow-500 hover:bg-yellow-50'
                            }`}
                        >
                            {selectedImages.length > 0 ? (
                                <div className="w-full h-full p-2 grid gap-1 auto-rows-fr" style={{ 
                                    gridTemplateColumns: selectedImages.length === 1 ? '1fr' : 'repeat(2, 1fr)' 
                                }}>
                                    {selectedImages.slice(0, 4).map((img, idx) => (
                                        <div key={idx} className="relative w-full h-full overflow-hidden rounded-md border border-gray-200">
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
                                <div className="flex flex-col items-center text-gray-400 transition-colors">
                                    <Icon name="ImageIcon" size={48} className="mb-2 opacity-50 group-hover:text-yellow-500 group-hover:scale-110 transition-transform"/>
                                    <span className="text-sm font-medium text-gray-400">לא נבחרו תמונות</span>
                                </div>
                            )}
                            {selectedImages.length > 0 && <div className="absolute bottom-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md font-bold">{selectedImages.length} נבחרו</div>}
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
                        <p className="text-xs text-gray-400 mt-1">לחץ על תמונות כדי לסמן אותן. התמונות המסומנות ישמשו כרפרנס ליצירה.</p>
                    </div>

                    {/* 2. Scenarios Input */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                            <Icon name="Plus" size={18} /> 2. הוספת סצינות
                        </h2>
                        
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button onClick={() => setInputMode('manual')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${inputMode === 'manual' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>ידני</button>
                            <button onClick={() => setInputMode('bulk')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${inputMode === 'bulk' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>רשימה / AI</button>
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
                                    <label className="text-xs font-semibold text-gray-500">טלפון / פריט</label>
                                    <input type="text" value={currentForm.phone} onChange={(e) => setCurrentForm({...currentForm, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" disabled />
                                </div>
                                <button onClick={addScenario} disabled={!currentForm.celebrity} className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-700 flex justify-center gap-2">
                                    <Icon name="Plus" size={16} /> הוסף בודד
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 fade-in">
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 relative">
                                    <label className="text-xs font-bold text-blue-800 mb-1 block flex items-center gap-1"><Icon name="Wand2" size={12}/> AI מחולל רעיונות</label>
                                    <div className="flex gap-2 relative" ref={dropdownRef}>
                                        <div className="relative flex-1">
                                            <input 
                                                type="text" 
                                                value={aiTopic} 
                                                onChange={(e) => {
                                                    setAiTopic(e.target.value);
                                                    setShowTopicDropdown(true);
                                                }}
                                                onFocus={() => setShowTopicDropdown(true)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-white text-gray-900" 
                                                placeholder="נושא: גיבורי על, זמרים..." 
                                            />
                                            {showTopicDropdown && (
                                                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                                    {SUGGESTED_TOPICS.filter(t => t.includes(aiTopic)).map((topic, idx) => (
                                                        <li 
                                                            key={idx} 
                                                            onClick={() => {
                                                                setAiTopic(topic);
                                                                setShowTopicDropdown(false);
                                                            }}
                                                            className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none"
                                                        >
                                                            {topic}
                                                        </li>
                                                    ))}
                                                    {SUGGESTED_TOPICS.filter(t => t.includes(aiTopic)).length === 0 && (
                                                        <li className="px-3 py-2 text-xs text-gray-400">אין הצעות מתאימות</li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
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
                </div>

                {/* --- RIGHT COLUMN (Normal Flow) --- */}
                <div className="lg:col-span-8 h-full flex flex-col min-h-0">
                    
                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4 border border-gray-100 mb-4 shrink-0">
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
                                    disabled={scenarios.filter(s => s.isSelected && s.status === 'idle').length === 0}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icon name="Play" /> צור נבחרים
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Queue List */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 pb-2 mb-8 scrollbar-thin">
                        <div className="space-y-4">
                        {scenarios.length === 0 && (
                            <div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed border-gray-300 text-gray-400">
                                <Icon name="List" size={48} className="mx-auto mb-2 opacity-20"/>
                                הרשימה ריקה. הוסף סצינות משמאל.
                            </div>
                        )}

                        {scenarios.map((item, index) => (
                            <div key={item.id} className={`relative bg-white rounded-xl shadow-sm border transition-all duration-300
                                ${item.status === 'approval_pending' ? 'border-yellow-500 ring-4 ring-yellow-100 scale-[1] z-10' : 'border-gray-100 hover:border-gray-300'}
                            `}>
                                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    
                                    {/* Checkbox & Status */}
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={item.isSelected} 
                                            onChange={() => toggleSelection(item.id)}
                                            disabled={isProcessing}
                                            className="w-5 h-5 rounded accent-yellow-500 cursor-pointer"
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

                                    {/* Aspect Ratio Selector */}
                                    <div className="flex flex-col items-center">
                                         <label className="text-[10px] font-bold text-gray-400 mb-0.5">Ratio</label>
                                         <select
                                            value={item.aspectRatio || "1:1"}
                                            onChange={(e) => updateScenarioRatio(item.id, e.target.value)}
                                            disabled={isProcessing || item.status === 'processing' || item.isModifying}
                                            className="text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none focus:border-yellow-500 text-gray-700 font-mono cursor-pointer"
                                        >
                                            <option value="1:1">1:1</option>
                                            <option value="16:9">16:9</option>
                                            <option value="9:16">9:16</option>
                                            <option value="4:3">4:3</option>
                                            <option value="3:4">3:4</option>
                                        </select>
                                    </div>

                                    {/* Item Actions */}
                                    <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-2">
                                        
                                        <Tooltip content={constructPrompt(item)}>
                                            <div className="p-2 text-gray-400 hover:text-yellow-500 cursor-help transition">
                                                <Icon name="Info" size={18} />
                                            </div>
                                        </Tooltip>

                                        <button 
                                            onClick={() => openEditModal(item)} 
                                            className="p-2 text-gray-400 hover:text-yellow-600 transition" 
                                            title="ערוך פרומפט ספציפי"
                                            disabled={item.isModifying}
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
                                    <div className="bg-yellow-50 p-4 rounded-b-xl border-t border-yellow-100 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            
                                            {/* Image with Overlays */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-center w-full">
                                                    <div className={`relative group w-full rounded-lg border-2 border-white shadow-md bg-gray-50 transition-all duration-500 ease-in-out ${item.isExpanded ? 'h-auto' : 'h-80 overflow-hidden'}`}>
                                                        <img src={item.resultImage} className={`${item.isExpanded ? 'w-full h-auto' : 'w-full h-full object-cover object-top'}`} alt="Result" />
                                                        
                                                        {/* Modification Loader Overlay */}
                                                        {item.isModifying && (
                                                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                                                <Icon name="Loader2" className="animate-spin text-yellow-600 mb-2" size={32} />
                                                                <span className="text-yellow-800 font-bold text-sm shadow-sm">מעדכן תמונה...</span>
                                                            </div>
                                                        )}

                                                        {/* Expand Overlay Button (Only when collapsed) */}
                                                        {!item.isExpanded && (
                                                            <div 
                                                                onClick={() => toggleExpand(item.id)}
                                                                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-4 cursor-pointer hover:via-white/90 transition-all group/expand"
                                                            >
                                                                <span className="bg-white/80 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold text-gray-800 flex items-center gap-1 shadow-sm border border-gray-200 group-hover/expand:scale-105 transition-transform">
                                                                    <Icon name="ChevronDown" size={16} /> הצג תמונה מלאה
                                                                </span>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Collapse Button (Only when expanded) */}
                                                        {item.isExpanded && (
                                                             <button 
                                                                onClick={() => toggleExpand(item.id)}
                                                                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold text-gray-800 flex items-center gap-1 shadow-md border border-gray-200 hover:bg-white transition"
                                                            >
                                                                <Icon name="ChevronUp" size={16} /> הקטן תצוגה
                                                            </button>
                                                        )}

                                                        <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <a 
                                                                href={item.resultImage} 
                                                                download={`selfie_${item.celebrity}.jpg`}
                                                                className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 hover:text-yellow-600 shadow-sm"
                                                                title="הורדה"
                                                            >
                                                                <Icon name="Download" size={16}/>
                                                            </a>
                                                            <button 
                                                                onClick={() => setFullscreenImage(item.resultImage)}
                                                                className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 hover:text-yellow-600 shadow-sm"
                                                                title="הגדל"
                                                            >
                                                                <Icon name="Maximize" size={16}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* History Gallery */}
                                                {item.history && item.history.length > 1 && (
                                                    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-hide">
                                                        {item.history.slice().reverse().map((version) => (
                                                            <div 
                                                                key={version.id}
                                                                onClick={() => restoreVersion(item.id, version)}
                                                                className={`relative shrink-0 w-12 h-12 rounded cursor-pointer border-2 overflow-hidden transition-all
                                                                    ${item.resultImage === version.imageUrl ? 'border-yellow-500 ring-1 ring-yellow-300' : 'border-gray-300 opacity-60 hover:opacity-100'}
                                                                `}
                                                                title={`גרסה: ${version.type === 'initial' ? 'ראשונית' : version.prompt}`}
                                                            >
                                                                <img src={version.imageUrl} className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-yellow-900 mb-1">ממתין לאישור שלך</h4>
                                                    <p className="text-sm text-yellow-700 mb-2">האם התמונה תקינה? ניתן לאשר, לערוך מחדש, או לשנות אלמנטים בתמונה הקיימת.</p>
                                                    
                                                    {/* Image Modifier Input */}
                                                    <div className="bg-white/80 p-2 rounded-lg border border-yellow-200 mb-3">
                                                        <label className="text-xs font-bold text-yellow-800 mb-1 block">שינוי התמונה (Image Editing)</label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text"
                                                                value={modificationPrompt}
                                                                onChange={(e) => setModificationPrompt(e.target.value)}
                                                                placeholder="לדוגמה: תוסיף כובע, תוריד את העץ..."
                                                                className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900"
                                                                disabled={item.isModifying}
                                                            />
                                                            <button 
                                                                onClick={() => modifyGeneratedImage(item.id, modificationPrompt)}
                                                                disabled={!modificationPrompt || item.isModifying || isModifyingGlobal}
                                                                className="bg-yellow-200 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-800 px-3 rounded font-bold text-sm"
                                                            >
                                                                {item.isModifying ? <Icon name="Loader2" className="animate-spin" size={14}/> : 'שנה'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <button 
                                                        onClick={() => handleApprove(item.id)}
                                                        className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={item.isModifying}
                                                    >
                                                        <Icon name="CheckCircle" /> אשר והמשך לבא
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => openEditModal(item)}
                                                        className="bg-white hover:bg-gray-50 text-yellow-600 border border-yellow-200 py-3 rounded-lg font-bold flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={item.isModifying}
                                                    >
                                                        <Icon name="Edit" /> צור מחדש (פרומפט מקורי)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Completed Image Preview */}
                                {item.status === 'completed' && item.resultImage && (
                                    <div className="px-4 pb-4 flex items-center justify-between">
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
                                        
                                        <button 
                                            onClick={() => setScenarios(prev => prev.map(s => s.id === item.id ? { ...s, status: 'approval_pending' } : s))}
                                            className="text-yellow-600 hover:text-yellow-700 text-sm font-bold flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 transition"
                                        >
                                            <Icon name="Wand2" size={14} /> ערוך תמונה
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>
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
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700">מיקום</label>
                                    <input 
                                        type="text" 
                                        value={editModalData.location} 
                                        onChange={(e) => setEditModalData({...editModalData, location: e.target.value})}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900"
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
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-gray-900 placeholder-gray-400"
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
                                            className="w-full h-32 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 outline-none font-mono bg-white text-gray-900"
                                        ></textarea>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={handleReGenerate}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 flex justify-center gap-2 transition-all"
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

            {/* --- TOAST CONTAINER FOR GENERATOR SCREEN --- */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        onClick={() => removeToast(toast.id)}
                        className={`
                            pointer-events-auto shadow-2xl rounded-lg p-4 text-white min-w-[300px] flex items-center justify-between gap-3 cursor-pointer
                            animate-in slide-in-from-bottom-5 fade-in duration-300
                            ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-gray-800'}
                        `}
                    >
                         <span className="font-bold text-sm">{toast.message}</span>
                         <Icon name="XCircle" size={16} className="opacity-70 hover:opacity-100"/>
                    </div>
                ))}
            </div>

        </div>
    );
}

export default App;
// FIX: Removed extraneous code that was incorrectly appended to this file. This resolves the parsing and duplicate identifier errors.
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Icon } from './components/Icons';
import { Tooltip } from './components/Tooltip';
import { UserImage, Scenario, EditModalData, PromptTemplate, ToastMessage, ImageVersion, PromptTemplateInput } from './types';

// --- DEFINED TEMPLATES ---
const DEFAULT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'celebrity-selfie',
        title: 'סלפי עם מפורסם',
        description: 'צור תמונת סלפי ריאליסטית שלך עם המפורסם האהוב עליך.',
        iconName: 'Camera',
        colorFrom: 'from-yellow-500',
        colorTo: 'to-yellow-700',
        inputs: [
            { id: 'celebrity', label: 'מפורסם', placeholder: 'Modi Rosenfeld', type: 'text' },
            { id: 'location', label: 'מיקום', placeholder: 'Last Comic Standing', type: 'text' },
            { id: 'phone', label: 'טלפון / פריט', placeholder: 'Samsung S23 Ultra Black Case', type: 'text', disabled: true }
        ],
        basePromptGenerator: (data) => `Generate an image of:
The exact facial features, skin tone, bone structure, hairstyle, and expression of the attached
person (or persons), with no alteration or face swapping. The attached person is taking a selfie with
${data.celebrity}, standing at ${data.location}. Crew members are adjusting internal lighting and
equipment, with cables and gear visible.
Directors and managers are standing behind, discussing the next take.

Show the attached person(smiling with closed lips) on the left and the actor - hugging the person lightly with its right hand - on the right - while only the attached person is taking the selfie with its ${data.phone} - naturally.`
    },
    {
        id: 'red-carpet',
        title: 'פפראצי שטיח אדום',
        description: 'אתה והמפורסם צועדים יחד על השטיח האדום, מוקפים בצלמים.',
        iconName: 'Star',
        colorFrom: 'from-red-500',
        colorTo: 'to-orange-500',
        inputs: [
            { id: 'celebrity', label: 'מפורסם', placeholder: 'Gal Gadot', type: 'text' },
            { id: 'location', label: 'אירוע', placeholder: 'The Oscars', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate a high-quality paparazzi style photo of the attached person walking side-by-side with ${data.celebrity} on a prestigious red carpet event at ${data.location}. 
The attached person should look glamorous and confident. 
Background should include blurred photographers with flashbulbs going off, red velvet ropes, and an excited crowd.
Lighting should be dramatic and high-contrast typical of night events.`
    },
    {
        id: 'coffee-date',
        title: 'פגישת קפה',
        description: 'תמונה קזואלית ואינטימית שלך יושב לקפה עם מפורסם.',
        iconName: 'LayoutGrid',
        colorFrom: 'from-amber-700',
        colorTo: 'to-yellow-600',
        inputs: [
            { id: 'celebrity', label: 'מפורסם', placeholder: 'Brad Pitt', type: 'text' },
            { id: 'location', label: 'בית קפה', placeholder: 'a trendy cafe in Paris', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate a candid photo of the attached person sitting at a cafe table across from ${data.celebrity} at ${data.location}. 
They are laughing and enjoying coffee. The atmosphere is warm, cozy, and natural sunlight is coming through the window.
The attached person is visible clearly. Focus on realistic textures and casual clothing.`
    },
    {
        id: 'one-walk-through-time',
        title: 'One Walk Through Time',
        description: 'אדם אחד הולך קדימה כשהעולם משתנה סביבו בין תקופות היסטוריות.',
        iconName: 'Wand2',
        colorFrom: 'from-indigo-500',
        colorTo: 'to-purple-500',
        inputs: [
            { id: 'era', label: 'תקופה / מקום היסטורי', placeholder: 'Ancient Rome during the day', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate an image of the exact same attached person, preserving identical facial features, skin tone, bone structure, hairstyle, and expression, with no alteration and no face swapping.

The person is shown walking in profile (side view), mid-step, moving forward naturally.

This image represents the opening frame of a cinematic scene set in:

${data.era}

The environment, clothing, footwear, architecture, landscape, atmosphere, and lighting are all accurately and naturally adapted to the specified era and location.

The person remains visually consistent and recognizable, while only the world around them reflects the given period.

Cinematic composition, ultra-realistic detail, natural motion, historically appropriate colors and materials.
No modern artifacts in historical periods.
No text, no logos, no extra people.`
    },
    {
        id: 'if-i-were-born-in',
        title: 'If I Were Born In…',
        description: 'אותו אדם, מדומיין מחדש כאילו נולד בזמן, מקום או תרבות אחרת.',
        iconName: 'Wand2',
        colorFrom: 'from-teal-500',
        colorTo: 'to-cyan-500',
        inputs: [
            { id: 'context', label: 'תקופה / מדינה / תרבות', placeholder: '1920s New York City', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate an image of the exact same attached person, preserving identical facial features, skin tone, bone structure, hairstyle, and expression, with no alteration and no face swapping.

The person is standing naturally, facing the camera.

This scene depicts the person as if they were born and raised in:

${data.context}

Clothing, environment, posture, mood, and atmosphere are fully adapted to the specified reality, while the person remains unmistakably the same individual.

Ultra-realistic, cinematic lighting and composition.
No text, no logos, no extra people.`
    },
    {
        id: 'me-vs-me',
        title: 'Me vs. Me',
        description: 'גרסאות שונות של אותו אדם, חולקות רגע אחד.',
        iconName: 'Copy',
        colorFrom: 'from-rose-500',
        colorTo: 'to-pink-500',
        inputs: [
            { id: 'v1', label: 'גרסה 1', placeholder: 'A successful CEO in a suit', type: 'text' },
            { id: 'v2', label: 'גרסה 2', placeholder: 'A rockstar on stage', type: 'text' },
            { id: 'v3', label: 'גרסה 3', placeholder: 'An artist in a messy studio', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate an image featuring multiple instances of the same attached person, each preserving identical facial identity, skin tone, bone structure, and expression.

Each version represents a different life path, role, or identity:

${data.v1}
${data.v2}
${data.v3}

All versions appear together in the same scene, interacting naturally, as if they are aware of each other.

Cinematic composition, realistic lighting and scale, no visual cloning artifacts.
No text, no logos.`
    },
    {
        id: 'one-person-many-lives',
        title: 'One Person, Many Lives',
        description: 'אדם אחד המוצג במספר מקצועות או סגנונות חיים בסצנה אחת.',
        iconName: 'Copy',
        colorFrom: 'from-lime-500',
        colorTo: 'to-green-500',
        inputs: [
            { id: 'professions', label: 'מקצועות / זהויות (רשימה)', placeholder: 'A firefighter, a doctor, a chef, and a musician.', type: 'textarea' },
        ],
        basePromptGenerator: (data) => `Generate a cinematic image showing the same attached person appearing multiple times within the same frame, each instance preserving identical facial identity.

Each instance represents a different profession or lifestyle:

${data.professions}

Clothing, posture, facial expression, and environment reflect each role accurately.

Ultra-realistic detail, balanced composition, cinematic lighting.
No text, no logos.`
    },
    {
        id: 'then-now-future',
        title: 'Then. Now. Future.',
        description: 'גרסאות העבר, ההווה והעתיד של אותו אדם מוצגות יחד.',
        iconName: 'Wand2',
        colorFrom: 'from-slate-600',
        colorTo: 'to-gray-800',
        inputs: [
            { id: 'past', label: 'עבר (תקופה / גיל)', placeholder: 'A teenager in the 1990s', type: 'text' },
            { id: 'future', label: 'תרחיש עתידי', placeholder: 'A wise elder in a futuristic city', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate a cinematic image featuring three versions of the same attached person, each preserving identical facial identity.

Version 1: Past — ${data.past}
Version 2: Present — modern day
Version 3: Future — ${data.future}

Each version reflects its time through clothing, environment, and atmosphere, while remaining clearly the same person.

High realism, cinematic lighting, clean composition.
No text, no logos.`
    },
     {
        id: 'if-we-switched-roles',
        title: 'If We Switched Roles',
        description: 'קבוצת אנשים המתוארת בתפקידים שונים מחייהם האמיתיים.',
        iconName: 'Copy',
        colorFrom: 'from-orange-500',
        colorTo: 'to-amber-500',
        inputs: [
            { id: 'roles', label: 'החלפת תפקידים (אדם -> תפקיד)', placeholder: 'Person in first photo -> a knight, Person in second photo -> a scientist', type: 'textarea' },
        ],
        basePromptGenerator: (data) => `Generate an image of the attached people, preserving each person’s exact facial identity with no face swapping.

Each person is depicted in a different role than their original one:

${data.roles}

Clothing, body language, environment, and interaction reflect the new roles naturally.

Ultra-realistic, cinematic style.
No text, no logos.`
    },
    {
        id: 'walking-through-my-lives',
        title: 'Walking Through My Lives',
        description: 'כל צעד מייצג גרסה אחרת של אותם חיים.',
        iconName: 'Wand2',
        colorFrom: 'from-sky-500',
        colorTo: 'to-blue-500',
        inputs: [
            { id: 'life_version', label: 'גרסת החיים / זהות / תקופה', placeholder: 'a detective in a noir film', type: 'text' },
        ],
        basePromptGenerator: (data) => `Generate an image of the exact same attached person walking in profile (side view), mid-step.

This opening frame represents the person living as:

${data.life_version}

The environment, clothing, and atmosphere fully reflect this version of life, while the person remains visually identical.

Cinematic composition, ultra-realistic detail.
No text, no logos, no extra people.`
    }
];

// --- SUGGESTED TOPICS FOR AI (CONTEXT-AWARE) ---
const DEFAULT_SUGGESTIONS = [
    "גיבורי על בסרט פעולה",
    "זמרים מפורסמים בהופעה חיה",
    "דמויות היסטוריות במאה ה-21",
    "שחקני כדורגל במונדיאל",
    "כוכבי קולנוע על סט צילומים",
];

const TEMPLATE_SUGGESTIONS: Record<string, string[]> = {
    'celebrity-selfie': [ "פוליטיקאים בפסגה עולמית", "שחקני קולנוע על סט צילומים", "כוכבי ריאליטי באירוע השקה", "ספורטאים אולימפיים בכפר האולימפי"],
    'red-carpet': ["טקס פרסי האוסקר", "פסטיבל קאן", "השטיח האדום של המט גאלה", "פרמיירה של סרט שובר קופות"],
    'coffee-date': ["שחקנים בבית קפה שכונתי", "זמרים בשיחה אינטימית בדיינר", "סופרים בבית קפה ספרותי", "מדענים זוכי פרס נובל לדיון"],
    'one-walk-through-time': ["תקופת הרנסנס באיטליה", "יפן הפיאודלית", "מצרים העתיקה", "שנות ה-20 בניו יורק", "המהפכה התעשייתית בלונדון"],
    'if-i-were-born-in': ["שבט ויקינגי בצפון", "אימפריית האצטקים", "עיר סייברפאנק עתידנית", "חצר המלוכה של לואי ה-14", "קהילת היפים של שנות ה-60"],
    'me-vs-me': ["גיבור על מול הנבל שיכל להיות", "אמן מצליח מול איש עסקים", "ספורטאי בשיאו מול מאמן ותיק", "חוקר הרפתקן מול ספרן שקט"],
    'one-person-many-lives': ["מקצועות רפואה: מנתח, פרמדיק, רופא", "אמנויות הבמה: שחקן, רקדן, זמר", "כוחות הביטחון: שוטר, כבאי, חייל", "עולמות המדע: אסטרונאוט, ביולוג, פיזיקאי"],
    'then-now-future': ["ילדות שנות ה-80, בגרות, זקנה בעתיד", "סטודנט צעיר, פרופסור מכובד, מדען פורש", "חייל משוחרר, איש משפחה, פנסיונר"],
    'if-we-switched-roles': ["הורים וילדים מחליפים תפקידים", "מנהלים ועובדים במשרד", "שחקני כדורגל והאוהדים", "מורים ותלמידים בבית ספר"],
    'walking-through-my-lives': ["חוקר פרטי בסרט אפל", "אסטרונאוט במשימה למאדים", "שף במסעדת מישלן", "אמן רחוב בעיר גדולה", "מהפכן בתקופה היסטורית"]
};


// --- SOCIAL MEDIA RATIO PRESETS ---
const RATIO_PRESETS = [
    { label: 'אינסטגרם/כללי (1:1)', value: '1:1', desc: 'פוסט ריבועי קלאסי' },
    { label: 'אינסטגרם פורטרט (3:4)', value: '3:4', desc: 'מומלץ לפיד (כמו 4:5)' },
    { label: 'סטורי / Reels - 9:16', value: '9:16', desc: 'מסך מלא לנייד' },
    { label: 'פייסבוק/לינקדאין (16:9)', value: '16:9', desc: 'פוסט רוחבי' },
    { label: 'נוף קולנועי (4:3)', value: '4:3', desc: 'סטנדרטי' },
];


interface GeneratorProps {
    user: { name: string };
    onLogout: () => void;
}

export const Generator: React.FC<GeneratorProps> = ({ user, onLogout }) => {
    // --- State: View Mode & Templates ---
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
    const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

    // --- State: New Template Form ---
    const [newTemplateForm, setNewTemplateForm] = useState({
        title: '',
        description: '',
        userTemplateString: 'Generate a photo of the attached person with {placeholder}.'
    });

    // --- State: Generator ---
    const [userImages, setUserImages] = useState<UserImage[]>([]);
    const [activeImageIds, setActiveImageIds] = useState<number[]>([]);
    
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPausedForApproval, setIsPausedForApproval] = useState(false);
    const [currentPendingId, setCurrentPendingId] = useState<number | null>(null);
    const [inputMode, setInputMode] = useState<'manual' | 'bulk'>('manual');
    const [globalRatio, setGlobalRatio] = useState<string>("1:1");
    const [dynamicFormData, setDynamicFormData] = useState<{ [key: string]: string }>({});
    
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
    const [isModifyingGlobal, setIsModifyingGlobal] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

    useEffect(() => {
        if (selectedTemplate) {
            const initialData = selectedTemplate.inputs.reduce((acc, input) => {
                acc[input.id] = input.disabled ? 'Samsung S23 Ultra Black Case' : ''; // Pre-fill disabled fields
                return acc;
            }, {} as { [key: string]: string });
            setDynamicFormData(initialData);
        }
    }, [selectedTemplate]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowTopicDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Effect for dynamic scrollbar styling
    useEffect(() => {
        const colorMap: { [key: string]: string } = {
            yellow: '#eab308', red: '#ef4444', amber: '#b45309', indigo: '#6366f1',
            teal: '#14b8a6', rose: '#f43f5e', lime: '#84cc16', slate: '#475569',
            orange: '#f97316', sky: '#0ea5e9', gray: '#374151',
        };

        const styleId = 'dynamic-scrollbar-style';
        let styleElement = document.getElementById(styleId);

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        let mainColor = '#fbbf24'; // Default yellow
        if (selectedTemplate) {
            const colorName = selectedTemplate.colorFrom.split('-')[1];
            mainColor = colorMap[colorName] || mainColor;
        }
        
        styleElement.innerHTML = `
            ::-webkit-scrollbar-thumb { 
                background: ${mainColor} !important; 
                border-radius: 5px; 
                border: 2px solid #f1f1f1; 
            }
            ::-webkit-scrollbar-thumb:hover { 
                filter: brightness(0.9);
            }
        `;

    }, [selectedTemplate]);

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const selectedImages = userImages.filter(img => activeImageIds.includes(img.id));

    const constructPrompt = (scenario: Scenario) => {
        if (scenario.customFullPrompt) return scenario.customFullPrompt;
        
        const template = allTemplates.find(t => t.id === scenario.data._templateId);
        if (!template) return "Error: Template not found";

        if (template.isCustom && template.userTemplateString) {
             let prompt = template.userTemplateString;
             for (const key in scenario.data) {
                prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), scenario.data[key]);
             }
             prompt += `\n\n(IMPORTANT: Use the attached face image for the main subject. Keep facial features exact. No face swapping.)`;
             return prompt;
        }
        
        if (template.basePromptGenerator) {
            let prompt = template.basePromptGenerator(scenario.data);
            if(scenario.additionalDetails) {
                 prompt += `\n\nAdditional Requirements: ${scenario.additionalDetails}`;
            }
            return prompt;
        }

        return "";
    };

    const openCreateTemplateModal = () => {
        setEditingTemplate(null);
        setNewTemplateForm({ title: '', description: '', userTemplateString: 'Generate a photo of the attached person with {placeholder}.' });
        setTemplateModalOpen(true);
    };
    
    const openEditTemplateModal = (template: PromptTemplate) => {
        setEditingTemplate(template);
        setNewTemplateForm({
            title: template.title,
            description: template.description,
            userTemplateString: template.userTemplateString || ''
        });
        setTemplateModalOpen(true);
    };

    const handleDuplicateTemplate = (template: PromptTemplate) => {
        const newTitle = `העתק של ${template.title}`;
        setEditingTemplate(null);
        setNewTemplateForm({
            title: newTitle,
            description: template.description,
            userTemplateString: template.basePromptGenerator ? template.basePromptGenerator(template.inputs.reduce((acc, i) => ({...acc, [i.id]: `{${i.id}}`}), {})) : (template.userTemplateString || '')
        });
        setTemplateModalOpen(true);
        addToast(`'${template.title}' שוכפלה. ניתן לערוך ולשמור.`, 'info');
    };

    const handleSaveTemplate = () => {
        if (!newTemplateForm.title || !newTemplateForm.userTemplateString) {
            addToast("נא למלא כותרת ותבנית פרומפט", 'error');
            return;
        }

        if (editingTemplate) {
            const updatedTemplates = customTemplates.map(t => 
                t.id === editingTemplate.id ? { ...t, ...newTemplateForm } : t
            );
            setCustomTemplates(updatedTemplates);
            addToast("התבנית עודכנה בהצלחה", 'success');
        } else {
             const newTemplate: PromptTemplate = {
                id: `custom-${Date.now()}`,
                title: newTemplateForm.title,
                description: newTemplateForm.description || 'תבנית מותאמת אישית',
                iconName: 'Wand2',
                colorFrom: 'from-gray-700',
                colorTo: 'to-gray-900',
                userTemplateString: newTemplateForm.userTemplateString,
                inputs: [],
                isCustom: true
            };
            setCustomTemplates([...customTemplates, newTemplate]);
            addToast("תבנית חדשה נשמרה בהצלחה", 'success');
        }
        
        setTemplateModalOpen(false);
        setEditingTemplate(null);
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
        if (!selectedTemplate) return;
        const isDataValid = selectedTemplate.inputs
            .filter(input => !input.disabled)
            .every(input => dynamicFormData[input.id]?.trim());

        if (!isDataValid) {
            addToast("נא למלא את כל השדות", 'error');
            return;
        }

        setScenarios(prev => [...prev, {
            id: Date.now(),
            data: { ...dynamicFormData, _templateId: selectedTemplate.id },
            status: 'idle', 
            isSelected: true,
            resultImage: null,
            additionalDetails: '',
            customFullPrompt: null,
            aspectRatio: globalRatio,
            isModifying: false,
            isExpanded: false,
            history: []
        }]);
        const initialData = selectedTemplate.inputs.reduce((acc, input) => {
            acc[input.id] = input.disabled ? dynamicFormData[input.id] : '';
            return acc;
        }, {} as { [key: string]: string });
        setDynamicFormData(initialData);
    };

    const updateScenarioRatio = (id: number, ratio: string) => {
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, aspectRatio: ratio } : s));
    };

    const handleGlobalRatioChange = (ratio: string) => {
        setGlobalRatio(ratio);
        setScenarios(prev => prev.map(s => ({ ...s, aspectRatio: ratio })));
        addToast(`יחס התמונה שונה ל-${ratio} עבור כל הרשימה`, 'info');
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

    const restoreVersion = (scenarioId: number, version: ImageVersion) => {
        setScenarios(prev => prev.map(s => {
            if (s.id === scenarioId) {
                return { ...s, resultImage: version.imageUrl };
            }
            return s;
        }));
    };

    const toggleExpand = (id: number) => {
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s));
    };

    const processBulkInputWithAI = async () => {
        if (!bulkText.trim() || !selectedTemplate) return;
        setIsParsingBulk(true);
        const inputKeys = selectedTemplate.inputs.map(i => i.id);
        const inputLabels = selectedTemplate.inputs.map(i => i.label);

        try {
            const prompt = `You are a parser. Convert the following text list into a strictly formatted JSON array of objects. 
            Each object must have exactly these keys: ${JSON.stringify(inputKeys)}.
            Extract the values for "${inputLabels.join('", "')}" from each line of the text.
            If a value is missing, use a reasonable default or "Unknown".
            
            Text to parse:
            """
            ${bulkText}
            """
            
            Return ONLY the raw JSON array. Do not include markdown formatting.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            let items: any[] = [];
            try {
                let rawText = response.text || '';
                const jsonMatch = rawText.match(/\[[\s\S]*\]/); 
                if (jsonMatch) items = JSON.parse(jsonMatch[0]);
            } catch (err) {
                 addToast("ה-AI לא הצליח לפענח את הרשימה.", 'error');
                return;
            }

            if (items && Array.isArray(items) && items.length > 0) {
                const newScenarios: Scenario[] = items.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    data: { ...item, _templateId: selectedTemplate.id },
                    status: 'idle', isSelected: true, resultImage: null, additionalDetails: '',
                    customFullPrompt: null, aspectRatio: globalRatio, isModifying: false, isExpanded: false, history: []
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
         if (!aiTopic || !selectedTemplate) return;
        setIsAiLoading(true);
        setShowTopicDropdown(false);
        const inputKeys = selectedTemplate.inputs.map(i => i.id);

        try {
            const prompt = `You are an idea generator. Your task is to provide 5 creative scenarios for a user.
            The user is working with a template called "${selectedTemplate.title}".
            The template's purpose is: "${selectedTemplate.description}".
            The user's topic of interest is: "${aiTopic}".

            Generate a JSON list of 5 scenarios based on this information.
            The output must be a raw JSON array. Each object in the array must have these exact keys: ${JSON.stringify(inputKeys)}.
            The values should be creative and relevant to the topic and the template's purpose.

            Example format: [{ "${inputKeys[0]}": "Value1", "${inputKeys[1]}": "Value2", ... }]
            Return ONLY the raw JSON array without any markdown formatting.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            let items: any[] = [];
            try {
                 let rawText = response.text || '';
                const jsonMatch = rawText.match(/\[[\s\S]*\]/); 
                if (jsonMatch) items = JSON.parse(jsonMatch[0]);
            } catch (err) { /* Ignore */ }

            if (items && items.length > 0) {
                const newScenarios: Scenario[] = items.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    data: { ...item, _templateId: selectedTemplate.id },
                    status: 'idle', isSelected: true, resultImage: null, additionalDetails: '',
                    customFullPrompt: null, aspectRatio: globalRatio, isModifying: false, isExpanded: false, history: []
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

    const generateImageCall = async (scenarioData: Scenario) => {
        const imgsToSend = userImages.filter(img => activeImageIds.includes(img.id));
        if (imgsToSend.length === 0) throw new Error("No active images selected");

        const finalPrompt = constructPrompt(scenarioData);
        
        const parts = [
            { text: finalPrompt },
            ...imgsToSend.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }))
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio: scenarioData.aspectRatio || "1:1" } }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const content = candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) { if (part.inlineData) { return `data:image/jpeg;base64,${part.inlineData.data}`; } }
                for (const part of content.parts) { if (part.text) { throw new Error(part.text); } }
            }
        }
        throw new Error('No image generated (Unknown reason)');
    };

    const modifyGeneratedImage = async (id: number, instruction: string) => {
        if (!instruction.trim()) return;
        const scenario = scenarios.find(s => s.id === id);
        if (!scenario || !scenario.resultImage) return;

        setIsModifyingGlobal(true);
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, isModifying: true } : s));

        try {
            const base64Data = scenario.resultImage.split(',')[1];
            const refinedInstruction = `Edit the attached image according to this instruction: ${instruction}. Return the edited image.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [ { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: refinedInstruction } ] },
                config: { imageConfig: { aspectRatio: scenario.aspectRatio || "1:1" } }
            });

            let newImageUrl = null;
            const candidates = response.candidates;
            if (candidates && candidates.length > 0) {
                const content = candidates[0].content;
                 if (content && content.parts) {
                    for (const part of content.parts) { if (part.inlineData) { newImageUrl = `data:image/jpeg;base64,${part.inlineData.data}`; break; } }
                    if (!newImageUrl) { for (const part of content.parts) { if (part.text) { throw new Error(part.text); } } }
                 }
            }

            if (newImageUrl) {
                const newVersion: ImageVersion = { id: Date.now().toString(), imageUrl: newImageUrl, prompt: instruction, timestamp: Date.now(), type: 'edit' };
                setScenarios(prev => prev.map(s => s.id === id ? { ...s, isModifying: false, resultImage: newImageUrl, history: [...s.history, newVersion] } : s));
                setModificationPrompt('');
                addToast("התמונה עודכנה בהצלחה!", 'success');
            } else { throw new Error("No image returned from modification"); }
        } catch (e) {
            console.error("Modification Error", e);
            addToast("שגיאה בעריכת התמונה: " + (e instanceof Error ? e.message : ''), 'error');
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, isModifying: false } : s));
        } finally {
            setIsModifyingGlobal(false);
        }
    };

    const processQueue = async () => {
        if (activeImageIds.length === 0) { addToast("נא לבחור לפחות תמונת מקור אחת מהגלריה", 'error'); return; }
        if (isProcessing) return; 
        setIsProcessing(true);
        setIsPausedForApproval(false);
    };

    const handleIndividualGenerate = async (id: number) => {
        if (activeImageIds.length === 0) { addToast("נא לבחור לפחות תמונת מקור אחת מהגלריה", 'error'); return; }
        if (isProcessing) { addToast("המערכת עסוקה בעיבוד רשימה", 'info'); return; }
        
        const item = scenarios.find(s => s.id === id);
        if (!item) return;

        setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'processing' } : s));
        
        try {
            const url = await generateImageCall(item);
            const newVersion: ImageVersion = { id: Date.now().toString(), imageUrl: url, prompt: constructPrompt(item), timestamp: Date.now(), type: 'initial' };
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'approval_pending', resultImage: url, history: [newVersion] } : s));
        } catch (e) {
            console.error(e);
            setScenarios(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s));
        }
    };

    useEffect(() => {
        if (isProcessing && !isPausedForApproval && !editModalData && !isModifyingGlobal) {
            const nextItem = scenarios.find(s => s.isSelected && s.status === 'idle');
            if (nextItem) {
                const processItem = async () => {
                    setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'processing' } : s));
                    try {
                        const url = await generateImageCall(nextItem);
                        const newVersion: ImageVersion = { id: Date.now().toString(), imageUrl: url, prompt: constructPrompt(nextItem), timestamp: Date.now(), type: 'initial' };
                        setScenarios(prev => prev.map(s => s.id === nextItem.id ? { ...s, status: 'approval_pending', resultImage: url, history: [newVersion] } : s));
                        setIsPausedForApproval(true);
                        setCurrentPendingId(nextItem.id);
                    } catch (e) {
                        console.error(e);
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
        setEditModalData({ ...scenario }); 
        setShowAdvancedPrompt(false);
    };

    const handleReGenerate = async () => {
        if (!editModalData) return;
        const currentId = editModalData.id;
        const updatedScenarioData: Scenario = {
            ...scenarios.find(s => s.id === currentId)!,
            data: editModalData.data,
            additionalDetails: editModalData.additionalDetails,
            customFullPrompt: editModalData.customFullPrompt,
            aspectRatio: editModalData.aspectRatio,
        };
        setEditModalData(null);
        setScenarios(prev => prev.map(s => s.id === currentId ? { ...updatedScenarioData, status: 'approval_pending', isModifying: true } : s));
        try {
            const url = await generateImageCall(updatedScenarioData);
            const newVersion: ImageVersion = { id: Date.now().toString(), imageUrl: url, prompt: constructPrompt(updatedScenarioData), timestamp: Date.now(), type: 'regeneration' };
            setScenarios(prev => prev.map(s => s.id === currentId ? { ...s, status: 'approval_pending', isModifying: false, resultImage: url, history: [...s.history, newVersion] } : s));
            addToast("נוצרה גרסה חדשה בהצלחה", 'success');
        } catch (e) {
            console.error("Regeneration Error", e);
            addToast("שגיאה ביצירה מחדש: " + (e instanceof Error ? e.message : ''), 'error');
            setScenarios(prev => prev.map(s => s.id === currentId ? { ...s, isModifying: false } : s));
        }
    };

    const exitToSelection = () => {
        setSelectedTemplate(null);
        setScenarios([]);
        setUserImages([]);
        setActiveImageIds([]);
    };

    // --- RENDER: SELECTION SCREEN ---
    if (!selectedTemplate) {
        return (
            <div className="min-h-screen bg-gray-50 font-heebo">
                <header className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 sm:px-6 lg:px-8 shadow-xl flex justify-between items-center h-20">
                    <div className="flex items-center gap-2">
                         <Icon name="Sparkles" size={24} />
                         <span className="font-bold text-xl">סטודיו AI PRO</span>
                    </div>
                     <div className="flex items-center gap-4">
                        <span className="text-sm">שלום, {user.name}</span>
                        <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 text-xs font-bold py-2 px-4 rounded-lg transition">התנתק</button>
                    </div>
                </header>
                 <main className="py-12 px-4 sm:px-6 lg:px-8">
                     <div className="text-center mb-12 max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">בחר תבנית</h1>
                        <p className="text-lg text-gray-500">בחר תבנית, העלה תמונה, וה-AI ישלב אותך בסצינות מדהימות.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {allTemplates.map(template => {
                            const colorName = template.colorFrom.split('-')[1];
                            const colorShade = parseInt(template.colorFrom.split('-')[2] || '500');

                            const isLightColor = ['yellow', 'lime'].includes(colorName);
                            const largeButtonTextColorClass = isLightColor ? 'text-black' : 'text-white';
                            const largeButtonBgClass = template.colorFrom.replace('from-', 'bg-');
                            const largeButtonHoverBgClass = `hover:bg-${colorName}-${Math.min(900, colorShade + 100)}`;
                            
                            const smallButtonHoverBgClass = `hover:bg-${colorName}-${colorShade}`;
                            const smallButtonHoverTextColorClass = isLightColor ? 'hover:text-black' : 'hover:text-white';

                            return (
                                <div key={template.id} className={`group bg-white rounded-2xl shadow-lg border p-6 text-right transition-all duration-300 relative overflow-hidden flex flex-col h-full ${template.isCustom ? 'border-dashed border-gray-300' : 'border-gray-100 hover:shadow-2xl hover:-translate-y-1'}`}>
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${template.colorFrom} ${template.colorTo}`}></div>
                                    <div className="absolute top-2 left-2 flex gap-1.5 z-10">
                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(template); }} title="שכפל תבנית" className={`bg-gray-200 ${smallButtonHoverBgClass} ${smallButtonHoverTextColorClass} p-1.5 rounded-full transition`}><Icon name="Copy" size={14} /></button>
                                        {template.isCustom && <>
                                            <button onClick={(e) => { e.stopPropagation(); openEditTemplateModal(template); }} title="ערוך תבנית" className={`bg-gray-200 ${smallButtonHoverBgClass} ${smallButtonHoverTextColorClass} p-1.5 rounded-full transition`}><Icon name="Settings" size={14} /></button>
                                            <button onClick={(e) => deleteTemplate(e, template.id)} title="מחק תבנית" className="bg-gray-200 hover:bg-red-500 hover:text-white p-1.5 rounded-full transition"><Icon name="Trash2" size={14} /></button>
                                        </>}
                                    </div>
                                    <div onClick={() => setSelectedTemplate(template)} className="cursor-pointer flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${template.colorFrom} ${template.colorTo} text-white shadow-md group-hover:scale-110 transition-transform`}>
                                                <Icon name={template.iconName} size={28} />
                                            </div>
                                            {template.isCustom && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">מותאם אישית</span>}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">{template.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow">{template.description}</p>
                                        <div className={`mt-auto w-full ${largeButtonBgClass} ${largeButtonTextColorClass} font-bold py-3 rounded-lg ${largeButtonHoverBgClass} transition-colors flex items-center justify-center gap-2`}>
                                            התחל ליצור
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <button onClick={openCreateTemplateModal} className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-yellow-500 hover:bg-yellow-50 p-6 flex flex-col items-center justify-center text-center gap-4 transition-all group min-h-[250px]">
                            <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Icon name="Plus" size={32} className="text-gray-400 group-hover:text-yellow-500" /></div>
                            <h3 className="text-lg font-bold text-gray-600 group-hover:text-gray-800">צור תבנית חדשה</h3>
                            <p className="text-xs text-gray-400">הגדר פרומפט קבוע משלך לשימוש חוזר</p>
                        </button>
                    </div>
                    {isTemplateModalOpen && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm fade-in">
                            <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
                                <button onClick={() => setTemplateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><Icon name="XCircle" size={24}/></button>
                                <div className="absolute top-4 left-4 text-yellow-500"><Icon name="Wand2" size={24}/></div>
                                <h2 className="text-xl font-bold mb-4">{editingTemplate ? 'עריכת תבנית' : 'יצירת תבנית חדשה'}</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">שם התבנית</label>
                                        <input type="text" value={newTemplateForm.title} onChange={(e) => setNewTemplateForm({...newTemplateForm, title: e.target.value})} dir="auto" className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none transition duration-200 focus:ring-2 focus:ring-yellow-300 placeholder:text-gray-400 text-gray-900 caret-yellow-500" placeholder="לדוגמה: צילום בחוף הים" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">תיאור קצר</label>
                                        <input type="text" value={newTemplateForm.description} onChange={(e) => setNewTemplateForm({...newTemplateForm, description: e.target.value})} dir="auto" className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none transition duration-200 focus:ring-2 focus:ring-yellow-300 placeholder:text-gray-400 text-gray-900 caret-yellow-500" placeholder="תיאור שיופיע בכרטיסיה" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">תבנית הפרומפט (באנגלית)</label>
                                        <p className="text-xs text-gray-500 mb-2">השתמש בסוגריים מסולסלים כדי להגדיר משתנים, למשל <span className="font-mono bg-gray-100 px-1 rounded">{`{era}`}</span>.</p>
                                        <textarea value={newTemplateForm.userTemplateString} onChange={(e) => setNewTemplateForm({...newTemplateForm, userTemplateString: e.target.value})} dir="auto" className="w-full h-32 p-3 bg-white border border-gray-200 rounded-lg outline-none transition duration-200 focus:ring-2 focus:ring-yellow-300 font-mono text-sm text-gray-900 caret-yellow-500"></textarea>
                                    </div>
                                    <button onClick={handleSaveTemplate} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition">שמור תבנית</button>
                                </div>
                            </div>
                        </div>
                    )}
                     <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                        {toasts.map(toast => (<div key={toast.id} onClick={() => removeToast(toast.id)} className={`pointer-events-auto shadow-2xl rounded-lg p-4 text-white min-w-[300px] flex items-center justify-between gap-3 cursor-pointer animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-gray-800'}`}><span className="font-bold text-sm">{toast.message}</span><Icon name="XCircle" size={16} className="opacity-70 hover:opacity-100"/></div>))}
                    </div>
                </main>
            </div>
        );
    }

    // --- Dynamic Theming ---
    const mainColorName = selectedTemplate.colorFrom.split('-')[1];
    const mainColorShade = selectedTemplate.colorFrom.split('-')[2] || '500';
    const accentColorClass = `accent-${mainColorName}-${mainColorShade}`;
    const hoverBorderClass = `hover:border-${mainColorName}-500`;
    const hoverBgClass = `hover:bg-${mainColorName}-50`;
    const groupHoverTextClass = `group-hover:text-${mainColorName}-500`;
    
    const textInputStyle = `w-full p-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 outline-none transition duration-200 focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed caret-${mainColorName}-500 focus:ring-${mainColorName}-300`;

    let basePromptText = '';
    if (selectedTemplate.isCustom) {
        basePromptText = selectedTemplate.userTemplateString || 'No prompt defined.';
    } else if (selectedTemplate.basePromptGenerator) {
        const placeholderData = selectedTemplate.inputs.reduce((acc, input) => {
            acc[input.id] = `{${input.label}}`;
            return acc;
        }, {} as {[key: string]: string});
        basePromptText = selectedTemplate.basePromptGenerator(placeholderData);
    }
    
    const currentSuggestions = (selectedTemplate && TEMPLATE_SUGGESTIONS[selectedTemplate.id]) || DEFAULT_SUGGESTIONS;

    // --- RENDER: GENERATOR SCREEN ---
    return (
        <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
            <header className={`bg-gradient-to-l ${selectedTemplate.colorFrom} ${selectedTemplate.colorTo} text-white px-4 sm:px-6 lg:px-8 shadow-lg z-20 shrink-0 h-24 flex items-center`}>
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={exitToSelection} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition backdrop-blur cursor-pointer z-50" title="חזרה לבחירת תבניות"><Icon name="Home" size={24} /></button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                <Icon name={selectedTemplate.iconName} /> 
                                <span>{selectedTemplate.title}</span>
                            </h1>
                            <p className="text-white/80 text-sm mt-1 opacity-90">מחולל סלפי AI PRO</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <span className="text-sm">שלום, {user.name}</span>
                        <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 text-xs font-bold py-2 px-4 rounded-lg transition">התנתק</button>
                    </div>
                </div>
            </header>
            <main className="flex-1 w-full p-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                <div className="lg:col-span-4 h-full overflow-y-auto pr-2 pb-4 scrollbar-hide">
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700"><Icon name="Upload" size={18} /> 1. תמונות מקור (גלריה)</h2>
                            <div className={`relative border-2 border-dashed rounded-xl h-56 flex flex-col items-center justify-center text-center overflow-hidden mb-4 shadow-sm transition-all duration-300 group ${selectedImages.length > 0 ? 'border-transparent bg-gray-50' : `border-gray-300 bg-gray-50 ${hoverBorderClass} ${hoverBgClass}`}`}>
                                {selectedImages.length > 0 ? (
                                    <div className="w-full h-full p-2 grid gap-1 auto-rows-fr" style={{ gridTemplateColumns: selectedImages.length === 1 ? '1fr' : 'repeat(2, 1fr)' }}>
                                        {selectedImages.slice(0, 4).map((img, idx) => (<div key={idx} className="relative w-full h-full overflow-hidden rounded-md border border-gray-200"><img src={img.preview} className="w-full h-full object-cover" alt="Selected" />{idx === 3 && selectedImages.length > 4 && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">+{selectedImages.length - 3}</div>)}</div>))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400 transition-colors"><Icon name="ImageIcon" size={48} className={`mb-2 opacity-50 ${groupHoverTextClass} group-hover:scale-110 transition-transform`}/><span className="text-sm font-medium text-gray-400">לא נבחרו תמונות</span></div>
                                )}
                                {selectedImages.length > 0 && <div className="absolute bottom-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md font-bold">{selectedImages.length} נבחרו</div>}
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <div className={`relative shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 ${hoverBorderClass} bg-gray-50 flex items-center justify-center cursor-pointer ${hoverBgClass} transition group`}>
                                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" title="הוסף תמונות חדשות"/>
                                    <Icon name="Plus" className={`text-gray-400 ${groupHoverTextClass} transition`} />
                                </div>
                                {userImages.map(img => {
                                    const isSelected = activeImageIds.includes(img.id);
                                    return (<div key={img.id} onClick={() => toggleImageSelection(img.id)} className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition ${isSelected ? `border-${mainColorName}-500 ring-2 ring-${mainColorName}-200 opacity-100` : 'border-gray-200 hover:border-gray-400 opacity-70'}`}><img src={img.preview} className="w-full h-full object-cover" alt="Thumbnail" /><button onClick={(e) => deleteUserImage(img.id, e)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600 z-10" title="מחק תמונה"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>{isSelected && <div className={`absolute inset-0 bg-${mainColorName}-500/20 pointer-events-none`}></div>}{isSelected && <div className={`absolute bottom-0 right-0 bg-${mainColorName}-500 text-white p-0.5 rounded-tl`}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}</div>);
                                })}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">לחץ על תמונות כדי לסמן אותן. התמונות המסומנות ישמשו כרפרנס ליצירה.</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700"><Icon name="Plus" size={18} /> 2. הוספת סצינות</h2>
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button onClick={() => setInputMode('manual')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${inputMode === 'manual' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>ידני</button>
                                <button onClick={() => setInputMode('bulk')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${inputMode === 'bulk' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>רשימה / AI</button>
                            </div>
                            {inputMode === 'manual' ? (
                                <div className="space-y-4 fade-in">
                                    {selectedTemplate.inputs.map(input => (<div key={input.id}><label className="text-xs font-semibold text-gray-500">{input.label}</label>{input.type === 'textarea' ? (<textarea value={dynamicFormData[input.id] || ''} onChange={(e) => setDynamicFormData(prev => ({...prev, [input.id]: e.target.value})) } dir="auto" disabled={input.disabled} className={textInputStyle} placeholder={input.placeholder} rows={3}></textarea>) : (<input type="text" value={dynamicFormData[input.id] || ''} onChange={(e) => setDynamicFormData(prev => ({...prev, [input.id]: e.target.value})) } dir="auto" disabled={input.disabled} className={textInputStyle} placeholder={input.placeholder} />)}</div>))}
                                    <button onClick={addScenario} className="w-full bg-gray-800 text-white py-2.5 rounded-lg hover:bg-gray-700 flex justify-center items-center gap-2"><Icon name="Plus" size={16} /> הוסף בודד</button>
                                </div>
                            ) : (
                                <div className="space-y-4 fade-in">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 relative">
                                        <label className="text-xs font-bold text-blue-800 mb-1 block flex items-center gap-1"><Icon name="Wand2" size={12}/> AI מחולל רעיונות</label>
                                        <div className="flex gap-2 relative" ref={dropdownRef}>
                                            <div className="relative flex-1">
                                                <input type="text" value={aiTopic} onChange={(e) => {setAiTopic(e.target.value); setShowTopicDropdown(true);}} onFocus={() => setShowTopicDropdown(true)} dir="auto" className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none transition duration-200 focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400 text-gray-900 caret-blue-500" placeholder="נושא: גיבורי על, זמרים..." />
                                                {showTopicDropdown && (<ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">{currentSuggestions.filter(t => t.includes(aiTopic)).map((topic, idx) => (<li key={idx} onClick={() => {setAiTopic(topic); setShowTopicDropdown(false);}} className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b last:border-none">{topic}</li>))}{currentSuggestions.filter(t => t.includes(aiTopic)).length === 0 && (<li className="px-3 py-2 text-xs text-gray-400">אין הצעות מתאימות</li>)}</ul>)}
                                            </div>
                                            <button onClick={generateAiSuggestions} disabled={isAiLoading || !aiTopic} className="bg-blue-600 text-white px-3 rounded-lg text-sm font-bold">{isAiLoading ? <Icon name="Loader2" className="animate-spin"/> : 'צור'}</button>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2">
                                        <label className="text-xs font-semibold text-gray-500">הדבקת רשימה (פורמט: {selectedTemplate.inputs.map(i => i.label).join(', ')})</label>
                                        <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} dir="auto" className={`${textInputStyle} font-mono text-sm`} rows={5} placeholder={selectedTemplate.inputs.map(i => i.placeholder).join(', ')}></textarea>
                                        <button onClick={processBulkInputWithAI} disabled={!bulkText || isParsingBulk} className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">{isParsingBulk ? <><Icon name="Loader2" className="animate-spin" />מפענח רשימה...</> : <><Icon name="List" />טען רשימה (AI)</>}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                         <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-700">
                                <Icon name="FileText" size={18} /> תבנית פרומפט בסיסית
                            </h2>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono" dir="ltr">
                                    {basePromptText}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-8 h-full flex flex-col min-h-0">
                    <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap justify-between items-center gap-4 border border-gray-100 mb-4 shrink-0">
                        <div className="flex items-center gap-4"><h2 className="font-bold text-gray-700 text-lg">תור יצירה ({scenarios.length})</h2></div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex gap-2 text-sm text-gray-500"><button onClick={toggleSelectAll} className={`hover:text-${mainColorName}-600 underline`}>סמן הכל</button><span>•</span><button onClick={() => setScenarios(scenarios.filter(s => !s.isSelected))} className="hover:text-red-500 underline">מחק מסומנים</button></div>
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                                <span className="text-xs font-bold text-gray-500 px-2 flex items-center gap-1"><Icon name="LayoutGrid" size={14}/> התאמה לפלטפורמה:</span>
                                <select value={globalRatio} onChange={(e) => handleGlobalRatioChange(e.target.value)} className="bg-white text-sm border-none outline-none text-gray-800 font-bold focus:ring-0 cursor-pointer py-1 pr-1 pl-4 rounded shadow-sm hover:bg-gray-100 transition">{RATIO_PRESETS.map((preset) => (<option key={preset.value} value={preset.value}>{preset.label}</option>))}</select>
                            </div>
                            {isProcessing ? (<button onClick={stopProcessing} className="bg-red-500 hover:bg-red-600 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg animate-pulse"><Icon name="Pause" /> עצור תהליך</button>) : (<button onClick={processQueue} disabled={scenarios.filter(s => s.isSelected && s.status === 'idle').length === 0} className={`bg-gradient-to-r ${selectedTemplate.colorFrom} ${selectedTemplate.colorTo} hover:brightness-110 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}><Icon name="Play" /> צור נבחרים</button>)}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 pb-2 mb-8 scrollbar-thin">
                        <div className="space-y-4">
                        {scenarios.length === 0 && (<div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed border-gray-300 text-gray-400"><Icon name="List" size={48} className="mx-auto mb-2 opacity-20"/>הרשימה ריקה. הוסף סצינות משמאל.</div>)}
                        {scenarios.map((item, index) => (
                            <div key={item.id} className={`relative bg-white rounded-xl shadow-sm border transition-all duration-300 ${item.status === 'approval_pending' ? `border-${mainColorName}-500 ring-4 ring-${mainColorName}-100 scale-[1] z-10` : 'border-gray-100 hover:border-gray-300'}`}>
                                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={item.isSelected} onChange={() => toggleSelection(item.id)} disabled={isProcessing} className={`w-5 h-5 rounded ${accentColorClass} cursor-pointer`}/>
                                        <div className="w-8">
                                            {item.status === 'completed' && <Icon name="CheckCircle" className="text-green-500" />}
                                            {item.status === 'processing' && <Icon name="Loader2" className={`text-${mainColorName}-500 animate-spin`} />}
                                            {item.status === 'error' && <Icon name="XCircle" className="text-red-500" />}
                                            {item.status === 'approval_pending' && <span className="text-xl">👀</span>}
                                            {item.status === 'idle' && <span className="text-gray-300 font-mono text-xs">#{index+1}</span>}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 truncate">{Object.values(item.data).filter(v => typeof v === 'string' && v).slice(0, 1).join(', ')}</h3><p className="text-sm text-gray-500 truncate">{Object.values(item.data).filter(v => typeof v === 'string' && v).slice(1).join(' / ')}</p>{item.additionalDetails && <p className={`text-xs text-${mainColorName}-600 mt-1 truncate max-w-[200px]`}>+ {item.additionalDetails}</p>}</div>
                                    <div className="flex flex-col items-center"><label className="text-[10px] font-bold text-gray-400 mb-0.5">Ratio</label><select value={item.aspectRatio || "1:1"} onChange={(e) => updateScenarioRatio(item.id, e.target.value)} disabled={isProcessing || item.status === 'processing' || item.isModifying} className={`text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none focus:border-${mainColorName}-500 text-gray-700 font-mono cursor-pointer`}>{RATIO_PRESETS.map(p => (<option key={p.value} value={p.value}>{p.value}</option>))}</select></div>
                                    <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-2">
                                        <Tooltip content={constructPrompt(item)}><div className={`p-2 text-gray-400 hover:text-${mainColorName}-500 cursor-help transition`}><Icon name="Info" size={18} /></div></Tooltip>
                                        <button onClick={() => openEditModal(item)} className={`p-2 text-gray-400 hover:text-${mainColorName}-600 transition`} title="ערוך פרומפט ספציפי" disabled={item.isModifying}><Icon name="FileText" size={18} /></button>
                                        {(item.status === 'idle' || item.status === 'error') && !isProcessing && (<button onClick={() => handleIndividualGenerate(item.id)} className="p-2 text-green-500 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded-full transition" title="צור רק את זה"><Icon name="Play" size={18} /></button>)}
                                        {!isProcessing && (<button onClick={() => removeScenario(item.id)} className="text-gray-300 hover:text-red-500 p-2"><Icon name="Trash2" size={18} /></button>)}
                                    </div>
                                </div>
                                {item.status === 'approval_pending' && item.resultImage && (
                                    <div className={`bg-${mainColorName}-50 p-4 rounded-b-xl border-t border-${mainColorName}-100 animate-in slide-in-from-top-2`}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2"><div className="flex justify-center w-full"><div className={`relative group w-full rounded-lg border-2 border-white shadow-md bg-gray-50 transition-all duration-500 ease-in-out ${item.isExpanded ? 'h-auto' : 'h-80 overflow-hidden'}`}><img src={item.resultImage} className={`${item.isExpanded ? 'w-full h-auto' : 'w-full h-full object-cover object-top'}`} alt="Result" />{item.isModifying && (<div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center z-20"><Icon name="Loader2" className={`animate-spin text-${mainColorName}-600 mb-2`} size={32} /><span className={`text-${mainColorName}-800 font-bold text-sm shadow-sm`}>מעדכן תמונה...</span></div>)}{!item.isExpanded && (<div onClick={() => toggleExpand(item.id)} className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-${mainColorName}-600 via-${mainColorName}-500/70 to-transparent flex items-end justify-center pb-6 cursor-pointer hover:via-${mainColorName}-500/80 transition-all group/expand`}><span className={`bg-white/95 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-bold text-${mainColorName}-900 flex items-center gap-2 shadow-xl border border-${mainColorName}-100 group-hover/expand:scale-105 transition-transform`}><Icon name="ChevronDown" size={18} /> הצג תמונה מלאה</span></div>)}{item.isExpanded && (<button onClick={() => toggleExpand(item.id)} className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-${mainColorName}-100/90 backdrop-blur px-6 py-2 rounded-full text-sm font-bold text-${mainColorName}-900 flex items-center gap-2 shadow-md border border-${mainColorName}-300 hover:bg-white transition`}><Icon name="ChevronUp" size={16} /> הקטן תצוגה</button>)}<div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"><a href={item.resultImage} download={`selfie_${Object.values(item.data)[0]}.jpg`} className={`bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 hover:text-${mainColorName}-600 shadow-sm`} title="הורדה"><Icon name="Download" size={16}/></a><button onClick={() => setFullscreenImage(item.resultImage)} className={`bg-white/80 p-2 rounded-full hover:bg-white text-gray-800 hover:text-${mainColorName}-600 shadow-sm`} title="הגדל"><Icon name="Maximize" size={16}/></button></div></div></div>{item.history && item.history.length > 1 && (<div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-hide">{item.history.slice().reverse().map((version) => (<div key={version.id} onClick={() => restoreVersion(item.id, version)} className={`relative shrink-0 w-12 h-12 rounded cursor-pointer border-2 overflow-hidden transition-all ${item.resultImage === version.imageUrl ? `border-${mainColorName}-500 ring-1 ring-${mainColorName}-300` : 'border-gray-300 opacity-60 hover:opacity-100'}`} title={`גרסה: ${version.type === 'initial' ? 'ראשונית' : version.prompt}`}><img src={version.imageUrl} className="w-full h-full object-cover" /></div>))}</div>)}</div>
                                            <div className="flex flex-col justify-between gap-3">
                                                <div><h4 className={`font-bold text-${mainColorName}-900 mb-1`}>ממתין לאישור שלך</h4><p className={`text-sm text-${mainColorName}-700 mb-2`}>האם התמונה תקינה? ניתן לאשר, לערוך מחדש, או לשנות אלמנטים בתמונה הקיימת.</p><div className={`bg-white/80 p-2 rounded-lg border border-${mainColorName}-200 mb-3`}><label className={`text-xs font-bold text-${mainColorName}-800 mb-1 block`}>שינוי התמונה (Image Editing)</label><div className="flex gap-2"><input type="text" value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} dir="auto" placeholder="לדוגמה: תוסיף כובע, תוריד את העץ..." className={textInputStyle} disabled={item.isModifying}/><button onClick={() => modifyGeneratedImage(item.id, modificationPrompt)} disabled={!modificationPrompt || item.isModifying || isModifyingGlobal} className={`bg-${mainColorName}-200 hover:bg-${mainColorName}-300 disabled:opacity-50 disabled:cursor-not-allowed text-${mainColorName}-800 px-3 rounded-lg font-bold text-sm`}>{item.isModifying ? <Icon name="Loader2" className="animate-spin" size={14}/> : 'שנה'}</button></div></div></div>
                                                <div className="space-y-2"><button onClick={() => handleApprove(item.id)} className={`bg-${mainColorName}-600 hover:bg-${mainColorName}-700 text-white py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 w-full disabled:opacity-50`} disabled={item.isModifying}><Icon name="CheckCircle" /> אשר והמשך לבא</button><button onClick={() => openEditModal(item)} className={`bg-white hover:bg-gray-50 text-${mainColorName}-600 border border-${mainColorName}-200 py-3 rounded-lg font-bold flex items-center justify-center gap-2 w-full disabled:opacity-50`} disabled={item.isModifying}><Icon name="Edit" /> צור מחדש (פרומפט מקורי)</button></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {item.status === 'completed' && item.resultImage && (<div className="px-4 pb-4 flex items-center justify-between"><div className="relative group w-24 h-24"><img src={item.resultImage} className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm" alt="Completed" /><div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1"><a href={item.resultImage} download={`selfie_${Object.values(item.data)[0]}.jpg`} className="bg-white/90 p-1 rounded-full hover:bg-white text-gray-800" title="הורדה"><Icon name="Download" size={12}/></a><button onClick={() => setFullscreenImage(item.resultImage)} className="bg-white/90 p-1 rounded-full hover:bg-white text-gray-800" title="הגדל"><Icon name="Maximize" size={12}/></button></div></div><button onClick={() => setScenarios(prev => prev.map(s => s.id === item.id ? { ...s, status: 'approval_pending' } : s))} className={`text-${mainColorName}-600 hover:text-${mainColorName}-700 text-sm font-bold flex items-center gap-1 bg-${mainColorName}-50 px-3 py-1 rounded-full border border-${mainColorName}-200 transition`}><Icon name="Wand2" size={14} /> ערוך תמונה</button></div>)}
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            </main>
            {editModalData && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl transform scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-800">עריכה ויצירה מחדש</h3><button onClick={() => setEditModalData(null)} className="text-gray-400 hover:text-gray-600"><Icon name="XCircle" size={24}/></button></div>
                        <div className="space-y-4">
                            {(allTemplates.find(t => t.id === editModalData.data._templateId)?.inputs || []).map(input => (<div key={input.id}><label className="text-sm font-bold text-gray-700">{input.label}</label><input type="text" value={editModalData.data[input.id] || ''} onChange={(e) => setEditModalData(prev => prev ? {...prev, data: {...prev.data, [input.id]: e.target.value}} : null)} dir="auto" className={textInputStyle} /></div>))}
                            <div><label className="text-sm font-bold text-gray-700 flex items-center gap-2">תוספת לפרומפט (לדיוק)<span className="text-xs font-normal text-gray-400">(אופציונלי)</span></label><input type="text" value={editModalData.additionalDetails || ''} onChange={(e) => setEditModalData(prev => prev ? {...prev, additionalDetails: e.target.value} : null)} dir="auto" className={textInputStyle} placeholder="לדוגמה: תאורה חשוכה, הבעה מופתעת..."/></div>
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <button onClick={() => setShowAdvancedPrompt(!showAdvancedPrompt)} className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1"><Icon name="FileText" size={14}/> {showAdvancedPrompt ? 'הסתר עריכת פרומפט מלא' : 'מתקדם: ערוך את הפרומפט המלא'}</button>
                                {showAdvancedPrompt && (<div className="mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200"><p className="text-xs text-gray-500 mb-2">עריכה כאן תנתק את התמונה מהתבנית הכללית ותשתמש רק בטקסט הזה.</p><textarea value={editModalData.customFullPrompt || constructPrompt(editModalData)} onChange={(e) => setEditModalData(prev => prev ? {...prev, customFullPrompt: e.target.value} : null)} dir="auto" className={`${textInputStyle} font-mono text-sm`} rows={4}></textarea></div>)}
                            </div>
                            <button onClick={handleReGenerate} className={`w-full bg-${mainColorName}-500 hover:bg-${mainColorName}-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 flex justify-center gap-2 transition-all`}><Icon name="Camera" /> שמור וצור מחדש</button>
                        </div>
                    </div>
                </div>
            )}
            {fullscreenImage && (<div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 fade-in cursor-zoom-out" onClick={() => setFullscreenImage(null)}><img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} alt="Fullscreen"/><button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><Icon name="XCircle" size={40} /></button></div>)}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">{toasts.map(toast => (<div key={toast.id} onClick={() => removeToast(toast.id)} className={`pointer-events-auto shadow-2xl rounded-lg p-4 text-white min-w-[300px] flex items-center justify-between gap-3 cursor-pointer animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-gray-800'}`}><span className="font-bold text-sm">{toast.message}</span><Icon name="XCircle" size={16} className="opacity-70 hover:opacity-100"/></div>))}</div>
        </div>
    );
}
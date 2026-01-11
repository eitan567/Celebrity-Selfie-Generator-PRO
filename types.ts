import React from 'react';

export interface UserImage {
    id: number;
    preview: string;
    base64: string;
    mimeType: string;
}

export interface ImageVersion {
    id: string;
    imageUrl: string;
    prompt: string; // The instruction or prompt used to generate this version
    timestamp: number;
    type: 'initial' | 'edit' | 'regeneration';
}

export interface Scenario {
    id: number;
    celebrity: string;
    location: string;
    phone: string;
    status: 'idle' | 'processing' | 'approval_pending' | 'completed' | 'error';
    isSelected: boolean;
    resultImage: string | null;
    additionalDetails: string;
    customFullPrompt: string | null;
    aspectRatio: string; // "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
    calculatedPrompt?: string; // used for edit modal temporary state
    isModifying?: boolean; // New flag for UI loading state during modification
    history: ImageVersion[]; // Array to store all generated versions
}

export interface PromptTemplate {
    id: string;
    title: string;
    description: string;
    iconName: string;
    colorFrom: string;
    colorTo: string;
    // Built-in templates use a function, Custom templates use a string with placeholders
    basePromptGenerator?: (celebrity: string, location: string, phone: string, details?: string) => string;
    userTemplateString?: string;
    isCustom?: boolean;
}

export interface EditModalData extends Scenario {
    calculatedPrompt?: string;
}

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    size?: number;
    className?: string;
}
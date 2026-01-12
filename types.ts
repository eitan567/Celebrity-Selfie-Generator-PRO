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

export interface PromptTemplateInput {
    id: string; // e.g., 'historical_era'
    label: string; // e.g., 'Historical Era / Place'
    placeholder: string;
    type: 'text' | 'textarea';
    disabled?: boolean;
}

export interface Scenario {
    id: number;
    data: { [key: string]: string };
    status: 'idle' | 'processing' | 'approval_pending' | 'completed' | 'error';
    isSelected: boolean;
    resultImage: string | null;
    additionalDetails: string;
    customFullPrompt: string | null;
    aspectRatio: string; // "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
    isModifying?: boolean; // New flag for UI loading state during modification
    isExpanded?: boolean; // Flag for image view expansion in the list
    history: ImageVersion[]; // Array to store all generated versions
}

export interface PromptTemplate {
    id: string;
    title: string;
    description: string;
    iconName: string;
    colorFrom: string;
    colorTo: string;
    inputs: PromptTemplateInput[]; // Defines the form for this template
    basePromptGenerator?: (data: { [key: string]: string }) => string;
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
    // FIX: Changed content from string to React.ReactNode to allow JSX elements, fixing the type error.
    content: React.ReactNode;
    children: React.ReactNode;
}

export interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    size?: number;
    className?: string;
}

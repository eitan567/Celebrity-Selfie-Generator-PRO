import React from 'react';

export interface UserImage {
    id: number;
    preview: string;
    base64: string;
    mimeType: string;
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
    calculatedPrompt?: string; // used for edit modal temporary state
}

export interface EditModalData extends Scenario {
    calculatedPrompt?: string;
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
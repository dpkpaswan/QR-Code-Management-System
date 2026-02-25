'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
    name: string;
    size?: number;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
    strokeWidth?: number;
    [key: string]: unknown;
}

// Map old heroicon names and custom names to lucide equivalents
const iconMap: Record<string, string> = {
    // Dashboard / Nav
    LayoutDashboardIcon: 'LayoutDashboard',
    UploadCloudIcon: 'UploadCloud',
    UsersIcon: 'Users',
    QrCodeIcon: 'QrCode',
    ClipboardListIcon: 'ClipboardList',
    LogOutIcon: 'LogOut',
    // Stats
    MailIcon: 'Mail',
    CalendarIcon: 'Calendar',
    CalendarCheckIcon: 'CalendarCheck',
    // Actions
    EyeIcon: 'Eye',
    EyeOffIcon: 'EyeOff',
    AlertCircleIcon: 'AlertCircle',
    AlertTriangleIcon: 'AlertTriangle',
    CheckCircleIcon: 'CheckCircle',
    SearchIcon: 'Search',
    DownloadIcon: 'Download',
    SendIcon: 'Send',
    CopyIcon: 'Copy',
    FileIcon: 'File',
    FileSpreadsheetIcon: 'FileSpreadsheet',
    PowerOffIcon: 'PowerOff',
    ScanLineIcon: 'ScanLine',
    CameraOffIcon: 'CameraOff',
    ActivityIcon: 'Activity',
    SparklesIcon: 'Sparkles',
};

function Icon({
    name,
    size = 24,
    className = '',
    onClick,
    disabled = false,
    style,
    strokeWidth,
    ...props
}: IconProps) {
    // Resolve the icon name
    const resolvedName = iconMap[name] || name;
    const IconComponent = (LucideIcons as Record<string, React.ComponentType<LucideIcons.LucideProps>>)[resolvedName];

    if (!IconComponent) {
        const Fallback = LucideIcons.HelpCircle;
        return (
            <Fallback
                size={size}
                className={`text-gray-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                onClick={disabled ? undefined : onClick}
                style={style}
                strokeWidth={strokeWidth}
            />
        );
    }

    return (
        <IconComponent
            size={size}
            className={`${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
            onClick={disabled ? undefined : onClick}
            style={style}
            strokeWidth={strokeWidth}
            {...props}
        />
    );
}

export default Icon;
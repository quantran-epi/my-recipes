import React, { FC, ReactNode } from 'react';
import { Button as AntButton } from 'antd';

export type ActionButtonTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const TONE_PALETTE: Record<ActionButtonTone, { color: string; border: string }> = {
    default: { color: '#475569', border: 'rgba(15,23,42,0.18)' },
    primary: { color: '#0958d9', border: 'rgba(9,88,217,0.30)' },
    success: { color: '#389e0d', border: 'rgba(56,158,13,0.30)' },
    warning: { color: '#d46b08', border: 'rgba(212,107,8,0.30)' },
    danger: { color: '#cf1322', border: 'rgba(207,19,34,0.30)' },
};

interface ActionButtonProps {
    tone?: ActionButtonTone;
    icon?: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
    children?: ReactNode;
    height?: number;
    fontSize?: number;
    style?: React.CSSProperties;
    className?: string;
    'aria-label'?: string;
    'aria-expanded'?: boolean;
    htmlType?: 'button' | 'submit' | 'reset';
}

/**
 * Standard secondary action button used across lists, cards, and section footers.
 * Compact 32px action button with semantic-color-tinted border and neutral background.
 *
 * USE for: inline list-row actions, section secondary actions, card footer actions,
 * modal secondary footers, empty-state CTAs.
 *
 * DO NOT use for: page header primary CTAs, search/filter input affordances,
 * form submit buttons, mid-flow primary actions, page-header buttons, search affordances.
 *
 * See `.planning/quick/260612-uxn-ui-ux-list-and-button-normalization/` for the contract.
 */
export const ActionButton: FC<ActionButtonProps> = ({
    tone = 'default',
    icon,
    onClick,
    disabled,
    children,
    height = 32,
    fontSize = 12,
    style,
    className,
    htmlType,
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
}) => {
    const palette = TONE_PALETTE[tone];
    const iconOnly = Boolean(icon) && React.Children.count(children) === 0;
    const {
        height: _ignoredHeight,
        borderRadius: _ignoredBorderRadius,
        padding: _ignoredPadding,
        paddingInline: _ignoredPaddingInline,
        width: requestedWidth,
        ...styleOverrides
    } = style ?? {};
    return <AntButton
        onClick={onClick}
        disabled={disabled}
        icon={icon}
        className={className}
        htmlType={htmlType}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        style={{
            height,
            width: iconOnly ? height : requestedWidth,
            padding: iconOnly ? 0 : '0 10px',
            borderRadius: 8,
            color: palette.color,
            borderColor: palette.border,
            fontWeight: 650,
            fontSize,
            lineHeight: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            ...styleOverrides,
        }}
    >{children}</AntButton>;
};

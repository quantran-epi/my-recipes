import React, { FunctionComponent } from 'react';
import { Card as AntCard, CardProps as AntCardProps } from 'antd';
import { AppShadow } from '@common/Constants/AppShadow';
import { Space } from '@components/Layout/Space';
import { Typography } from '@components/Typography';

interface ICardProps extends AntCardProps {
    description?: React.ReactNode;
    noShadow?: boolean;
}

export const Card: FunctionComponent<ICardProps> = ({
    style,
    description,
    title,
    noShadow = false,
    ...props
}) => {
    const _style = (): React.CSSProperties => {
        return {
            borderRadius: 10,
            boxShadow: noShadow ? "none" : AppShadow.card,
            ...style
        }
    }

    const _renderTitle = () => {
        if (!title) return;
        return <Space direction='vertical' style={description ? { marginTop: 10, marginBottom: 10 } : {}}>
            {typeof title === "string" ? <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>{title}</Typography.Title> : title}
            {typeof description === "string" ? <Typography.Text type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>{description}</Typography.Text> : description}
        </Space >
    }

    return <AntCard {...props} title={_renderTitle()} style={_style()} />
}
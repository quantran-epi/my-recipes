import { Box } from '@components/Layout/Box';
import { Space } from '@components/Layout/Space';
import { useTheme } from '@hooks';
import { Steps as AntSteps, StepsProps } from 'antd';
import { useState } from 'react';

export type StepHandlerFunctionCollection = {
    next: () => void;
    previous: () => void;
    done: () => void;
    canNext: () => boolean;
    canPrevious: () => boolean;
    isLastStep: () => boolean;
}

export type StepItemContentRenderer = (funcs: StepHandlerFunctionCollection) => React.ReactNode;

export type StepItem = {
    title: string;
    description?: string;
    content: StepItemContentRenderer;
}

type StepProps = {
    items: StepItem[];
    onDone: () => void;
    style?: React.CSSProperties;
    stepProps?: Partial<StepsProps>;
}

export const Steps: React.FunctionComponent<StepProps> = ({
    items,
    style,
    onDone,
    stepProps
}) => {
    const { token } = useTheme();
    const [current, setCurrent] = useState<number>(0);

    const next = () => {
        setCurrent(current + 1);
    };

    const prev = () => {
        setCurrent(current - 1);
    };

    const canNext = () => {
        return current < items.length - 1;
    };

    const canPrev = () => {
        return current > 0;
    };

    const isLastStep = () => {
        return current === items.length - 1;
    };

    const done = () => {
        onDone();
    };

    const _styles = (): React.CSSProperties => {
        return {
            minHeight: 260,
            color: token.colorTextTertiary,
            backgroundColor: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px dashed ${token.colorBorder}`,
            marginTop: 16,
            padding: 15,
            ...style
        }
    }

    return <Space fullwidth direction="vertical">
        <AntSteps
            current={current}
            items={items.map(item => ({ title: item.title, description: item.description }))}
            {...stepProps}
        />
        <Box style={_styles()}>
            {items.map((item, index) => <Box key={index} style={{ display: index === current ? "block" : "none" }}>
                {item.content({
                    next: next,
                    previous: prev,
                    canNext: canNext,
                    canPrevious: canPrev,
                    isLastStep: isLastStep,
                    done
                })}
            </Box>)}
        </Box>
    </Space>
}
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { InputNumber } from "antd";
import React from "react";

type ServingSizeInputProps = {
    value?: number | string | null;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
    disabled?: boolean;
    addonAfter?: React.ReactNode;
    size?: "small" | "middle" | "large";
    style?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
}

const toNumber = (value: unknown, fallback: number): number => {
    const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
    return isFinite(parsed) ? parsed : fallback;
};

const normalize = (value: unknown, min: number, max?: number): number => {
    const parsed = toNumber(value, min);
    const withMin = Math.max(min, parsed);
    return typeof max === "number" ? Math.min(max, withMin) : withMin;
};

export const ServingSizeInput: React.FunctionComponent<ServingSizeInputProps> = ({
    value,
    onChange,
    min = 1,
    max,
    step = 1,
    precision = 0,
    disabled,
    addonAfter = "phần",
    size = "middle",
    style,
    inputStyle,
}) => {
    const currentValue = normalize(value, min, max);
    const buttonSize = size === "large" ? "large" : "middle";

    const _onChange = (nextValue: unknown) => {
        onChange?.(normalize(nextValue, min, max));
    };

    const _onStep = (direction: 1 | -1) => {
        _onChange(currentValue + (step * direction));
    };

    return <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", ...style }}>
        <Button
            aria-label="Giảm khẩu phần"
            icon={<MinusOutlined />}
            disabled={disabled || currentValue <= min}
            onClick={() => _onStep(-1)}
            size={buttonSize}
            style={{ flex: "0 0 auto", width: size === "small" ? 28 : 32, paddingInline: 0 }}
        />
        <InputNumber
            min={min}
            max={max}
            step={step}
            precision={precision}
            controls={false}
            disabled={disabled}
            value={currentValue}
            onChange={_onChange}
            addonAfter={addonAfter}
            size={size}
            style={{ flex: "1 1 auto", minWidth: 78, ...inputStyle }}
        />
        <Button
            aria-label="Tăng khẩu phần"
            icon={<PlusOutlined />}
            disabled={disabled || (typeof max === "number" && currentValue >= max)}
            onClick={() => _onStep(1)}
            size={buttonSize}
            style={{ flex: "0 0 auto", width: size === "small" ? 28 : 32, paddingInline: 0 }}
        />
    </div>
}

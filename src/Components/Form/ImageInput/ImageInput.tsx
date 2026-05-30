import { LinkOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Input, Radio, Space } from "antd";
import React, { useRef, useState } from "react";

interface ImageInputProps {
    value?: string;
    onChange?: (value: string) => void;
}

const ImageInput: React.FC<ImageInputProps> = ({ value, onChange }) => {
    const [mode, setMode] = useState<"url" | "upload">(
        value && value.startsWith("data:") ? "upload" : "url"
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            onChange?.(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleModeChange = (newMode: "url" | "upload") => {
        setMode(newMode);
        onChange?.("");
    };

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Radio.Group
                value={mode}
                onChange={e => handleModeChange(e.target.value)}
                size="small"
            >
                <Radio.Button value="url"><LinkOutlined /> Đường dẫn URL</Radio.Button>
                <Radio.Button value="upload"><UploadOutlined /> Tải lên từ thiết bị</Radio.Button>
            </Radio.Group>

            {mode === "url" ? (
                <Input
                    value={value}
                    onChange={e => onChange?.(e.target.value)}
                    placeholder="Nhập đường dẫn ảnh"
                />
            ) : (
                <Space direction="vertical" style={{ width: "100%" }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                    <Space>
                        <Button
                            icon={<UploadOutlined />}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Chọn ảnh
                        </Button>
                        {value && value.startsWith("data:") && (
                            <span style={{ fontSize: 12, color: "#52c41a" }}>✓ Đã chọn ảnh</span>
                        )}
                    </Space>
                    {value && value.startsWith("data:") && (
                        <img
                            src={value}
                            alt="preview"
                            style={{ maxWidth: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8 }}
                        />
                    )}
                </Space>
            )}
        </Space>
    );
};

export default ImageInput;
export { ImageInput };

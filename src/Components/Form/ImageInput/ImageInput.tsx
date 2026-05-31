import { LinkOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Input, Radio, Space } from "antd";
import React, { useRef, useState } from "react";

interface ImageInputProps {
    value?: string;
    onChange?: (value: string) => void;
}

const compressImage = (dataUrl: string, maxDimension = 800, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) { height = Math.round(height * maxDimension / width); width = maxDimension; }
                else { width = Math.round(width * maxDimension / height); height = maxDimension; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    });
};

const getFileSizeKB = (dataUrl: string) => {
    const base64 = dataUrl.split(',')[1] || '';
    return Math.round((base64.length * 3) / 4 / 1024);
};

const ImageInput: React.FC<ImageInputProps> = ({ value, onChange }) => {
    const [mode, setMode] = useState<"url" | "upload">(
        value && value.startsWith("data:") ? "upload" : "url"
    );
    const [compressing, setCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCompressing(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const compressed = await compressImage(reader.result as string);
            onChange?.(compressed);
            setCompressing(false);
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
                <Radio.Button value="upload"><UploadOutlined /> Tải lên</Radio.Button>
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
                            loading={compressing}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {compressing ? "Đang nén..." : "Chọn ảnh"}
                        </Button>
                        {value && value.startsWith("data:") && !compressing && (
                            <span style={{ fontSize: 12, color: "#52c41a" }}>
                                ✓ Đã chọn ({getFileSizeKB(value)} KB)
                            </span>
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

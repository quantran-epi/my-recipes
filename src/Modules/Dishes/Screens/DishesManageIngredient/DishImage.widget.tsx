import { PictureOutlined } from "@ant-design/icons";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Typography } from "@components/Typography";
import React, { useEffect, useState } from "react";
import NoodlesIcon from "../../../../../assets/icons/noodles.png";

type DishImageWidgetProps = {
    src?: string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    fallbackIconSize?: number;
    showBrokenLabel?: boolean;
    style?: React.CSSProperties;
}

export const DishImageWidget: React.FunctionComponent<DishImageWidgetProps> = ({
    src,
    width = "100%",
    height = 150,
    borderRadius = 8,
    fallbackIconSize = 26,
    showBrokenLabel = true,
    style,
}) => {
    const [failed, setFailed] = useState(false);
    const hasImage = Boolean(src) && !failed;

    useEffect(() => {
        setFailed(false);
    }, [src]);

    return <Box style={{
        position: "relative",
        width,
        height,
        borderRadius,
        overflow: "hidden",
        background: "#f5f5f5",
        border: hasImage ? undefined : "1px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
    }}>
        {hasImage
            ? <img
                src={src}
                alt=""
                onError={() => setFailed(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            : <Image src={NoodlesIcon} preview={false} width={fallbackIconSize} />}

        {failed && showBrokenLabel && <div style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 6px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #ffccc7",
        }}>
            <PictureOutlined style={{ color: "#cf1322", fontSize: 11 }} />
            <Typography.Text style={{ color: "#cf1322", fontSize: 10 }}>Ảnh lỗi</Typography.Text>
        </div>}
    </Box>
}

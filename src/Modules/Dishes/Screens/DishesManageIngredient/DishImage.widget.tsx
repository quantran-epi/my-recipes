import { PictureOutlined } from "@ant-design/icons";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Typography } from "@components/Typography";
import React, { useEffect, useRef, useState } from "react";
import NoodlesIcon from "../../../../../assets/icons/noodles.png";

type DishImageWidgetProps = {
    src?: string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    fallbackIconSize?: number;
    showBrokenLabel?: boolean;
    loading?: "eager" | "lazy";
    style?: React.CSSProperties;
}

export const DishImageWidget: React.FunctionComponent<DishImageWidgetProps> = ({
    src,
    width = "100%",
    height = 150,
    borderRadius = 8,
    fallbackIconSize = 26,
    showBrokenLabel = true,
    loading = "lazy",
    style,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const [canLoad, setCanLoad] = useState(loading === "eager");
    const hasImage = Boolean(src) && canLoad && !failed;

    useEffect(() => {
        setFailed(false);
        setCanLoad(loading === "eager");
    }, [loading, src]);

    useEffect(() => {
        if (!src || loading === "eager" || canLoad) return;
        const element = containerRef.current;
        if (!element) return;
        if (!("IntersectionObserver" in window)) {
            setCanLoad(true);
            return;
        }

        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            setCanLoad(true);
            observer.disconnect();
        }, { root: null, rootMargin: "180px 0px", threshold: 0.01 });

        observer.observe(element);
        return () => observer.disconnect();
    }, [canLoad, loading, src]);

    return <Box ref={containerRef} style={{
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
                loading={loading}
                decoding="async"
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

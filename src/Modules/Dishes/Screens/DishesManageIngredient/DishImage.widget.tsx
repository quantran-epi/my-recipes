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
    surface?: "list" | "detail";
    testId?: string;
    style?: React.CSSProperties;
}

export const DishImageWidget: React.FunctionComponent<DishImageWidgetProps> = ({
    src,
    width = "100%",
    height = 150,
    borderRadius = 8,
    fallbackIconSize = 26,
    showBrokenLabel,
    loading = "lazy",
    surface = "detail",
    testId,
    style,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const effectiveLoading = surface === "list" ? "lazy" : loading;
    const effectiveShowBrokenLabel = showBrokenLabel ?? surface !== "list";
    const rootMargin = surface === "list" ? "48px 0px" : "180px 0px";
    const [canLoad, setCanLoad] = useState(effectiveLoading === "eager");
    const [loaded, setLoaded] = useState(false);
    const shouldRequestImage = Boolean(src) && canLoad && !failed;

    useEffect(() => {
        setFailed(false);
        setLoaded(false);
        setCanLoad(effectiveLoading === "eager");
    }, [effectiveLoading, src]);

    useEffect(() => {
        if (!src || effectiveLoading === "eager" || canLoad) return;
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
        }, { root: null, rootMargin, threshold: 0.01 });

        observer.observe(element);
        return () => observer.disconnect();
    }, [canLoad, effectiveLoading, rootMargin, src]);

    const _onImageLoad = async (event: React.SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        try {
            if (typeof image.decode === "function") await image.decode();
            if (image.naturalWidth > 0) setLoaded(true);
            else setFailed(true);
        } catch {
            setFailed(true);
        }
    };

    return <Box ref={containerRef} data-testid={testId} data-dish-image-surface={surface} style={{
        position: "relative",
        width,
        height,
        borderRadius,
        overflow: "hidden",
        background: "#f5f5f5",
        border: loaded ? undefined : "1px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
    }}>
        {!loaded && <Image src={NoodlesIcon} preview={false} width={fallbackIconSize} />}

        {shouldRequestImage && <img
            src={src}
            alt=""
            loading={effectiveLoading}
            decoding="async"
            onLoad={_onImageLoad}
            onError={() => setFailed(true)}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: loaded ? 1 : 0,
            }}
        />}

        {failed && effectiveShowBrokenLabel && <div style={{
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

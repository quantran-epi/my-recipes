import { CloseOutlined } from "@ant-design/icons";
import React from "react";
import { createPortal } from "react-dom";

type FastOverlaySize = number | string;

type FastOverlayBaseProps = {
    open: boolean;
    title: React.ReactNode;
    onClose: () => void;
    children?: React.ReactNode;
    zIndex?: number;
    maskClosable?: boolean;
    closable?: boolean;
    keyboard?: boolean;
    "data-testid"?: string;
};

type FastModalShellProps = FastOverlayBaseProps & {
    footer?: React.ReactNode;
    width?: FastOverlaySize;
    style?: React.CSSProperties;
    bodyStyle?: React.CSSProperties;
    afterOpenChange?: (open: boolean) => void;
};

type FastDrawerShellProps = FastOverlayBaseProps & {
    width?: FastOverlaySize;
};

const toCssSize = (value: FastOverlaySize | undefined, fallback: string): string => {
    if (typeof value === "number") return `${value}px`;
    return value ?? fallback;
};

const getOffset = (value: React.CSSProperties["top"], fallback: number): string => {
    if (typeof value === "number") return `${value}px`;
    if (typeof value === "string") return value;
    return `${fallback}px`;
};

const overlayMotionEase = "cubic-bezier(0.16, 1, 0.3, 1)";
const backdropInAnimation = `my-recipes-fast-overlay-fade-in 120ms ${overlayMotionEase} both`;
const modalInAnimation = `my-recipes-fast-modal-in 150ms ${overlayMotionEase} both`;
const drawerInAnimation = `my-recipes-fast-drawer-in 150ms ${overlayMotionEase} both`;
let overlayStackIndex = 0;

const useBodyScrollLock = (locked: boolean) => {
    React.useEffect(() => {
        if (!locked) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [locked]);
};

const useEscapeClose = (open: boolean, onClose: () => void) => {
    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose, open]);
};

const useResolvedOverlayZIndex = (open: boolean, explicitZIndex: number | undefined, baseZIndex: number) => {
    const autoZIndex = React.useRef<number>();

    if (!open) {
        autoZIndex.current = undefined;
    } else if (explicitZIndex === undefined && autoZIndex.current === undefined) {
        autoZIndex.current = baseZIndex + overlayStackIndex * 20;
        overlayStackIndex += 1;
    }

    return explicitZIndex ?? autoZIndex.current ?? baseZIndex;
};

const overlayMotionStyles = <style>{`
@keyframes my-recipes-fast-overlay-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes my-recipes-fast-modal-in { from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.986); } to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); } }
@keyframes my-recipes-fast-drawer-in { from { opacity: 0.96; transform: translate3d(-14px, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
@media (prefers-reduced-motion: reduce) {
  .my-recipes-fast-overlay,
  .my-recipes-fast-overlay * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
`}</style>;

const closeButtonStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(116, 54, 220, 0.16)",
    borderRadius: 10,
    background: "#fff",
    color: "#5e2bbf",
    cursor: "pointer",
    flexShrink: 0,
};

const shellTitleStyle: React.CSSProperties = {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 650,
    color: "#2f2545",
};

export const FastModalShell: React.FunctionComponent<FastModalShellProps> = ({
    open,
    title,
    onClose,
    children,
    footer,
    width,
    zIndex,
    style,
    bodyStyle,
    maskClosable = true,
    closable = true,
    keyboard = true,
    afterOpenChange,
    "data-testid": testId,
}) => {
    useBodyScrollLock(open);
    useEscapeClose(open && keyboard, onClose);
    const resolvedZIndex = useResolvedOverlayZIndex(open, zIndex, 1200);

    React.useEffect(() => {
        if (!open || !afterOpenChange) return;
        const frame = window.requestAnimationFrame(() => afterOpenChange(true));
        return () => window.cancelAnimationFrame(frame);
    }, [afterOpenChange, open]);

    if (!open) return null;

    const top = getOffset(style?.top, 52);
    const panelWidth = toCssSize(width, "min(680px, calc(100vw - 28px))");

    return createPortal(
        <div
            className="my-recipes-fast-overlay"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: resolvedZIndex,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: `${top} 14px 18px`,
                background: "rgba(16, 24, 40, 0.36)",
                animation: backdropInAnimation,
                willChange: "opacity",
            }}
            onMouseDown={(event) => {
                if (maskClosable && event.target === event.currentTarget) onClose();
            }}
        >
            {overlayMotionStyles}
            <section
                role="dialog"
                aria-modal="true"
                data-testid={testId}
                style={{
                    width: panelWidth,
                    maxWidth: "100%",
                    maxHeight: `calc(100vh - ${top} - 18px)`,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: "1px solid rgba(232, 237, 245, 0.96)",
                    borderRadius: 14,
                    background: "#fff",
                    boxShadow: "0 18px 54px rgba(15, 23, 42, 0.24)",
                    animation: modalInAnimation,
                    transformOrigin: "top center",
                    willChange: "opacity, transform",
                    ...style,
                    top: undefined,
                }}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px 12px", borderBottom: "1px solid #f0f2f5" }}>
                    <div style={shellTitleStyle}>{title}</div>
                    {closable && <button type="button" aria-label="Thoát" onClick={onClose} style={closeButtonStyle}>
                        <CloseOutlined />
                    </button>}
                </div>
                <div style={{ minHeight: 0, overflowY: "auto", padding: 16, ...bodyStyle }}>
                    {children}
                </div>
                {footer && <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px 14px", borderTop: "1px solid #f0f2f5", background: "#fbfcfe" }}>
                    {footer}
                </div>}
            </section>
        </div>,
        document.body,
    );
};

export const FastDrawerShell: React.FunctionComponent<FastDrawerShellProps> = ({
    open,
    title,
    onClose,
    children,
    width,
    zIndex,
    maskClosable = true,
    closable = true,
    keyboard = true,
    "data-testid": testId,
}) => {
    useBodyScrollLock(open);
    useEscapeClose(open && keyboard, onClose);
    const resolvedZIndex = useResolvedOverlayZIndex(open, zIndex, 1150);

    if (!open) return null;

    return createPortal(
        <div
            className="my-recipes-fast-overlay"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: resolvedZIndex,
                background: "rgba(16, 24, 40, 0.30)",
                animation: backdropInAnimation,
                willChange: "opacity",
            }}
            onMouseDown={(event) => {
                if (maskClosable && event.target === event.currentTarget) onClose();
            }}
        >
            {overlayMotionStyles}
            <aside
                role="dialog"
                aria-modal="true"
                data-testid={testId}
                style={{
                    width: toCssSize(width, "min(360px, calc(100vw - 38px))"),
                    maxWidth: "calc(100vw - 38px)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRight: "1px solid rgba(232, 237, 245, 0.96)",
    borderRadius: "0 18px 18px 0",
    background: "linear-gradient(180deg, #f5f0ff 0%, #ffffff 42%)",
    boxShadow: "16px 0 48px rgba(74, 48, 130, 0.24)",
                    animation: drawerInAnimation,
                    transformOrigin: "left center",
                    willChange: "opacity, transform",
                }}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 14px 12px 16px", borderBottom: "1px solid rgba(116, 54, 220, 0.10)", background: "rgba(255,255,255,0.72)" }}>
                    <div style={shellTitleStyle}>{title}</div>
                    {closable && <button type="button" aria-label="Ẩn menu" onClick={onClose} style={closeButtonStyle}>
                        <CloseOutlined />
                    </button>}
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {children}
                </div>
            </aside>
        </div>,
        document.body,
    );
};

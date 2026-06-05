import React from "react";

type VirtualListRowFrameProps = {
    style: React.CSSProperties;
    children: React.ReactNode;
    layout?: "fixed" | "dynamic";
}

type PointerStart = {
    x: number;
    y: number;
    moved: boolean;
};

const DRAG_CLICK_THRESHOLD_PX = 4;
const SUPPRESS_CLICK_AFTER_DRAG_MS = 160;

const hasMovedPastThreshold = (start: PointerStart, x: number, y: number): boolean => {
    return Math.abs(x - start.x) > DRAG_CLICK_THRESHOLD_PX || Math.abs(y - start.y) > DRAG_CLICK_THRESHOLD_PX;
};

export const VirtualListRowFrame: React.FunctionComponent<VirtualListRowFrameProps> = ({ style, children, layout = "fixed" }) => {
    const pointerStartRef = React.useRef<PointerStart | null>(null);
    const suppressNextClickRef = React.useRef(false);
    const clearTimerRef = React.useRef<number | null>(null);
    const isDynamic = layout === "dynamic";

    const _clearInteractionSoon = React.useCallback(() => {
        if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = window.setTimeout(() => {
            pointerStartRef.current = null;
            suppressNextClickRef.current = false;
            clearTimerRef.current = null;
        }, SUPPRESS_CLICK_AFTER_DRAG_MS);
    }, []);

    React.useEffect(() => () => {
        if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    }, []);

    const _setPointerStart = (x: number, y: number) => {
        if (clearTimerRef.current !== null) {
            window.clearTimeout(clearTimerRef.current);
            clearTimerRef.current = null;
        }
        pointerStartRef.current = { x, y, moved: false };
        suppressNextClickRef.current = false;
    };

    const _markMove = (x: number, y: number) => {
        const start = pointerStartRef.current;
        if (!start || start.moved || !hasMovedPastThreshold(start, x, y)) return;
        start.moved = true;
        suppressNextClickRef.current = true;
    };

    const _onPointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
        _setPointerStart(event.clientX, event.clientY);
    };

    const _onPointerMoveCapture = (event: React.PointerEvent<HTMLDivElement>) => {
        _markMove(event.clientX, event.clientY);
    };

    const _onTouchStartCapture = (event: React.TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (touch) _setPointerStart(touch.clientX, touch.clientY);
    };

    const _onTouchMoveCapture = (event: React.TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (touch) _markMove(touch.clientX, touch.clientY);
    };

    const _onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!pointerStartRef.current?.moved && !suppressNextClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation?.();
        pointerStartRef.current = null;
        suppressNextClickRef.current = false;
    };

    const _onPointerUpCapture = () => {
        _clearInteractionSoon();
    };

    return <div
        style={{
            ...style,
            boxSizing: "border-box",
            padding: isDynamic ? "0 4px 8px" : "2px 4px 6px",
            overflow: isDynamic ? "visible" : "hidden",
            touchAction: "pan-y",
            overscrollBehavior: "contain",
        }}
        data-virtual-list-row-frame="true"
        onPointerDownCapture={_onPointerDownCapture}
        onPointerMoveCapture={_onPointerMoveCapture}
        onPointerUpCapture={_onPointerUpCapture}
        onPointerCancelCapture={_onPointerUpCapture}
        onTouchStartCapture={_onTouchStartCapture}
        onTouchMoveCapture={_onTouchMoveCapture}
        onTouchEndCapture={_onPointerUpCapture}
        onTouchCancelCapture={_onPointerUpCapture}
        onClickCapture={_onClickCapture}
    >
        <div style={{ height: isDynamic ? undefined : "100%", boxSizing: "border-box" }}>{children}</div>
    </div>;
};

import { ArrowUpOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Tooltip } from "@components/Tootip";
import React from "react";
import type { ListImperativeAPI } from "react-window";

type VirtualListScrollTopButtonProps = {
    listRef: React.MutableRefObject<ListImperativeAPI | null>;
    rowCount: number;
    visible?: boolean;
    style?: React.CSSProperties;
}

const SCROLL_THRESHOLD = 180;

const isScrollableElement = (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    return element.scrollHeight > element.clientHeight && style.overflowY !== "visible";
}

const getScrollTargets = (element?: HTMLElement | null): HTMLElement[] => {
    if (!element) return [];
    const targets: HTMLElement[] = [element];
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
        if (isScrollableElement(parent)) targets.push(parent);
        parent = parent.parentElement;
    }
    if (document.scrollingElement instanceof HTMLElement) targets.push(document.scrollingElement);
    return Array.from(new Set(targets));
}

export const scrollVirtualListToTop = (list?: ListImperativeAPI | null): boolean => {
    if (!list) return false;
    try {
        list.scrollToRow({ index: 0, align: "start", behavior: "instant" });
    } catch {
        // Empty filtered lists have no row 0; still reset any parent scroll container below.
    }
    getScrollTargets(list.element).forEach(target => {
        target.scrollTop = 0;
        target.scrollTo({ top: 0, behavior: "auto" });
    });
    return true;
}

export const VirtualListScrollTopButton: React.FunctionComponent<VirtualListScrollTopButtonProps> = ({ listRef, rowCount, visible, style }) => {
    const [domVisible, setDomVisible] = React.useState(false);
    const shouldShow = Boolean(visible || domVisible);

    React.useEffect(() => {
        if (rowCount <= 1) {
            setDomVisible(false);
            return;
        }

        let cleanup: (() => void) | undefined;
        let frameId: number | undefined;
        let retryCount = 0;

        const bindScroll = () => {
            const element = listRef.current?.element;
            if (!element) {
                if (retryCount < 20) {
                    retryCount += 1;
                    frameId = window.requestAnimationFrame(bindScroll);
                }
                return;
            }

            const targets = getScrollTargets(element);
            const updateVisible = () => setDomVisible(targets.some(target => target.scrollTop > SCROLL_THRESHOLD));
            updateVisible();
            targets.forEach(target => target.addEventListener("scroll", updateVisible, { passive: true }));
            cleanup = () => targets.forEach(target => target.removeEventListener("scroll", updateVisible));
        };

        bindScroll();
        return () => {
            if (frameId !== undefined) window.cancelAnimationFrame(frameId);
            cleanup?.();
        };
    }, [listRef, rowCount]);

    if (rowCount <= 1 || !shouldShow) return null;

    const _onClick = () => {
        const list = listRef.current;
        if (!scrollVirtualListToTop(list)) return;
        setDomVisible(false);
    };

    return <Tooltip title="Lên đầu danh sách">
        <Button
            shape="circle"
            icon={<ArrowUpOutlined />}
            onClick={_onClick}
            style={{
                position: "fixed",
                right: 16,
                bottom: 164,
                zIndex: 955,
                width: 38,
                height: 38,
                boxShadow: "0 8px 22px rgba(22,119,255,0.26)",
                background: "#1677ff",
                borderColor: "#1677ff",
                color: "#fff",
                ...style,
            }}
        />
    </Tooltip>;
}

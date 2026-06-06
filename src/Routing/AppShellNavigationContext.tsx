import React from "react";
import { flushSync } from "react-dom";
import type { NavigateFunction } from "react-router-dom";

type BeforeNavigate = () => void;

export type AppShellNavigationValue = {
    navigateWithFeedback: (href: string, beforeNavigate?: BeforeNavigate) => boolean;
    startRouteFeedback: (href: string) => boolean;
    isRouteFeedbackActive: boolean;
    pendingDestination: string | null;
};

const noopNavigationValue: AppShellNavigationValue = {
    navigateWithFeedback: () => false,
    startRouteFeedback: () => false,
    isRouteFeedbackActive: false,
    pendingDestination: null,
};

const AppShellNavigationContext = React.createContext<AppShellNavigationValue>(noopNavigationValue);
const ROUTE_FEEDBACK_FALLBACK_MS = 2400;
const ROUTE_FEEDBACK_MIN_VISIBLE_MS = 320;
const ROUTE_FEEDBACK_PAINT_CLEANUP_MS = 80;
const ROUTE_FEEDBACK_PRE_NAVIGATION_MS = 180;
const ROUTE_FEEDBACK_ELEMENT_ID = "app-route-feedback-overlay";
const ROUTE_FEEDBACK_ANIMATION_ID = "app-route-feedback-animation";
const ROUTE_FEEDBACK_REQUEST_EVENT = "app-shell-route-feedback-request";
let routeFeedbackElementFallbackTimer: number | null = null;

const pathOnly = (href: string): string => {
    const [path] = href.split(/[?#]/);
    return path || "/";
};

const assignStyle = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>) => {
    Object.assign(element.style, styles);
};

const ensureRouteFeedbackAnimation = () => {
    if (typeof document === "undefined" || document.getElementById(ROUTE_FEEDBACK_ANIMATION_ID)) return;

    const style = document.createElement("style");
    style.id = ROUTE_FEEDBACK_ANIMATION_ID;
    style.textContent = "@keyframes app-route-feedback-spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
};

const clearRouteFeedbackElementFallbackTimer = () => {
    if (routeFeedbackElementFallbackTimer !== null) {
        window.clearTimeout(routeFeedbackElementFallbackTimer);
        routeFeedbackElementFallbackTimer = null;
    }
};

const scheduleRouteFeedbackElementFallback = () => {
    if (typeof window === "undefined") return;
    clearRouteFeedbackElementFallbackTimer();
    routeFeedbackElementFallbackTimer = window.setTimeout(removeRouteFeedbackElement, ROUTE_FEEDBACK_FALLBACK_MS);
};

const showRouteFeedbackElement = () => {
    if (typeof document === "undefined") return;

    ensureRouteFeedbackAnimation();
    let overlay = document.getElementById(ROUTE_FEEDBACK_ELEMENT_ID) as HTMLDivElement | null;
    if (overlay) {
        scheduleRouteFeedbackElementFallback();
        return;
    }

    overlay = document.createElement("div");
    overlay.id = ROUTE_FEEDBACK_ELEMENT_ID;
    overlay.dataset.testid = "app-route-feedback";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    assignStyle(overlay, {
        position: "fixed",
        top: "60px",
        left: "0",
        right: "0",
        bottom: "80px",
        zIndex: "1200",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(244,248,255,0.86))",
        backdropFilter: "blur(6px)",
        pointerEvents: "none",
    });

    const panel = document.createElement("div");
    assignStyle(panel, {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "190px",
        padding: "13px 16px",
        borderRadius: "18px",
        border: "1px solid rgba(22,119,255,0.14)",
        background: "rgba(255,255,255,0.96)",
        boxShadow: "0 18px 42px rgba(15,35,80,0.14)",
        color: "#12355f",
    });

    const iconWrap = document.createElement("div");
    assignStyle(iconWrap, {
        width: "36px",
        height: "36px",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e6f4ff, #f6ffed)",
        boxShadow: "inset 0 0 0 1px rgba(22,119,255,0.08)",
    });

    const spinner = document.createElement("div");
    assignStyle(spinner, {
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        border: "2px solid #b7dcff",
        borderTopColor: "#1677ff",
        animation: "app-route-feedback-spin 0.8s linear infinite",
        boxSizing: "border-box",
    });
    iconWrap.appendChild(spinner);

    const textWrap = document.createElement("div");
    const title = document.createElement("span");
    title.textContent = "Đang mở trang";
    assignStyle(title, {
        display: "block",
        color: "#102a43",
        fontSize: "13px",
        fontWeight: "700",
        lineHeight: "18px",
    });
    const hint = document.createElement("span");
    hint.textContent = "Chuẩn bị dữ liệu hiển thị";
    assignStyle(hint, {
        display: "block",
        color: "#6b7c93",
        fontSize: "11px",
        lineHeight: "15px",
    });
    textWrap.appendChild(title);
    textWrap.appendChild(hint);

    panel.appendChild(iconWrap);
    panel.appendChild(textWrap);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    scheduleRouteFeedbackElementFallback();
};

function removeRouteFeedbackElement() {
    if (typeof document === "undefined") return;
    clearRouteFeedbackElementFallbackTimer();
    document.getElementById(ROUTE_FEEDBACK_ELEMENT_ID)?.remove();
}

export const useAppShellNavigation = () => React.useContext(AppShellNavigationContext);

export const AppShellNavigationProvider: React.FC<React.PropsWithChildren<{ value: AppShellNavigationValue }>> = ({ value, children }) => {
    return <AppShellNavigationContext.Provider value={value}>{children}</AppShellNavigationContext.Provider>;
};

export const useAppShellNavigationController = (pathname: string, navigate: NavigateFunction): AppShellNavigationValue => {
    const [isRouteFeedbackActive, setIsRouteFeedbackActive] = React.useState(false);
    const [pendingDestination, setPendingDestination] = React.useState<string | null>(null);
    const pendingDestinationRef = React.useRef<string | null>(null);
    const pendingPathRef = React.useRef<string | null>(null);
    const pathnameRef = React.useRef(pathname);
    const routeFeedbackActiveRef = React.useRef(false);
    const routeFeedbackStartedAtRef = React.useRef(0);
    const cleanupTimerRef = React.useRef<number | null>(null);
    const cleanupFrameRef = React.useRef<number | null>(null);
    const fallbackTimerRef = React.useRef<number | null>(null);
    const scheduledNavigationTimerRef = React.useRef<number | null>(null);
    const issuedDestinationRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    const setRouteFeedbackActive = React.useCallback((nextValue: boolean) => {
        routeFeedbackActiveRef.current = nextValue;
        setIsRouteFeedbackActive(nextValue);
    }, []);

    const setPendingRoute = React.useCallback((href: string | null) => {
        pendingDestinationRef.current = href;
        pendingPathRef.current = href ? pathOnly(href) : null;
        setPendingDestination(href);
    }, []);

    const clearCleanupTimer = React.useCallback(() => {
        if (cleanupTimerRef.current !== null) {
            window.clearTimeout(cleanupTimerRef.current);
            cleanupTimerRef.current = null;
        }
    }, []);

    const clearCleanupFrame = React.useCallback(() => {
        if (cleanupFrameRef.current !== null) {
            window.cancelAnimationFrame(cleanupFrameRef.current);
            cleanupFrameRef.current = null;
        }
    }, []);

    const clearFallbackTimer = React.useCallback(() => {
        if (fallbackTimerRef.current !== null) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
    }, []);

    const clearScheduledNavigationTimer = React.useCallback(() => {
        if (scheduledNavigationTimerRef.current !== null) {
            window.clearTimeout(scheduledNavigationTimerRef.current);
            scheduledNavigationTimerRef.current = null;
        }
    }, []);

    const finishRouteFeedback = React.useCallback(() => {
        setPendingRoute(null);
        issuedDestinationRef.current = null;
        clearCleanupTimer();
        clearCleanupFrame();
        clearFallbackTimer();
        removeRouteFeedbackElement();
        setRouteFeedbackActive(false);
    }, [clearCleanupFrame, clearCleanupTimer, clearFallbackTimer, setPendingRoute, setRouteFeedbackActive]);

    const startRouteFeedback = React.useCallback((href: string) => {
        if (routeFeedbackActiveRef.current && pendingDestinationRef.current === href) return false;

        clearCleanupTimer();
        clearCleanupFrame();
        clearFallbackTimer();
        setPendingRoute(href);
        routeFeedbackStartedAtRef.current = Date.now();
        showRouteFeedbackElement();
        setRouteFeedbackActive(true);
        fallbackTimerRef.current = window.setTimeout(finishRouteFeedback, ROUTE_FEEDBACK_FALLBACK_MS);
        return true;
    }, [clearCleanupFrame, clearCleanupTimer, clearFallbackTimer, finishRouteFeedback, setPendingRoute, setRouteFeedbackActive]);

    const navigateWithFeedback = React.useCallback((href: string, beforeNavigate?: BeforeNavigate) => {
        if (routeFeedbackActiveRef.current && pendingDestinationRef.current === href && issuedDestinationRef.current === href) return false;

        if (pathnameRef.current === pathOnly(href)) {
            if (beforeNavigate) flushSync(beforeNavigate);
            return false;
        }

        flushSync(() => {
            if (beforeNavigate) beforeNavigate();
            startRouteFeedback(href);
        });
        issuedDestinationRef.current = href;
        clearScheduledNavigationTimer();
        scheduledNavigationTimerRef.current = window.setTimeout(() => {
            scheduledNavigationTimerRef.current = null;
            React.startTransition(() => navigate(href));
        }, ROUTE_FEEDBACK_PRE_NAVIGATION_MS);
        return true;
    }, [clearScheduledNavigationTimer, navigate, startRouteFeedback]);

    React.useEffect(() => {
        const onRouteFeedbackRequest = (event: Event) => {
            const href = (event as CustomEvent<{ href?: string }>).detail?.href;
            if (href) startRouteFeedback(href);
        };

        window.addEventListener(ROUTE_FEEDBACK_REQUEST_EVENT, onRouteFeedbackRequest);
        return () => window.removeEventListener(ROUTE_FEEDBACK_REQUEST_EVENT, onRouteFeedbackRequest);
    }, [startRouteFeedback]);

    React.useEffect(() => {
        return () => {
            clearCleanupTimer();
            clearCleanupFrame();
            clearFallbackTimer();
            clearScheduledNavigationTimer();
        };
    }, [clearCleanupFrame, clearCleanupTimer, clearFallbackTimer, clearScheduledNavigationTimer]);

    React.useEffect(() => {
        if (!isRouteFeedbackActive) return;
        const pendingPath = pendingPathRef.current;
        if (pendingPath && pathname !== pendingPath) return;

        clearCleanupTimer();
        clearCleanupFrame();
        cleanupFrameRef.current = window.requestAnimationFrame(() => {
            cleanupFrameRef.current = window.requestAnimationFrame(() => {
                cleanupFrameRef.current = null;
                const elapsedMs = Date.now() - routeFeedbackStartedAtRef.current;
                const remainingVisibleMs = Math.max(0, ROUTE_FEEDBACK_MIN_VISIBLE_MS - elapsedMs);
                cleanupTimerRef.current = window.setTimeout(
                    finishRouteFeedback,
                    Math.max(ROUTE_FEEDBACK_PAINT_CLEANUP_MS, remainingVisibleMs),
                );
            });
        });
    }, [clearCleanupFrame, clearCleanupTimer, finishRouteFeedback, isRouteFeedbackActive, pathname]);

    return React.useMemo(() => ({
        navigateWithFeedback,
        startRouteFeedback,
        isRouteFeedbackActive,
        pendingDestination,
    }), [isRouteFeedbackActive, navigateWithFeedback, pendingDestination, startRouteFeedback]);
};

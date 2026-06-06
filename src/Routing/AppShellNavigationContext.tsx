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

const pathOnly = (href: string): string => {
    const [path] = href.split(/[?#]/);
    return path || "/";
};

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
    const cleanupTimerRef = React.useRef<number | null>(null);
    const cleanupFrameRef = React.useRef<number | null>(null);
    const fallbackTimerRef = React.useRef<number | null>(null);

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

    const finishRouteFeedback = React.useCallback(() => {
        setPendingRoute(null);
        clearCleanupTimer();
        clearCleanupFrame();
        clearFallbackTimer();
        setRouteFeedbackActive(false);
    }, [clearCleanupFrame, clearCleanupTimer, clearFallbackTimer, setPendingRoute, setRouteFeedbackActive]);

    const startRouteFeedback = React.useCallback((href: string) => {
        if (routeFeedbackActiveRef.current && pendingDestinationRef.current === href) return false;

        clearCleanupTimer();
        clearCleanupFrame();
        clearFallbackTimer();
        setPendingRoute(href);
        setRouteFeedbackActive(true);
        fallbackTimerRef.current = window.setTimeout(finishRouteFeedback, 1200);
        return true;
    }, [clearCleanupFrame, clearCleanupTimer, clearFallbackTimer, finishRouteFeedback, setPendingRoute, setRouteFeedbackActive]);

    const navigateWithFeedback = React.useCallback((href: string, beforeNavigate?: BeforeNavigate) => {
        if (routeFeedbackActiveRef.current && pendingDestinationRef.current === href) return false;

        if (pathnameRef.current === pathOnly(href)) {
            if (beforeNavigate) flushSync(beforeNavigate);
            return false;
        }

        flushSync(() => {
            beforeNavigate?.();
            startRouteFeedback(href);
        });
        React.startTransition(() => navigate(href));
        return true;
    }, [navigate, startRouteFeedback]);

    React.useEffect(() => {
        return () => {
            clearCleanupTimer();
            clearCleanupFrame();
            clearFallbackTimer();
        };
    }, [clearCleanupFrame, clearCleanupTimer, clearFallbackTimer]);

    React.useEffect(() => {
        if (!isRouteFeedbackActive) return;
        const pendingPath = pendingPathRef.current;
        if (pendingPath && pathname !== pendingPath) return;

        clearCleanupTimer();
        clearCleanupFrame();
        cleanupFrameRef.current = window.requestAnimationFrame(() => {
            cleanupFrameRef.current = window.requestAnimationFrame(() => {
                cleanupFrameRef.current = null;
                cleanupTimerRef.current = window.setTimeout(finishRouteFeedback, 80);
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

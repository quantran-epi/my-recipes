import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { ActiveStepTimer, CookingSession } from "@store/Models/CookingSession";
import { DishDurationPhaseKey, DishesStep } from "@store/Models/Dishes";
import {
    completeStepTimer,
    dismissStepTimer,
    extendStepTimer,
    pauseStepTimer,
    resumeStepTimer,
    startStepTimer,
    clearStepTimer,
} from "@store/Reducers/CookingSessionReducer";
import { toggleCookingStepComplete } from "@store/Reducers/CookingSessionReducer";

export type StepTimerView = {
    hasTimer: boolean;
    isRunning: boolean;
    isPaused: boolean;
    isFinished: boolean;
    stepIndex: number;
    stepContent: string;
    phaseKey?: DishDurationPhaseKey;
    plannedSec: number;
    elapsedSec: number;
    remainingSec: number;
    isOvertime: boolean;
    progressPercent: number;
    unattended: boolean;
    pause: () => void;
    resume: () => void;
    extend: (minutes: number) => void;
    skip: () => void;
}

// computeRunning mirrors the phase-timer math: anchor on startedAt, fold elapsed at boundaries.
const computeRunningSeconds = (timer: ActiveStepTimer): number => {
    if (timer.status !== "running") return 0;
    const startedMs = Date.parse(timer.startedAt);
    if (!Number.isFinite(startedMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
};

// Once-per-session ask, only on the first unattended timer the user starts.
let unattendedPermissionRequested = false;

const ensureNotificationPermission = (): void => {
    try {
        if (typeof Notification === "undefined") return;
        if (Notification.permission === "default") {
            Notification.requestPermission().catch(() => { /* ignore */ });
        }
    } catch {
        /* ignore */
    }
};

const fireUnattendedNotification = (stepContent: string, dishName: string) => {
    try {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const notification = new Notification("Bước xong rồi", {
            body: `${dishName} — ${stepContent.slice(0, 80)}`,
            requireInteraction: true,
            tag: `step-${dishName}-${stepContent}`,
        });
        notification.onclick = () => {
            try { window.focus(); notification.close(); } catch { /* ignore */ }
        };
    } catch {
        /* ignore */
    }
};

const tryVibrate = () => {
    try {
        navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
        /* ignore */
    }
};

// Lightweight "ding" via Web Audio — doesn't compete with the phase timer's loud alarm,
// and can be played even when the phase timer is muted (per-step alerts are independent).
const playDing = (ctx: AudioContext | null) => {
    if (!ctx) return;
    try {
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const beep = (freq: number, start: number, dur: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now + start);
            gain.gain.exponentialRampToValueAtTime(0.5, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur);
        };
        beep(880, 0, 0.25);
        beep(1320, 0.18, 0.25);
        beep(1760, 0.36, 0.32);
    } catch {
        /* ignore */
    }
};

export type StepTimerControls = {
    view: StepTimerView;
    activeStep?: DishesStep;
    autoStartFor: (step: DishesStep, stepIndex: number) => void;
    clear: () => void;
    unlockAudio: () => void;
}

export const useStepTimer = (session: CookingSession | undefined, dishName: string, currentStep: DishesStep | undefined): StepTimerControls => {
    const dispatch = useDispatch();
    const sessionId = session?.id;
    const activeTimer = session?.activeStepTimer;

    const [, setTick] = useState(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    // Step keys that already received their end signal, so tab refocus doesn't re-fire alerts.
    const firedRef = useRef<Set<string>>(new Set());
    // Track the last step the auto-start logic acted on; prevents repeatedly starting the timer if
    // the parent re-renders.
    const lastAutoStartedRef = useRef<string | null>(null);

    const ensureAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            try {
                const Ctor = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctor) audioCtxRef.current = new Ctor();
            } catch {
                audioCtxRef.current = null;
            }
        }
        if (audioCtxRef.current?.state === "suspended") {
            audioCtxRef.current.resume().catch(() => { /* ignore */ });
        }
        return audioCtxRef.current;
    }, []);

    useEffect(() => () => {
        audioCtxRef.current?.close().catch(() => { /* ignore */ });
        audioCtxRef.current = null;
    }, []);

    const isRunning = Boolean(activeTimer && activeTimer.status === "running");
    useEffect(() => {
        if (!isRunning) return;
        const id = window.setInterval(() => setTick(t => (t + 1) % 1_000_000), 1000);
        return () => window.clearInterval(id);
    }, [isRunning]);

    // Derive view-model.
    const runningSeconds = activeTimer ? computeRunningSeconds(activeTimer) : 0;
    const elapsedSec = activeTimer ? activeTimer.accumulatedSeconds + runningSeconds : 0;
    const plannedSec = activeTimer?.plannedSeconds ?? 0;
    const remainingSec = plannedSec - elapsedSec;
    const isOvertime = Boolean(activeTimer) && remainingSec <= 0;
    const progressPercent = plannedSec > 0
        ? Math.min(100, Math.round((elapsedSec / plannedSec) * 100))
        : 0;

    // Fire the end signal exactly once per timer instance. Use startedAt + stepIndex as the key so
    // a new timer for the same step (after extend) re-fires correctly.
    useEffect(() => {
        if (!activeTimer || !sessionId) return;
        if (activeTimer.status === "done" || activeTimer.status === "dismissed") return;
        if (!isOvertime) return;
        const key = `${sessionId}:${activeTimer.stepIndex}:${activeTimer.startedAt}`;
        if (firedRef.current.has(key)) return;
        firedRef.current.add(key);

        playDing(audioCtxRef.current);
        if (activeTimer.unattended) {
            fireUnattendedNotification(activeTimer.stepContent, dishName);
            tryVibrate();
            // Auto-mark step done when unattended timer completes — user can rely on the alert.
            dispatch(toggleCookingStepComplete({ sessionId, stepIndex: activeTimer.stepIndex }));
            dispatch(completeStepTimer({ sessionId }));
        }
    }, [activeTimer, sessionId, isOvertime, dishName, dispatch]);

    const view: StepTimerView = {
        hasTimer: Boolean(activeTimer),
        isRunning: activeTimer?.status === "running",
        isPaused: activeTimer?.status === "paused",
        isFinished: activeTimer?.status === "done" || activeTimer?.status === "dismissed",
        stepIndex: activeTimer?.stepIndex ?? -1,
        stepContent: activeTimer?.stepContent ?? "",
        phaseKey: activeTimer?.phaseKey,
        plannedSec,
        elapsedSec,
        remainingSec,
        isOvertime,
        progressPercent,
        unattended: Boolean(activeTimer?.unattended),
        pause: () => { if (sessionId) dispatch(pauseStepTimer({ sessionId })); },
        resume: () => { ensureAudioContext(); if (sessionId) dispatch(resumeStepTimer({ sessionId })); },
        extend: (minutes: number) => { if (sessionId) dispatch(extendStepTimer({ sessionId, minutes })); },
        skip: () => { if (sessionId) dispatch(dismissStepTimer({ sessionId })); },
    };

    const autoStartFor = useCallback((step: DishesStep, stepIndex: number) => {
        if (!sessionId) return;
        if (!step.timerMinutes || step.timerMinutes < 1) return;
        const stepKey = `${sessionId}:${step.id}`;
        if (lastAutoStartedRef.current === stepKey) return;
        // Don't auto-start if a timer for this step is already running/paused.
        if (activeTimer && activeTimer.stepIndex === stepIndex && activeTimer.status !== "dismissed") return;
        lastAutoStartedRef.current = stepKey;
        ensureAudioContext();
        if (step.unattended) {
            if (!unattendedPermissionRequested) {
                unattendedPermissionRequested = true;
                ensureNotificationPermission();
            }
        }
        dispatch(startStepTimer({
            sessionId,
            stepIndex,
            stepContent: step.content,
            phaseKey: step.phaseKey,
            minutes: step.timerMinutes,
            unattended: Boolean(step.unattended),
        }));
    }, [activeTimer, dispatch, ensureAudioContext, sessionId]);

    const clear = useCallback(() => {
        if (sessionId) dispatch(clearStepTimer({ sessionId }));
    }, [dispatch, sessionId]);

    const unlockAudio = useCallback(() => {
        ensureAudioContext();
    }, [ensureAudioContext]);

    return { view, activeStep: currentStep, autoStartFor, clear, unlockAudio };
};

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { DishDurationPhaseKey } from "@store/Models/Dishes";
import { CookingSession, CookingPhaseTimer } from "@store/Models/CookingSession";
import {
    advanceCookingPhase,
    pauseCookingTimer,
    resumeCookingTimer,
    toggleCookingTimerSound,
} from "@store/Reducers/CookingSessionReducer";
import {
    markCookingSessionOnScreen,
    unmarkCookingSessionOnScreen,
    requestCookingNotificationPermission,
} from "./cookingAlarmRegistry";

export type CookingTimerView = {
    hasTimer: boolean;
    isPaused: boolean;
    isFinished: boolean;            // all phases done (activePhaseKey === null)
    soundEnabled: boolean;
    phases: CookingPhaseTimer[];
    activePhaseKey: DishDurationPhaseKey | null;
    completedPhaseKeys: DishDurationPhaseKey[];
    activeElapsedSec: number;       // accumulated + running segment for the active phase
    activePlannedSec: number;
    remainingSec: number;           // planned − elapsed; negative when overtime
    isOvertime: boolean;
    phasePercent: number;           // elapsed / planned, capped at 100
    isLastPhase: boolean;
    unlockAudio: () => void;
    pause: () => void;
    resume: () => void;
    advance: () => void;
    toggleSound: () => void;
}

// Live remaining time is computed from anchors (accumulatedSeconds + now − phaseStartedAt),
// never stored per-second — so reopening the app recomputes correctly and Redux is not written on tick.
const computeRunningSeconds = (phaseStartedAt: string | null, isPaused: boolean): number => {
    if (!phaseStartedAt || isPaused) return 0;
    const startedMs = Date.parse(phaseStartedAt);
    if (!Number.isFinite(startedMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
};

// One loud, urgent "ring" via Web Audio — a triple square-wave beep. Played repeatedly by the
// alarm loop below. The AudioContext is created lazily on a user gesture (start tap) so autoplay
// policies don't block it. Best-effort: any failure is swallowed.
const playAlarmRing = (ctx: AudioContext | null) => {
    if (!ctx) return;
    try {
        // A context can come back suspended (autoplay policy); resume before scheduling or it stays silent.
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const beep = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            // Square wave reads as louder/harsher than sine at the same peak gain — more attention-grabbing.
            osc.type = "square";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now + start);
            gain.gain.exponentialRampToValueAtTime(0.7, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + duration);
        };
        beep(880, 0, 0.18);
        beep(1100, 0.22, 0.18);
        beep(880, 0.44, 0.18);
    } catch {
        /* ignore audio errors */
    }
};

// How long the alarm keeps ringing if the user never reacts, and the gap between rings.
const ALARM_DURATION_MS = 5 * 60 * 1000;
const ALARM_RING_INTERVAL_MS = 1500;

export const useCookingTimer = (session: CookingSession | undefined): CookingTimerView => {
    const dispatch = useDispatch();
    const timer = session?.timer;
    const sessionId = session?.id;

    // Drives re-render once per second; the value itself is irrelevant.
    const [, setTick] = useState(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    // Active alarm-ring interval id, so we can silence it the instant the user reacts.
    const alarmIntervalRef = useRef<number | null>(null);
    // Phases whose alarm the user has dismissed (proceeded or muted) — keeps the alarm effect
    // from restarting the ring for a phase the user has already acknowledged.
    const dismissedPhasesRef = useRef<Set<DishDurationPhaseKey>>(new Set());

    const isRunning = Boolean(timer && !timer.isPaused && timer.activePhaseKey);

    useEffect(() => {
        if (!isRunning) return;
        const id = window.setInterval(() => setTick(t => (t + 1) % 1_000_000), 1000);
        return () => window.clearInterval(id);
    }, [isRunning]);

    // Create (once) and unlock the AudioContext. Must be called from a user gesture — autoplay
    // policy otherwise hands back a suspended context that schedules tones but plays nothing.
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

    // Close the context on unmount so repeated open/close of the cooking widget doesn't leak
    // contexts (browsers cap concurrent AudioContexts).
    useEffect(() => () => {
        audioCtxRef.current?.close().catch(() => { /* ignore */ });
        audioCtxRef.current = null;
    }, []);

    // Register this session as on-screen while the hook is mounted, so the app-root notifier stays
    // silent (the loud in-app ring owns the alert here) and takes over with a system notification
    // only once the user navigates away and this widget unmounts.
    useEffect(() => {
        if (!sessionId) return;
        markCookingSessionOnScreen(sessionId);
        return () => unmarkCookingSessionOnScreen(sessionId);
    }, [sessionId]);

    // Derive the view model for the active phase.
    const activePhaseKey = timer?.activePhaseKey ?? null;
    const activePhase = timer?.phases.find(p => p.phaseKey === activePhaseKey);
    const runningSeconds = computeRunningSeconds(timer?.phaseStartedAt ?? null, timer?.isPaused ?? true);
    const activeElapsedSec = (activePhase?.accumulatedSeconds ?? 0) + runningSeconds;
    const activePlannedSec = (activePhase?.plannedMinutes ?? 0) * 60;
    const remainingSec = activePlannedSec - activeElapsedSec;
    const isOvertime = Boolean(activePhase) && remainingSec < 0;
    const phasePercent = activePlannedSec > 0
        ? Math.min(100, Math.round((activeElapsedSec / activePlannedSec) * 100))
        : 0;
    const activeIndex = timer?.phases.findIndex(p => p.phaseKey === activePhaseKey) ?? -1;
    const isLastPhase = timer != null && activeIndex >= 0 && activeIndex === timer.phases.length - 1;

    // Stop any in-progress alarm ring immediately.
    const stopAlarm = useCallback(() => {
        if (alarmIntervalRef.current !== null) {
            window.clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
    }, []);

    // When the active phase crosses into overtime, ring a loud alarm on repeat for up to 5 minutes.
    // It keeps going until the user reacts (proceed = pause/resume/advance) or mutes — both routes
    // mark the phase dismissed below — or until ALARM_DURATION_MS elapses.
    useEffect(() => {
        const shouldRing = activePhaseKey
            && isOvertime
            && timer?.soundEnabled
            && !dismissedPhasesRef.current.has(activePhaseKey);
        if (!shouldRing) {
            stopAlarm();
            return;
        }
        // Already ringing for this phase — don't stack a second interval.
        if (alarmIntervalRef.current !== null) return;

        const startedAt = Date.now();
        const ring = () => {
            playAlarmRing(audioCtxRef.current);
            try {
                navigator.vibrate?.([400, 150, 400, 150, 400]);
            } catch {
                /* vibrate unsupported */
            }
        };
        ring();
        alarmIntervalRef.current = window.setInterval(() => {
            if (Date.now() - startedAt >= ALARM_DURATION_MS) {
                stopAlarm();
                return;
            }
            ring();
        }, ALARM_RING_INTERVAL_MS);

        return () => stopAlarm();
    }, [activePhaseKey, isOvertime, timer?.soundEnabled, stopAlarm]);

    // Silence the current phase's alarm and remember it as acknowledged so the effect won't restart it.
    const dismissAlarm = useCallback(() => {
        if (activePhaseKey) dismissedPhasesRef.current.add(activePhaseKey);
        stopAlarm();
    }, [activePhaseKey, stopAlarm]);

    // Call from the start tap so the AudioContext is created/unlocked within a user gesture;
    // otherwise the first phase's expiry chime is silent (context never existed yet).
    const unlockAudio = useCallback(() => {
        ensureAudioContext();
        // Same gesture also primes the cross-page fallback: ask for Notification permission now,
        // while we have a user gesture, so the app-root notifier can alert after the user navigates away.
        requestCookingNotificationPermission();
    }, [ensureAudioContext]);

    const pause = useCallback(() => {
        dismissAlarm();
        if (sessionId) dispatch(pauseCookingTimer({ sessionId }));
    }, [dispatch, sessionId, dismissAlarm]);

    const resume = useCallback(() => {
        ensureAudioContext();
        dismissAlarm();
        if (sessionId) dispatch(resumeCookingTimer({ sessionId }));
    }, [dispatch, sessionId, ensureAudioContext, dismissAlarm]);

    const advance = useCallback(() => {
        ensureAudioContext();
        dismissAlarm();
        if (sessionId) dispatch(advanceCookingPhase({ sessionId }));
    }, [dispatch, sessionId, ensureAudioContext, dismissAlarm]);

    const toggleSound = useCallback(() => {
        ensureAudioContext();
        dismissAlarm();
        if (sessionId) dispatch(toggleCookingTimerSound({ sessionId }));
    }, [dispatch, sessionId, ensureAudioContext, dismissAlarm]);

    return {
        hasTimer: Boolean(timer),
        isPaused: timer?.isPaused ?? false,
        isFinished: Boolean(timer) && activePhaseKey === null,
        soundEnabled: timer?.soundEnabled ?? true,
        phases: timer?.phases ?? [],
        activePhaseKey,
        completedPhaseKeys: timer?.completedPhaseKeys ?? [],
        activeElapsedSec,
        activePlannedSec,
        remainingSec,
        isOvertime,
        phasePercent,
        isLastPhase,
        unlockAudio,
        pause,
        resume,
        advance,
        toggleSound,
    };
};

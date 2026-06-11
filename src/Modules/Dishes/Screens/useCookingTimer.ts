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

// Short two-tone chime via Web Audio. Created lazily on a user gesture (start tap) so autoplay
// policies don't block it. Best-effort: any failure is swallowed.
const playPhaseEndChime = (ctx: AudioContext | null) => {
    if (!ctx) return;
    try {
        const now = ctx.currentTime;
        const tone = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now + start);
            gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + duration);
        };
        tone(880, 0, 0.2);
        tone(660, 0.22, 0.22);
    } catch {
        /* ignore audio errors */
    }
};

export const useCookingTimer = (session: CookingSession | undefined): CookingTimerView => {
    const dispatch = useDispatch();
    const timer = session?.timer;
    const sessionId = session?.id;

    // Drives re-render once per second; the value itself is irrelevant.
    const [, setTick] = useState(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    // Tracks which phase keys have already alerted, so the chime fires once per crossing.
    const alertedPhasesRef = useRef<Set<DishDurationPhaseKey>>(new Set());

    const isRunning = Boolean(timer && !timer.isPaused && timer.activePhaseKey);

    useEffect(() => {
        if (!isRunning) return;
        const id = window.setInterval(() => setTick(t => (t + 1) % 1_000_000), 1000);
        return () => window.clearInterval(id);
    }, [isRunning]);

    const ensureAudioContext = useCallback(() => {
        if (audioCtxRef.current) return audioCtxRef.current;
        try {
            const Ctor = window.AudioContext || (window as any).webkitAudioContext;
            if (Ctor) audioCtxRef.current = new Ctor();
        } catch {
            audioCtxRef.current = null;
        }
        return audioCtxRef.current;
    }, []);

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

    // Fire the one-shot alert when the active phase first crosses into overtime.
    useEffect(() => {
        if (!activePhaseKey || !isOvertime) return;
        if (alertedPhasesRef.current.has(activePhaseKey)) return;
        alertedPhasesRef.current.add(activePhaseKey);
        if (timer?.soundEnabled) playPhaseEndChime(audioCtxRef.current);
        try {
            navigator.vibrate?.([200, 100, 200]);
        } catch {
            /* vibrate unsupported */
        }
    }, [activePhaseKey, isOvertime, timer?.soundEnabled]);

    const pause = useCallback(() => {
        if (sessionId) dispatch(pauseCookingTimer({ sessionId }));
    }, [dispatch, sessionId]);

    const resume = useCallback(() => {
        ensureAudioContext();
        if (sessionId) dispatch(resumeCookingTimer({ sessionId }));
    }, [dispatch, sessionId, ensureAudioContext]);

    const advance = useCallback(() => {
        ensureAudioContext();
        if (sessionId) dispatch(advanceCookingPhase({ sessionId }));
    }, [dispatch, sessionId, ensureAudioContext]);

    const toggleSound = useCallback(() => {
        ensureAudioContext();
        if (sessionId) dispatch(toggleCookingTimerSound({ sessionId }));
    }, [dispatch, sessionId, ensureAudioContext]);

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
        pause,
        resume,
        advance,
        toggleSound,
    };
};

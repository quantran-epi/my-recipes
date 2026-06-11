/**
 * CookingTimerNotifier — app-root watcher that fires a system Notification when a cooking phase
 * crosses into overtime *while the user is on another screen*. Mounted once in AppInitializer so it
 * survives navigation; the in-screen CookingTimerCard keeps ownership of the loud repeating ring
 * whenever its widget is mounted (see cookingAlarmRegistry). This is the cross-page fallback the
 * loud Web Audio ring can't provide once its hook unmounts.
 *
 * Renders nothing.
 */
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectCookingSessions } from "@store/Selectors";
import { CookingSession } from "@store/Models/CookingSession";
import { isCookingSessionOnScreen } from "./cookingAlarmRegistry";

// Mirror of useCookingTimer's overtime math: planned − (accumulated + live running segment) < 0.
const isPhaseOvertime = (session: CookingSession): boolean => {
    const timer = session.timer;
    if (!timer || timer.isPaused || !timer.activePhaseKey) return false;
    const activePhase = timer.phases.find(p => p.phaseKey === timer.activePhaseKey);
    if (!activePhase) return false;
    let runningSeconds = 0;
    if (timer.phaseStartedAt) {
        const startedMs = Date.parse(timer.phaseStartedAt);
        if (Number.isFinite(startedMs)) {
            runningSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
        }
    }
    const elapsed = activePhase.accumulatedSeconds + runningSeconds;
    return elapsed > activePhase.plannedMinutes * 60;
};

// A phase is identified across ticks by session id + phase key, so each crossing notifies once.
const phaseToken = (session: CookingSession): string =>
    `${session.id}:${session.timer?.activePhaseKey ?? ""}`;

const fireNotification = (session: CookingSession) => {
    try {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const notification = new Notification("Hết giờ nấu rồi!", {
            body: `${session.dishName} — đã đến lúc kiểm tra món của bạn.`,
            tag: phaseToken(session),   // collapse repeats for the same phase into one notification
            requireInteraction: true,   // stays until the user dismisses, rather than auto-fading
        });
        notification.onclick = () => {
            try {
                window.focus();
                notification.close();
            } catch {
                /* ignore */
            }
        };
    } catch {
        /* Notification API unavailable or blocked */
    }
};

export const CookingTimerNotifier: React.FC = () => {
    const sessions = useSelector(selectCookingSessions);
    // Phase tokens already notified, so a crossing alerts once even though we poll on an interval.
    const notifiedRef = useRef<Set<string>>(new Set());
    // Keep the latest sessions in a ref so the polling interval reads fresh data without resubscribing.
    const sessionsRef = useRef(sessions);
    sessionsRef.current = sessions;

    useEffect(() => {
        const check = () => {
            const active = sessionsRef.current.filter(s => s.status === "cooking" && s.timer);
            const liveTokens = new Set(active.map(phaseToken));

            active.forEach(session => {
                if (!session.timer?.soundEnabled) return;       // respect the mute toggle
                if (isCookingSessionOnScreen(session.id)) return; // on-screen widget owns the alert
                const token = phaseToken(session);
                if (notifiedRef.current.has(token)) return;
                if (isPhaseOvertime(session)) {
                    notifiedRef.current.add(token);
                    fireNotification(session);
                }
            });

            // Drop tokens for phases that are no longer active so a re-cook of the same dish/phase
            // can notify again, and the set doesn't grow unbounded.
            notifiedRef.current.forEach(token => {
                if (!liveTokens.has(token)) notifiedRef.current.delete(token);
            });
        };

        check();
        const id = window.setInterval(check, 5000);
        return () => window.clearInterval(id);
    }, []);

    return null;
};

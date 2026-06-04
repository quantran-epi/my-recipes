import React from "react";

export type ScheduledCalculationResult<T> = {
    value: T;
    pending: boolean;
}

type UseScheduledCalculationOptions<T> = {
    enabled?: boolean;
    initialValue: () => T;
    retainPreviousValue?: boolean;
}

const scheduleAfterPaint = (callback: () => void): (() => void) => {
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;
    let cancelled = false;
    const schedule = window.requestAnimationFrame ?? ((frameCallback: FrameRequestCallback) => window.setTimeout(frameCallback, 0) as unknown as number);
    const cancel = window.cancelAnimationFrame ?? window.clearTimeout;

    firstFrame = schedule(() => {
        secondFrame = schedule(() => {
            if (!cancelled) callback();
        });
    });

    return () => {
        cancelled = true;
        if (firstFrame !== undefined) cancel(firstFrame);
        if (secondFrame !== undefined) cancel(secondFrame);
    };
};

export const useScheduledCalculation = <T,>(
    calculate: () => T,
    options: UseScheduledCalculationOptions<T>,
): ScheduledCalculationResult<T> => {
    const { enabled = true, initialValue, retainPreviousValue = false } = options;
    const runIdRef = React.useRef(0);
    const [state, setState] = React.useState<ScheduledCalculationResult<T>>(() => ({
        value: initialValue(),
        pending: enabled,
    }));

    React.useEffect(() => {
        runIdRef.current += 1;
        const runId = runIdRef.current;

        if (!enabled) {
            setState({ value: initialValue(), pending: false });
            return;
        }

        setState(current => ({
            value: retainPreviousValue ? current.value : initialValue(),
            pending: true,
        }));

        return scheduleAfterPaint(() => {
            if (runIdRef.current !== runId) return;
            const value = calculate();
            if (runIdRef.current !== runId) return;

            React.startTransition(() => {
                setState({ value, pending: false });
            });
        });
    }, [calculate, enabled, initialValue, retainPreviousValue]);

    return state;
};

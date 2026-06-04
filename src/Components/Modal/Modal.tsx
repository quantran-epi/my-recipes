import { Modal as AntModal, Spin } from "antd";
import React from "react";

export const Modal = AntModal;

type DeferredModalContentProps = {
    active: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    minHeight?: number | string;
}

export const DeferredModalContent: React.FunctionComponent<DeferredModalContentProps> = ({
    active,
    children,
    fallback,
    minHeight = 120,
}) => {
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
        if (!active) {
            setReady(false);
            return;
        }

        let firstFrame: number | undefined;
        let secondFrame: number | undefined;
        const schedule = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(callback, 0) as unknown as number);
        const cancel = window.cancelAnimationFrame ?? window.clearTimeout;

        firstFrame = schedule(() => {
            secondFrame = schedule(() => setReady(true));
        });

        return () => {
            if (firstFrame !== undefined) cancel(firstFrame);
            if (secondFrame !== undefined) cancel(secondFrame);
        };
    }, [active]);

    if (!active || !ready) {
        return <div style={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {fallback ?? <Spin size="small" />}
        </div>;
    }

    return <React.Fragment>{children}</React.Fragment>;
};

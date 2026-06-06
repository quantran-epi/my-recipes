import { FastModalShell } from "@components/FastOverlay";
import { Button as AntButton, Modal as AntModal, Spin } from "antd";
import type { ModalProps } from "antd";
import React from "react";

type AppModalProps = ModalProps & {
    onClose?: () => void;
    bodyStyle?: React.CSSProperties;
};

type AppModalComponent = React.FunctionComponent<AppModalProps> & Pick<typeof AntModal, "useModal" | "confirm" | "destroyAll" | "info" | "success" | "error" | "warning">;

const defaultFooterStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
};

const ModalBase: React.FunctionComponent<AppModalProps> = ({
    open,
    title,
    children,
    footer,
    width,
    style,
    styles,
    bodyStyle,
    zIndex,
    maskClosable,
    destroyOnClose,
    closable,
    keyboard,
    afterOpenChange,
    onCancel,
    onClose,
    onOk,
    okText = "OK",
    cancelText = "Cancel",
    okButtonProps,
    cancelButtonProps,
    confirmLoading,
}) => {
    const isOpen = Boolean(open);

    const _onCancel = React.useCallback((event?: React.MouseEvent<HTMLButtonElement>) => {
        onCancel?.(event as React.MouseEvent<HTMLButtonElement>);
        onClose?.();
    }, [onCancel, onClose]);

    const _onOk = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        if (onOk) {
            onOk(event);
            return;
        }

        _onCancel(event);
    }, [_onCancel, onOk]);

    const footerNode: React.ReactNode = typeof footer === "function" ? null : footer === undefined ? (
        <div style={defaultFooterStyle}>
            <AntButton {...cancelButtonProps} onClick={_onCancel}>{cancelText}</AntButton>
            <AntButton type="primary" {...okButtonProps} loading={confirmLoading} onClick={_onOk}>{okText}</AntButton>
        </div>
    ) : footer;

    return <FastModalShell
        open={isOpen}
        title={title}
        width={width}
        style={style}
        zIndex={zIndex}
        maskClosable={maskClosable}
        closable={closable !== false}
        keyboard={keyboard}
        afterOpenChange={afterOpenChange}
        onClose={() => _onCancel()}
        footer={footerNode}
        bodyStyle={{ ...styles?.body, ...bodyStyle }}
    >
        {isOpen || !destroyOnClose ? children : null}
    </FastModalShell>;
};

export const Modal = Object.assign(ModalBase, {
    useModal: AntModal.useModal,
    confirm: AntModal.confirm,
    destroyAll: AntModal.destroyAll,
    info: AntModal.info,
    success: AntModal.success,
    error: AntModal.error,
    warning: AntModal.warning,
}) as AppModalComponent;

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

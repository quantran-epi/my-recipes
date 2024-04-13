import { Input } from "@components/Form/Input";
import { useMessage } from "@components/Message";
import { useToggle } from "@hooks";
import { ButtonProps } from "antd";
import { ModalStaticFunctions } from "antd/es/modal/confirm";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";

type PromptFuncProps = {
    title?: string;
    onOk: (value: string) => void;
    onCancel?: () => void;
    require?: boolean;
    requireMessage?: string;
    okButtonProps?: ButtonProps;
    cancelButtonProps?: ButtonProps;
    okText?: string;
    cancelText?: string;
    width?: string | number;
}

type ModalProviderContextData = Omit<ModalStaticFunctions, "warn"> & {
    prompt: (props: PromptFuncProps) => void;
}

type ModalProviderProps = {
    children: React.ReactNode;
}

const ModalContext = React.createContext<ModalProviderContextData>(null);

export const ModalProvider: React.FunctionComponent<ModalProviderProps> = (props) => {
    const [modal, contextHolder] = Modal.useModal();
    const { value, show, hide } = useToggle({ defaultValue: false });
    const [promtFuncProps, setPromtFuncProps] = useState<PromptFuncProps>(null);

    const prompt = (props: PromptFuncProps) => {
        setPromtFuncProps(props);
        show();
    }

    const _onPromptOk = (value: string) => {
        if (promtFuncProps && promtFuncProps.onOk) promtFuncProps.onOk(value);
        hide();
    }

    const _onPromptCancel = () => {
        if (promtFuncProps && promtFuncProps.onCancel) promtFuncProps.onCancel();
        hide();
    }

    return <ModalContext.Provider value={{
        ...modal,
        prompt
    }}>
        {props.children}
        <PromptModal
            promptFuncProps={promtFuncProps}
            open={value}
            onPromptCancel={_onPromptCancel}
            onPromptOk={_onPromptOk} />
        {contextHolder}
    </ModalContext.Provider>
}

type PromptModalProps = {
    promptFuncProps: PromptFuncProps;
    open: boolean;
    onPromptOk: (value: string) => void;
    onPromptCancel: () => void;
}

const PromptModal: React.FunctionComponent<PromptModalProps> = (props) => {
    const ref = useRef(null);
    const message = useMessage();
    const [value, setValue] = useState<string>("");

    useEffect(() => {
        if (props.open) setTimeout(() => {
            if (ref.current) {
                ref.current.focus();
                setValue(value => "");
            }
        })
    }, [props.open])

    const _onOk = () => {
        if (props.promptFuncProps.require && !Boolean(value)) {
            message.error(props.promptFuncProps.requireMessage || "Vui lòng nhập");
            ref.current.focus();
            return;
        }
        props.onPromptOk(value);
    }

    return <Modal
        width={props.promptFuncProps?.width}
        title={props.promptFuncProps?.title}
        open={props.open}
        onOk={_onOk}
        onCancel={props.onPromptCancel}
        closable={false}
        okText={props.promptFuncProps?.okText || "OK"}
        cancelText={props.promptFuncProps?.cancelText || "Đóng"}
        okButtonProps={props.promptFuncProps?.okButtonProps}
        cancelButtonProps={props.promptFuncProps?.cancelButtonProps}>
        <Input ref={ref} value={value} onChange={event => setValue(event.target.value)} />
    </Modal>
}

export const useModal = () => {
    const context = useContext(ModalContext);
    return context;
}
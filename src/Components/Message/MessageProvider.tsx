import { COMMON_MESSAGE } from "@common/Constants/CommonMessage";
import { message } from "antd";
import { JointContent } from "antd/es/message/interface";
import React, { useContext } from "react";

type MessageProviderContextData = {
    error: (content?: JointContent, duration?: number | VoidFunction, onClose?: VoidFunction) => Function;
    success: (content?: JointContent, duration?: number | VoidFunction, onClose?: VoidFunction) => Function;
}

type MessageProviderProps = {
    children: React.ReactNode;
}

const MessageContext = React.createContext<MessageProviderContextData>({
    error: () => () => { },
    success: () => () => { }
});

export const MessageProvider: React.FunctionComponent<MessageProviderProps> = (props) => {
    const [messageApi, contextHolder] = message.useMessage();

    const error = (content?: JointContent, duration?: number | VoidFunction, onClose?: VoidFunction) => {
        content = content || COMMON_MESSAGE.ERROR;
        return messageApi.error(content, duration, onClose);
    }

    const success = (content?: JointContent, duration?: number | VoidFunction, onClose?: VoidFunction) => {
        content = content || COMMON_MESSAGE.SUCCESS;
        return messageApi.success(content, duration, onClose);
    }

    return <MessageContext.Provider value={{
        error,
        success
    }}>
        {props.children}
        {contextHolder}
    </MessageContext.Provider>
}

export const useMessage = () => {
    const context = useContext(MessageContext);
    return context;
}
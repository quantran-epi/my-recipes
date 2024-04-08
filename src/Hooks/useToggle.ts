import { useState } from "react";

type UseToggleProps = {
    defaultValue?: boolean;
}

export type UseToggle = {
    show: () => void;
    hide: () => void;
    toggle: (value: boolean) => void;
    value: boolean;
}

export const useToggle = (props?: UseToggleProps): UseToggle => {
    let defaultValue = props?.defaultValue || false;
    const [value, setValue] = useState(defaultValue);

    const show = () => {
        setValue(true);
    }

    const hide = () => {
        setValue(false);
    }

    return {
        show,
        hide,
        value,
        toggle: setValue
    }
}
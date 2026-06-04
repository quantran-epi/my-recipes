import { useCallback, useMemo, useState } from "react";

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

    const show = useCallback(() => {
        setValue(true);
    }, []);

    const hide = useCallback(() => {
        setValue(false);
    }, []);

    return useMemo(() => ({
        show,
        hide,
        value,
        toggle: setValue
    }), [hide, show, value]);
}

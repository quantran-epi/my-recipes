import { Box } from "@components/Layout/Box";
import { FunctionComponent, useEffect, useRef } from "react";

interface IOutsideClickProps {
    disabled?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClickOutside: () => void;
}

export const OutsideClick: FunctionComponent<IOutsideClickProps> = ({
    disabled = false,
    children,
    style,
    onClickOutside
}) => {
    const boxRef = useRef<HTMLDivElement>(null);

    const _bodyClickEvent = (e: MouseEvent) => {
        if (!boxRef.current?.contains(e.target as Node))
            onClickOutside();
    }

    useEffect(() => {
        if (disabled) return;
        if (!boxRef.current) return;

        document.body.addEventListener('click', _bodyClickEvent);

        return () => {
            document.body.removeEventListener('click', _bodyClickEvent);
        }
    }, [boxRef, _bodyClickEvent])

    return <Box ref={boxRef} style={style}>
        {children}
    </Box>
}
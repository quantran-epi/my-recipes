import { ArrowUpOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Tooltip } from "@components/Tootip";
import React from "react";
import type { ListImperativeAPI } from "react-window";

type VirtualListScrollTopButtonProps = {
    listRef: React.MutableRefObject<ListImperativeAPI | null>;
    rowCount: number;
    style?: React.CSSProperties;
}

export const VirtualListScrollTopButton: React.FunctionComponent<VirtualListScrollTopButtonProps> = ({ listRef, rowCount, style }) => {
    if (rowCount <= 4) return null;

    const _onClick = () => {
        const list = listRef.current;
        if (!list) return;
        list.scrollToRow({ index: 0, align: "start", behavior: "smooth" });
    };

    return <Tooltip title="Lên đầu danh sách">
        <Button
            shape="circle"
            icon={<ArrowUpOutlined />}
            onClick={_onClick}
            style={{
                position: "absolute",
                right: 12,
                bottom: 14,
                zIndex: 12,
                width: 38,
                height: 38,
                boxShadow: "0 6px 18px rgba(0,0,0,0.16)",
                background: "#fff",
                ...style,
            }}
        />
    </Tooltip>;
}

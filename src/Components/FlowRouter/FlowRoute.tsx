import { BaseScreenProps } from "@common/Types/UtilityTypes";
import React, { FunctionComponent, useRef } from "react";
import { PathPattern, useMatch } from "react-router-dom";

export type FlowRouteProps = {
    index: number;
    path: string | PathPattern<string>;
    component: React.ReactElement<BaseScreenProps>;
}

export const FlowRoute: FunctionComponent<FlowRouteProps> = ({
    path,
    component,
    index,
}) => {
    const match = useMatch(path);
    const rendered = useRef(false);

    if (match !== null && !rendered.current) rendered.current = true;

    if (!rendered.current) return null;
    return <React.Fragment>
        <div id={"flow-route-" + index} style={{ display: match ? "block" : "none" }}>
            {React.cloneElement(component, { visible: match !== null })}
        </div>
    </React.Fragment>
}

import React, { FunctionComponent } from "react";
import { FlowRoute, FlowRouteProps } from "./FlowRoute";

type FlowRouterProps = {
    routes: Omit<FlowRouteProps, "index" | "visible">[];
}

type FlowRouterContextData = {};

const defaultContextData = {};

export const FlowRouterContext = React.createContext<FlowRouterContextData>(defaultContextData);

export const FlowRouter: FunctionComponent<FlowRouterProps> = ({
    routes
}) => {
    return <FlowRouterContext.Provider value={defaultContextData}>
        {routes.map((route, index) => <FlowRoute key={index} index={index} {...route} />)}
    </FlowRouterContext.Provider>
}
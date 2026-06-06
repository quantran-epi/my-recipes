import React from "react";

type AppInitializerProps = {
    children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    return <>{children}</>;
};

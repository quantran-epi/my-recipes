import React from "react";
import { useSharedDataSync } from "@hooks";
import { SharedSyncModal } from "./SharedSyncModal";

type AppInitializerProps = {
    children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { pendingSync, dismissSync, markSynced } = useSharedDataSync();

    return (
        <>
            {children}
            {pendingSync && (
                <SharedSyncModal
                    open={true}
                    manifest={pendingSync.manifest}
                    hasIngredientChanges={pendingSync.hasIngredientChanges}
                    hasDishChanges={pendingSync.hasDishChanges}
                    onDone={markSynced}
                    onCancel={dismissSync}
                />
            )}
        </>
    );
};


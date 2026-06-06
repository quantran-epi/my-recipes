import React from "react";
import { message } from "antd";
import { checkStorageHealth } from "@common/Storage/AppStorage";

type AppInitializerProps = {
    children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    React.useEffect(() => {
        let cancelled = false;

        checkStorageHealth().then(health => {
            if (cancelled || !health.usage || !health.quota) return;
            const ratio = health.usage / health.quota;
            if (ratio >= 0.8) {
                message.warning("Dung lượng lưu trữ trình duyệt sắp đầy. Hãy sao lưu dữ liệu lên GitHub.");
            }
        }).catch(() => { });

        return () => {
            cancelled = true;
        };
    }, []);

    return <>{children}</>;
};

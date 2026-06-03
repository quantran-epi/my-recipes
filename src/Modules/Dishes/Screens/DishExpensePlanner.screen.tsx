import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Typography } from "@components/Typography";
import { useScreenTitle } from "@hooks";
import { DishExpensePlannerWidget } from "@modules/Dishes/Screens/DishesManageIngredient/DishExpensePlanner.widget";
import { selectDishes } from "@store/Selectors";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import BudgetIcon from "../../../../assets/icons/budget.png";

export const DishExpensePlannerScreen = () => {
    useScreenTitle({ value: "Kế hoạch chi phí", deps: [] });
    const dishes = useSelector(selectDishes);
    const [searchParams] = useSearchParams();
    const initialDishId = searchParams.get("dish") ?? undefined;
    const initialTargetServings = Number(searchParams.get("servings"));
    const initialDish = useMemo(() => dishes.find(item => item.id === initialDishId), [dishes, initialDishId]);
    const normalizedInitialServings = isFinite(initialTargetServings) && initialTargetServings > 0 ? initialTargetServings : undefined;

    return <div data-testid="expense-planner-screen" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 20 }}>
        <Box style={{
            padding: "12px 14px",
            border: "1px solid #e6f4ff",
            borderRadius: 8,
            background: "#f7fbff",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <Image src={BudgetIcon} preview={false} width={24} />
                <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: "block", fontSize: 16, lineHeight: "22px" }}>
                        Kế hoạch chi phí
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                        Ước tính tiền cần mua thêm cho nhiều món theo khẩu phần và tồn kho hiện tại.
                    </Typography.Text>
                </div>
            </div>
        </Box>

        <DishExpensePlannerWidget
            initialDish={initialDish}
            initialTargetServings={normalizedInitialServings}
            allowDishSelection
        />
    </div>
}

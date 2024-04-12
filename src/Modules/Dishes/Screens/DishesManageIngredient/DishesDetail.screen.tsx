import { Button } from "@components/Button"
import { Divider } from "@components/Layout/Divider"
import { Stack } from "@components/Layout/Stack"
import { useScreenTitle } from "@hooks"
import { RootRoutes } from "@routing/RootRoutes"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { useMemo } from "react"
import { useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"
import { DishIngredientListWidget } from "./DishIngredientList.widget"
import { DishStepListWidget } from "./DishStepList.widget"

export const DishesDetailScreen = () => {
    const [params] = useSearchParams();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const currentDist = useMemo(() => {
        return dishes.find(e => e.id === params.get("dishes"));
    }, [params, dishes])
    const navigate = useNavigate();
    const { } = useScreenTitle({ value: "Chi tiết (" + currentDist.name + ")", deps: [currentDist] },);

    const _getDishesByIds = (ids: string[]) => {
        return dishes.filter(e => ids.includes(e.id));
    }

    return <React.Fragment>
        {currentDist.note && <Typography.Paragraph><Typography.Text strong>Ghi chú:</Typography.Text> {currentDist.note}</Typography.Paragraph>}

        {currentDist.includeDishes.length > 0 && <React.Fragment>
            <Divider orientation="left">Bao gồm món</Divider>
            <Stack wrap="wrap" gap={5}>
                {_getDishesByIds(currentDist.includeDishes).map(e =>
                    <Button size="small"
                        onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(e.id))}>{e.name}</Button>)}
            </Stack>
        </React.Fragment>}

        <Divider orientation="left">Danh sách nguyên liệu</Divider>
        <DishIngredientListWidget currentDist={currentDist} />

        <Divider orientation="left">Các bước thực hiện</Divider>
        <DishStepListWidget currentDist={currentDist} />
    </React.Fragment>
}

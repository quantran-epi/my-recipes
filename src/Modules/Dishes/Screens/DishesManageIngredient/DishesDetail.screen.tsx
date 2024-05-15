import { Button } from "@components/Button"
import { Divider } from "@components/Layout/Divider"
import { Stack } from "@components/Layout/Stack"
import { useScreenTitle } from "@hooks"
import { RootRoutes } from "@routing/RootRoutes"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"
import { DishIngredientListWidget } from "./DishIngredientList.widget"
import { DishStepListWidget } from "./DishStepList.widget"
import { Image } from "@components/Image"
import { Box } from "@components/Layout/Box"
import { test } from "@store/Reducers/DishesReducer"
import { Space } from "@components/Layout/Space"
import DishIcon from "../../../../../assets/icons/noodles.png"

export const DishesDetailScreen = () => {
    const [params] = useSearchParams();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const currentDist = useMemo(() => {
        return dishes.find(e => e.id === params.get("dishes"));
    }, [params, dishes])
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Chi tiết (" + currentDist.name + ")", deps: [currentDist] },);

    const _getDishesByIds = (ids: string[]) => {
        return dishes.filter(e => ids.includes(e.id));
    }

    useEffect(() => {
        dispatch(test());
    }, [])

    return <React.Fragment>
        {currentDist.image && <Box style={{
            borderRadius: 10,
            width: "100%",
            height: 150,
            backgroundImage: `url(${currentDist.image})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center"
        }}></Box>}

        {currentDist.note && <React.Fragment>
            <Divider orientation="left">Thông tin chung</Divider>
            <Typography.Paragraph><Typography.Text strong>Ghi chú:</Typography.Text> {currentDist.note}</Typography.Paragraph>
        </React.Fragment>}

        {currentDist.includeDishes.length > 0 && <React.Fragment>
            <Divider orientation="left">
                <Space>
                    <Image src={DishIcon} preview={false} width={28} />
                    Bao gồm mónada
                </Space>
            </Divider>
            <Stack wrap="wrap" gap={5}>
                {_getDishesByIds(currentDist.includeDishes).map(e =>
                    <Button
                        onClick={() => navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(e.id))}>{e.name}</Button>)}
            </Stack>
        </React.Fragment>}

        <Divider orientation="left">Danh sách nguyên liệuđâ</Divider>
        <DishIngredientListWidget currentDist={currentDist} />

        <Divider orientation="left">Các bước thực hiện</Divider>
        <DishStepListWidget currentDist={currentDist} />
    </React.Fragment>
}

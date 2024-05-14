import { Button } from "@components/Button"
import { Image } from "@components/Image"
import { Box } from "@components/Layout/Box"
import { Divider } from "@components/Layout/Divider"
import { Space } from "@components/Layout/Space"
import { Stack } from "@components/Layout/Stack"
import { Modal } from "@components/Modal"
import { useToggle } from "@hooks"
import { RootRoutes } from "@routing/RootRoutes"
import { Dishes } from "@store/Models/Dishes"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import NoodlesIcon from "../../../../../assets/icons/noodles.png"
import { DishIngredientListWidget } from "./DishIngredientList.widget"
import { DishStepListWidget } from "./DishStepList.widget"
import { test } from "@store/Reducers/DishesReducer"

type DishDetailWidgetProps = {
    dish: Dishes;
}

export const DishesDetailWidget: React.FunctionComponent<DishDetailWidgetProps> = (props) => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleDishesDetail = useToggle();
    const [currentIncludeDish, setCurrentIncludeDish] = useState<string>();
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(test());
    }, [])


    const _getDishesById = (id: string) => {
        return dishes.find(e => id === e.id);
    }

    const dish = useMemo(() => {
        return _getDishesById(currentIncludeDish);
    }, [currentIncludeDish, dishes])

    const _getDishesByIds = (ids: string[]) => {
        return dishes.filter(e => ids.includes(e.id));
    }

    const _showDish = (dish: Dishes) => {
        setCurrentIncludeDish(dish.id);
        toggleDishesDetail.show();
    }

    return <React.Fragment>
        {props.dish.image && <Box style={{
            borderRadius: 10,
            width: "100%",
            height: 150,
            backgroundImage: `url(${props.dish.image})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center"
        }}></Box>}

        {props.dish.note && <React.Fragment>
            <Divider orientation="left">Thông tin chung</Divider>
            <Typography.Paragraph><Typography.Text strong>Ghi chú:</Typography.Text> {props.dish.note}</Typography.Paragraph>
        </React.Fragment>}

        {props.dish.includeDishes.length > 0 && <React.Fragment>
            <Divider orientation="left">Bao gồm món</Divider>
            <Stack wrap="wrap" gap={5}>
                {_getDishesByIds(props.dish.includeDishes).map(e =>
                    <Button
                        onClick={() => _showDish(e)}>{e.name}</Button>)}
            </Stack>
        </React.Fragment>}

        <Divider orientation="left">Danh sách nguyên liệu</Divider>
        <DishIngredientListWidget currentDist={props.dish} />

        <Divider orientation="left">Các bước thực hiện</Divider>
        <DishStepListWidget currentDist={props.dish} />

        {currentIncludeDish && <Modal style={{ top: 50 }} open={toggleDishesDetail.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                {dish.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <DishesDetailWidget dish={dish} />
            </Box>
        </Modal>}
    </React.Fragment>
}

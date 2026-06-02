import { Button } from "@components/Button"
import { Image } from "@components/Image"
import { Box } from "@components/Layout/Box"
import { Divider } from "@components/Layout/Divider"
import { Space } from "@components/Layout/Space"
import { Stack } from "@components/Layout/Stack"
import { Modal } from "@components/Modal"
import { useToggle } from "@hooks"
import { Dishes } from "@store/Models/Dishes"
import { test } from "@store/Reducers/DishesReducer"
import { RootState } from "@store/Store"
import { Typography } from "antd"
import React, { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import NoodlesIcon from "../../../../../assets/icons/noodles.png"
import DietIcon from "../../../../../assets/icons/diet.png"
import VegetableIcon from "../../../../../assets/icons/vegetable.png"
import ProcessIcon from "../../../../../assets/icons/process.png"
import AnalysisIcon from "../../../../../assets/icons/analysis.png"
import { DishIngredientListWidget } from "./DishIngredientList.widget"
import { DishStepListWidget } from "./DishStepList.widget"
import { CookingSessionWidget } from "../CookingSession.widget"
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget"
import { FireOutlined, ShoppingCartOutlined } from "@ant-design/icons"
import { RootRoutes } from "@routing/RootRoutes"
import { DishCostEstimateWidget } from "./DishCostEstimate.widget"
import { DishImageWidget } from "./DishImage.widget"

type DishDetailWidgetProps = {
    dish: Dishes;
}

export const DishesDetailWidget: React.FunctionComponent<DishDetailWidgetProps> = (props) => {
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const navigate = useNavigate();
    const toggleDishesDetail = useToggle();
    const toggleCooking = useToggle();
    const toggleShoppingList = useToggle();
    const [currentIncludeDish, setCurrentIncludeDish] = useState<string>();

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
        {/* ── Shortcut actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Button
                type="primary"
                icon={<FireOutlined />}
                onClick={toggleCooking.show}
                block
            >
                Bắt đầu nấu
            </Button>
            <Button
                icon={<ShoppingCartOutlined />}
                onClick={toggleShoppingList.show}
                block
            >
                Tạo giỏ hàng
            </Button>
        </div>

        <DishImageWidget src={props.dish.image} height={150} borderRadius={10} />

        <DishCostEstimateWidget dish={props.dish} />

        {props.dish.note && <React.Fragment>
            <Divider orientation="left"><Space>
                <Image src={AnalysisIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thông tin chung
            </Space></Divider>
            <Typography.Paragraph><Typography.Text strong>Ghi chú:</Typography.Text> {props.dish.note}</Typography.Paragraph>
        </React.Fragment>}

        {props.dish.includeDishes.length > 0 && <React.Fragment>
            <Divider orientation="left"><Space>
                <Image src={DietIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Bao gồm món
            </Space></Divider>
            <Stack wrap="wrap" gap={5}>
                {_getDishesByIds(props.dish.includeDishes).map(e =>
                    <Button
                        onClick={() => _showDish(e)}>{e.name}</Button>)}
            </Stack>
        </React.Fragment>}

        <Divider orientation="left"><Space>
            <Image src={VegetableIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Danh sách nguyên liệu
        </Space></Divider>
        <DishIngredientListWidget currentDist={props.dish} />

        <Divider orientation="left"><Space>
            <Image src={ProcessIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Các bước thực hiện
        </Space></Divider>
        <DishStepListWidget currentDist={props.dish} />

        {currentIncludeDish && <Modal style={{ top: 50 }} open={toggleDishesDetail.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                {dish.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={null} zIndex={2200}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <DishesDetailWidget dish={dish} />
            </Box>
        </Modal>}

        <Modal
            open={toggleCooking.value}
            title={<Space><FireOutlined style={{ color: "#fa8c16" }} />{props.dish.name} — Bắt đầu nấu</Space>}
            destroyOnClose
            onCancel={toggleCooking.hide}
            footer={null}
            zIndex={2300}
        >
            <CookingSessionWidget dish={props.dish} onDone={toggleCooking.hide} />
        </Modal>

        <Modal
            open={toggleShoppingList.value}
            title={<Space><ShoppingCartOutlined />{props.dish.name} — Tạo lịch mua sắm</Space>}
            destroyOnClose
            onCancel={toggleShoppingList.hide}
            footer={null}
            zIndex={2300}
        >
            <ShoppingListAddWidget
                date={null}
                dishIds={[props.dish.id]}
                onDone={toggleShoppingList.hide}
                onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
            />
        </Modal>
    </React.Fragment>
}

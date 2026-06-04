import { AppstoreOutlined, HomeOutlined } from "@ant-design/icons";
import { Modal } from "@components/Modal";
import { useToggle } from "@hooks";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { removeAllSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { RootState } from "@store/Store"
import { FloatButton } from "antd"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { useLocation, useNavigate } from "react-router-dom"
import ShoppinglistIcon from "../../../../assets/icons/shoppingList.png"
import ListCheckIcon from "../../../../assets/icons/list-check.png"
import EraseIcon from "../../../../assets/icons/eraser.png"
import ShoppingListAddIcon from "../../../../assets/icons/shopping-cart-add.png"
import DishesIcon from "../../../../assets/icons/noodles.png";
import IngredientIcon from "../../../../assets/icons/vegetable.png";
import MealsIcon from "../../../../assets/icons/meals.png";
import BudgetIcon from "../../../../assets/icons/budget.png";
import { Space } from "@components/Layout/Space";
import { Image } from "@components/Image";
import { Popconfirm } from "@components/Popconfirm";
import { RootRoutes } from "@routing/RootRoutes";

type ScheduledMealToolkitWidgetProps = {
    onNavigate?: (href: string) => void;
}

const quickActionGroupStyle: React.CSSProperties = {
    insetBlockEnd: 104,
    insetInlineEnd: 16,
    zIndex: 960,
};

const floatIconStyle: React.CSSProperties = {
    marginBottom: 2,
};

export const ScheduledMealToolkitWidget: React.FC<ScheduledMealToolkitWidgetProps> = ({ onNavigate }) => {
    const selectedMeals = useSelector((state: RootState) => state.personal.scheduledMeal.selectedMeals);
    const toggle = useToggle();
    const toggleAddModal = useToggle();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const _navigate = (href: string) => {
        toggle.hide();
        if (onNavigate) {
            onNavigate(href);
            return;
        }
        if (location.pathname === href) return;
        React.startTransition(() => navigate(href));
    }

    const _onEraseSelected = () => {
        toggle.hide();
        dispatch(removeAllSelectedMeals());
    }

    const _onOpenAddShoppingList = () => {
        toggle.hide();
        toggleAddModal.show();
    }

    const _onAddShoppingListDone = () => {
        toggleAddModal.hide();
        toggle.hide();
    }

    return <React.Fragment>
        <FloatButton.Group style={quickActionGroupStyle} badge={selectedMeals.length > 0 ? { count: selectedMeals.length } : undefined} shape="circle"
            onClick={() => {
                if (toggle.value) toggle.hide();
                else toggle.show();
            }}
            open={toggle.value}
            trigger="click"
            tooltip="Mở nhanh"
            icon={selectedMeals.length > 0
                ? <Image preview={false} src={ListCheckIcon} width={20} style={floatIconStyle} />
                : <AppstoreOutlined />
            }>
            {selectedMeals.length > 0 && <Popconfirm title={"Bỏ chọn các thực đơn?"} onConfirm={_onEraseSelected}>
                <FloatButton tooltip="Bỏ chọn thực đơn" icon={<Image preview={false} src={EraseIcon} width={20} style={{ marginBottom: 4 }} />} />
            </Popconfirm>}
            {selectedMeals.length > 0 && <FloatButton tooltip={`Tạo lịch mua sắm (${selectedMeals.length})`} icon={<Image preview={false} src={ShoppingListAddIcon} width={20} style={floatIconStyle} />} onClick={_onOpenAddShoppingList} />}
            <FloatButton tooltip="Tổng quan" icon={<HomeOutlined />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.Root())} />
            <FloatButton tooltip="Món ăn" icon={<Image preview={false} src={DishesIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())} />
            <FloatButton tooltip="Nguyên liệu" icon={<Image preview={false} src={IngredientIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())} />
            <FloatButton tooltip="Mua sắm" icon={<Image preview={false} src={ShoppinglistIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())} />
            <FloatButton tooltip="Thực đơn" icon={<Image preview={false} src={MealsIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())} />
            <FloatButton tooltip="Kế hoạch chi phí" icon={<Image preview={false} src={BudgetIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ExpensePlanner())} />
        </FloatButton.Group>

        <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget
                date={null}
                scheduledMealIds={selectedMeals}
                onDone={_onAddShoppingListDone}
                onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
            />
        </Modal>
    </React.Fragment>
}

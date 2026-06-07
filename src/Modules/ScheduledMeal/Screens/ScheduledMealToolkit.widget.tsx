import { AppstoreOutlined } from "@ant-design/icons";
import { DeferredModalContent, Modal } from "@components/Modal";
import { useToggle } from "@hooks";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { removeAllSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { selectSelectedMeals } from "@store/Selectors"
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
import HouseIcon from "../../../../assets/icons/house.png";
import AnalysisIcon from "../../../../assets/icons/analysis.png";
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

const quickNavDescriptionCss = `
.quick-nav-float .ant-float-btn:not(.ant-float-btn-group-trigger) .ant-float-btn-body,
.quick-nav-float .ant-float-btn:not(.ant-float-btn-group-trigger) .ant-float-btn-content {
    position: relative;
    overflow: visible;
}
.quick-nav-float .ant-float-btn:not(.ant-float-btn-group-trigger) {
    overflow: visible;
}
.quick-nav-float .ant-float-btn:not(.ant-float-btn-group-trigger) .ant-float-btn-description {
    position: absolute;
    right: 46px;
    top: 50%;
    transform: translateY(-50%);
    max-width: 150px;
    padding: 4px 10px;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 999px;
    background: rgba(24,24,27,0.92);
    box-shadow: 0 8px 22px rgba(0,0,0,0.22);
    color: #fff;
    font-size: 12px;
    font-weight: 650;
    line-height: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
}
`;

export const ScheduledMealToolkitWidget: React.FC<ScheduledMealToolkitWidgetProps> = ({ onNavigate }) => {
    const selectedMeals = useSelector(selectSelectedMeals);
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
        <style>{quickNavDescriptionCss}</style>
        <FloatButton.Group className="quick-nav-float" style={quickActionGroupStyle} badge={selectedMeals.length > 0 ? { count: selectedMeals.length } : undefined} shape="circle"
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
                <FloatButton description="Bỏ chọn" tooltip="Bỏ chọn thực đơn" icon={<Image preview={false} src={EraseIcon} width={20} style={{ marginBottom: 4 }} />} />
            </Popconfirm>}
            {selectedMeals.length > 0 && <FloatButton description="Tạo lịch mua" tooltip={`Tạo lịch mua sắm (${selectedMeals.length})`} icon={<Image preview={false} src={ShoppingListAddIcon} width={20} style={floatIconStyle} />} onClick={_onOpenAddShoppingList} />}
            <FloatButton description="Tổng quan" tooltip="Tổng quan" icon={<Image preview={false} src={HouseIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.Root())} />
            <FloatButton description="Phân tích" tooltip="Phân tích dữ liệu" icon={<Image preview={false} src={AnalysisIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.Analytics())} />
            <FloatButton description="Món ăn" tooltip="Món ăn" icon={<Image preview={false} src={DishesIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.List())} />
            <FloatButton description="Nguyên liệu" tooltip="Nguyên liệu" icon={<Image preview={false} src={IngredientIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.List())} />
            <FloatButton description="Mua sắm" tooltip="Mua sắm" icon={<Image preview={false} src={ShoppinglistIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List())} />
            <FloatButton description="Thực đơn" tooltip="Thực đơn" icon={<Image preview={false} src={MealsIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List())} />
            <FloatButton description="Chi phí" tooltip="Kế hoạch chi phí" icon={<Image preview={false} src={BudgetIcon} width={20} style={floatIconStyle} />} onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ExpensePlanner())} />
        </FloatButton.Group>

        {toggleAddModal.value && <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <DeferredModalContent active={toggleAddModal.value}>
                <ShoppingListAddWidget
                    date={null}
                    scheduledMealIds={selectedMeals}
                    onDone={_onAddShoppingListDone}
                    onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                />
            </DeferredModalContent>
        </Modal>}
    </React.Fragment>
}

import { OrderedListOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Badge } from "@components/Badge";
import { Modal } from "@components/Modal";
import { useToggle } from "@hooks";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { removeAllSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { RootState } from "@store/Store"
import { FloatButton } from "antd"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import ShoppinglistIcon from "../../../../assets/icons/shoppingList.png"
import ListCheckIcon from "../../../../assets/icons/list-check.png"
import EraseIcon from "../../../../assets/icons/eraser.png"
import ShoppingListAddIcon from "../../../../assets/icons/shopping-cart-add.png"
import { Space } from "@components/Layout/Space";
import { Image } from "@components/Image";
import { useModal } from "@components/Modal/ModalProvider";
import { Popconfirm } from "@components/Popconfirm";

export const ScheduledMealToolkitWidget = () => {
    const selectedMeals = useSelector((state: RootState) => state.scheduledMeal.selectedMeals);
    const toggle = useToggle();
    const toggleAddModal = useToggle();
    const dispatch = useDispatch();

    const _onEraseSelected = () => {
        toggle.hide();
        dispatch(removeAllSelectedMeals());
    }

    const _onAddShoppingListDone = () => {
        toggleAddModal.hide();
        toggle.hide();
    }

    return <React.Fragment>
        {selectedMeals.length > 0 && <FloatButton.Group style={{ insetBlockEnd: 100 }} badge={{ count: selectedMeals.length }} shape="circle"
            onClick={() => {
                if (toggle.value) toggle.hide();
                else toggle.show();
            }}
            open={toggle.value}
            trigger="click"
            icon={<Image preview={false} src={ListCheckIcon} width={20} style={{ marginBottom: 2 }} />}>
            <Popconfirm title={"Bỏ chọn các thực đơn?"} onConfirm={_onEraseSelected}>
                <FloatButton icon={<Image preview={false} src={EraseIcon} width={20} style={{ marginBottom: 4 }} />} />
            </Popconfirm>
            <FloatButton icon={<Image preview={false} src={ShoppingListAddIcon} width={20} style={{ marginBottom: 2 }} />} onClick={toggleAddModal.show} />
        </FloatButton.Group>}

        <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget date={null} scheduledMealIds={selectedMeals} onDone={_onAddShoppingListDone} />
        </Modal>
    </React.Fragment>
}
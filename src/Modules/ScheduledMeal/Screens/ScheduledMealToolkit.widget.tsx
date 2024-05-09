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
import { Space } from "@components/Layout/Space";
import { Image } from "@components/Image";

export const ScheduledMealToolkitWidget = () => {
    const selectedMeals = useSelector((state: RootState) => state.scheduledMeal.selectedMeals);
    const toggle = useToggle();
    const toggleAddModal = useToggle();
    const dispatch = useDispatch();

    return <React.Fragment>
        {selectedMeals.length > 0 && <FloatButton.Group badge={{ count: selectedMeals.length }} shape="circle"
            onClick={() => {
                if (toggle.value) toggle.hide();
                else toggle.show();
            }}
            open={toggle.value}
            trigger="click"
            icon={<OrderedListOutlined />}>
            <FloatButton icon={<DeleteOutlined />} onClick={() => dispatch(removeAllSelectedMeals())} />
            <FloatButton icon={<PlusOutlined />} onClick={toggleAddModal.show} />
        </FloatButton.Group>}

        <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget date={null} scheduledMealIds={selectedMeals} onDone={toggleAddModal.hide} />
        </Modal>
    </React.Fragment>
}
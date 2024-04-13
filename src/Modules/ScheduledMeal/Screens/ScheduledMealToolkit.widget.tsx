import { OrderedListOutlined, PlusOutlined } from "@ant-design/icons";
import { Badge } from "@components/Badge";
import { Modal } from "@components/Modal";
import { useToggle } from "@hooks";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { RootState } from "@store/Store"
import { FloatButton } from "antd"
import React from "react"
import { useSelector } from "react-redux"

export const ScheduledMealToolkitWidget = () => {
    const selectedMeals = useSelector((state: RootState) => state.scheduledMeal.selectedMeals);
    const toggle = useToggle();
    const toggleAddModal = useToggle();

    return <React.Fragment>
        {selectedMeals.length > 0 && <FloatButton.Group badge={{ count: selectedMeals.length }} shape="circle"
            onClick={() => {
                if (toggle.value) toggle.hide();
                else toggle.show();
            }}
            open={toggle.value}
            trigger="click"
            icon={<OrderedListOutlined />}>
            <FloatButton icon={<PlusOutlined />} onClick={toggleAddModal.show} />
        </FloatButton.Group>}

        <Modal open={toggleAddModal.value} title="Thêm lịch mua sắm" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget date={null} scheduledMealIds={selectedMeals} onDone={toggleAddModal.hide} />
        </Modal>
    </React.Fragment>
}
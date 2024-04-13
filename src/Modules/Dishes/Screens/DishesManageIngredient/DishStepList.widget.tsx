import { DeleteOutlined, DoubleLeftOutlined, DoubleRightOutlined, HolderOutlined, QuestionCircleOutlined } from "@ant-design/icons"
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty"
import { Button } from "@components/Button"
import { Dropdown } from "@components/Dropdown"
import { Form } from "@components/Form"
import { Stack } from "@components/Layout/Stack"
import { List } from "@components/List"
import { Modal } from "@components/Modal"
import { useModal } from "@components/Modal/ModalProvider"
import { useSmartForm } from "@components/SmartForm"
import { Tooltip } from "@components/Tootip"
import { useToggle } from "@hooks"
import { Dishes, DishesStep } from "@store/Models/Dishes"
import { DishStepAddType, DishesStepAddParams, removeStepsFromDish } from "@store/Reducers/DishesReducer"
import { Typography } from "antd"
import React, { FunctionComponent, useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { DishesAddStepWidget } from "./DishAddStep.widget"
import { sortBy } from "lodash"

type DishStepListWidgetProps = {
    currentDist: Dishes;
}

export const DishStepListWidget: FunctionComponent<DishStepListWidgetProps> = (props) => {
    const toggleAddStepToDishes = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const [currentOrder, setCurrentOrder] = useState<number>();
    const [addType, setAddType] = useState<DishStepAddType>();

    const addStepForm = useSmartForm<DishesStepAddParams>({
        defaultValues: {
            dishId: "",
            steps: []
        },
        itemDefinitions: defaultValues => ({
            dishId: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.dishId), noMarkup: true },
            steps: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.steps), noMarkup: true },
        })
    })

    const _onAddStep = () => {
        setCurrentOrder(0);
        setAddType("default");
        toggleAddStepToDishes.show();
    }

    const _onAddStepNext = (order: number) => {
        setCurrentOrder(order);
        setAddType("next");
        toggleAddStepToDishes.show();
    }

    const _onAddStepPrev = (order: number) => {
        setCurrentOrder(order);
        setAddType("prev");
        toggleAddStepToDishes.show();
    }

    const _onDeleteStep = (dish: Dishes, step: DishesStep) => {
        dispatch(removeStepsFromDish({
            dishId: dish.id,
            steps: [step]
        }))
    }

    useEffect(() => {
        if (!props.currentDist) return;
        addStepForm.form.setFieldsValue({
            dishId: props.currentDist.id,
            steps: props.currentDist.steps
        });
    }, [props.currentDist])

    return <Form {...addStepForm.defaultProps}>
        <Button fullwidth onClick={_onAddStep}>Thêm bước</Button>
        <List
            dataSource={sortBy(props.currentDist.steps, [step => step.order])}
            renderItem={(item) => <StepItem
                step={item}
                dish={props.currentDist}
                onDelete={_onDeleteStep}
                onAddNext={_onAddStepNext}
                onAddPrev={_onAddStepPrev} />} />

        <Modal open={toggleAddStepToDishes.value} title={<Stack gap={0} direction="column" align="flex-start">
            <Typography.Title level={5} style={{ margin: 0 }}>Thêm bước</Typography.Title>
            <Typography.Text type="secondary">{props.currentDist.name}</Typography.Text>
        </Stack>} destroyOnClose={true} onCancel={toggleAddStepToDishes.hide} footer={null}>
            <DishesAddStepWidget dish={props.currentDist} currentOrder={currentOrder} addType={addType} onDone={(addType) => {
                if (addType !== "default") toggleAddStepToDishes.hide();
            }} />
        </Modal>
    </Form>
}

type StepItemProps = {
    dish: Dishes;
    step: DishesStep;
    onDelete: (dish: Dishes, step: DishesStep) => void;
    onAddPrev: (order: number) => void;
    onAddNext: (order: number) => void;
}

export const StepItem: React.FunctionComponent<StepItemProps> = (props) => {
    const modal = useModal();

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "add_next": props.onAddNext(props.step.order); break;
            case "add_prev": props.onAddPrev(props.step.order); break;
            case "remove": modal.confirm({
                content: "Xóa?",
                okText: "Xóa",
                cancelText: "Hủy",
                centered: true,
                onOk: () => {
                    props.onDelete(props.dish, props.step)
                }
            });
                break;
        }
    }

    return <React.Fragment>
        <List.Item
            actions={[
                !props.step.required && <Tooltip title="Tùy chọn">
                    <Button size="small" type="text" icon={<QuestionCircleOutlined style={{ color: "orange" }} />} />
                </Tooltip>,
                <Dropdown menu={{
                    items: [
                        {
                            label: 'Thêm vào trước',
                            key: 'add_prev',
                            icon: <DoubleLeftOutlined />,
                        },
                        {
                            label: 'Thêm vào sau',
                            key: 'add_next',
                            icon: <DoubleRightOutlined />,
                        },
                        {
                            label: 'Xóa',
                            key: 'remove',
                            icon: <DeleteOutlined />,
                            danger: true,
                        },
                    ],
                    onClick: _onMoreActionClick
                }} placement="bottom">
                    <Button size="small" icon={<HolderOutlined />} />
                </Dropdown>
            ]}>
            <Typography.Paragraph style={{ maxWidth: 250 }} ellipsis={{ rows: 3, expandable: true, symbol: "Xem thêm" }}>
                {props.step.content}
            </Typography.Paragraph>
        </List.Item>
    </React.Fragment >
}

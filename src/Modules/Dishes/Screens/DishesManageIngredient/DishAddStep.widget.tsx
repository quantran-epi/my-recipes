import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { TextArea } from "@components/Form/Input";
import { Switch } from "@components/Form/Switch";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Dishes, DishesStep } from "@store/Models/Dishes";
import { DishStepAddType, adStepToDishPrev, addStepToDishNext, addStepsToDish } from "@store/Reducers/DishesReducer";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

type DishesAddStepWidgetProps = {
    dish: Dishes;
    onDone?: (addType: DishStepAddType) => void;
    currentOrder: number;
    addType: DishStepAddType;
}

export const DishesAddStepWidget: React.FunctionComponent<DishesAddStepWidgetProps> = (props) => {
    const dispatch = useDispatch();
    const message = useMessage();

    const addStepToDishForm = useSmartForm<Omit<DishesStep, "order">>({
        defaultValues: {
            id: "",
            content: "",
            isDone: false,
            required: true
        },
        onSubmit: (values) => {
            switch (props.addType) {
                case "next": dispatch(addStepToDishNext({
                    dishId: props.dish.id,
                    steps: [values.transformValues],
                    order: props.currentOrder
                }));
                    props.onDone("next");
                    break;
                case "prev": dispatch(adStepToDishPrev({
                    dishId: props.dish.id,
                    steps: [values.transformValues],
                    order: props.currentOrder
                }));
                    props.onDone("prev");
                    break;
                default: dispatch(addStepsToDish({
                    dishId: props.dish.id,
                    steps: [values.transformValues]
                }));
                    props.onDone("default");
            }
            message.success();
            addStepToDishForm.reset();

        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            content: { label: "Nội dung", name: ObjectPropertyHelper.nameof(defaultValues, e => e.content) },
            isDone: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isDone), noMarkup: true },
            required: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.required), valuePropName: "checked" }
        }),
        transformFunc: (values) => ({
            ...values,
            id: props.dish.id + "-st-" + nanoid(2)
        })
    })

    const _onSave = () => {
        addStepToDishForm.submit();
    }

    return <SmartForm {...addStepToDishForm.defaultProps}>
        <SmartForm.Item {...addStepToDishForm.itemDefinitions.content}>
            <TextArea placeholder="Nhập nội dung" rows={5} />
        </SmartForm.Item>
        <SmartForm.Item {...addStepToDishForm.itemDefinitions.required}>
            <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
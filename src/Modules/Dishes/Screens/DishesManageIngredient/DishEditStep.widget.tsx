import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { TextArea } from "@components/Form/Input";
import { Switch } from "@components/Form/Switch";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Dishes, DishesStep } from "@store/Models/Dishes";
import { editStepFromDish } from "@store/Reducers/DishesReducer";
import { useDispatch } from "react-redux";

type DishesEditStepWidgetProps = {
    dish: Dishes;
    item: DishesStep;
    onDone: () => void;
}

export const DishesEditStepWidget: React.FunctionComponent<DishesEditStepWidgetProps> = (props) => {
    const dispatch = useDispatch();
    const message = useMessage();

    const editStepToDishForm = useSmartForm<DishesStep>({
        defaultValues: props.item,
        onSubmit: (values) => {
            dispatch(editStepFromDish({ dishId: props.dish.id, step: values.transformValues }));
            message.success();
            editStepToDishForm.reset();
            props.onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            content: { label: "Nội dung", name: ObjectPropertyHelper.nameof(defaultValues, e => e.content) },
            isDone: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isDone), noMarkup: true },
            order: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.order), noMarkup: true },
            required: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.required), valuePropName: "checked" }
        }),
    })

    const _onSave = () => {
        editStepToDishForm.submit();
    }

    return <SmartForm {...editStepToDishForm.defaultProps}>
        <SmartForm.Item {...editStepToDishForm.itemDefinitions.content}>
            <TextArea placeholder="Nhập nội dung" rows={5} />
        </SmartForm.Item>
        <SmartForm.Item {...editStepToDishForm.itemDefinitions.required}>
            <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
        </SmartForm.Item>
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}
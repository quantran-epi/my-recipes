import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { TextArea } from "@components/Form/Input";
import { Switch } from "@components/Form/Switch";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Dishes, DishesStep, DishDurationPhaseKey } from "@store/Models/Dishes";
import { editStepFromDish } from "@store/Reducers/DishesReducer";
import { useDispatch } from "react-redux";
import { StepPhaseTimerFields, StepPhaseTimerFieldsHelper } from "./StepPhaseTimerFields";

type DishesEditStepWidgetProps = {
    dish: Dishes;
    item: DishesStep;
    onDone: () => void;
}

export const DishesEditStepWidget: React.FunctionComponent<DishesEditStepWidgetProps> = (props) => {
    const dispatch = useDispatch();
    const message = useMessage();

    const editStepToDishForm = useSmartForm<DishesStep>({
        defaultValues: {
            ...props.item,
            phaseKey: props.item.phaseKey,
            timerMinutes: props.item.timerMinutes,
            unattended: props.item.unattended ?? false,
        },
        onSubmit: (values) => {
            const normalized = StepPhaseTimerFieldsHelper.normalizeStep(values.transformValues);
            dispatch(editStepFromDish({ dishId: props.dish.id, step: normalized as DishesStep }));
            message.success("Đã lưu bước nấu");
            editStepToDishForm.reset();
            props.onDone();
        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            content: { label: "Nội dung", name: ObjectPropertyHelper.nameof(defaultValues, e => e.content) },
            isDone: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isDone), noMarkup: true },
            order: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.order), noMarkup: true },
            required: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.required), valuePropName: "checked" },
            phaseKey: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.phaseKey), noMarkup: true },
            timerMinutes: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.timerMinutes), noMarkup: true },
            unattended: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.unattended), noMarkup: true },
        }),
    })

    const phaseKey = SmartForm.useWatch("phaseKey", editStepToDishForm.form);
    const timerMinutes = SmartForm.useWatch("timerMinutes", editStepToDishForm.form);
    const unattended = SmartForm.useWatch("unattended", editStepToDishForm.form);

    const _onPhaseChange = (key?: DishDurationPhaseKey) => editStepToDishForm.form.setFieldsValue({ phaseKey: key });
    const _onTimerChange = (minutes?: number) => {
        editStepToDishForm.form.setFieldsValue({
            timerMinutes: minutes,
            unattended: !minutes ? false : unattended,
        });
    }
    const _onUnattendedChange = (value: boolean) => editStepToDishForm.form.setFieldsValue({ unattended: value });

    const _onSave = () => {
        editStepToDishForm.submit();
    }

    return <SmartForm {...editStepToDishForm.defaultProps}>
        <SmartForm.Item {...editStepToDishForm.itemDefinitions.content}>
            <TextArea placeholder="Nhập nội dung" rows={4} />
        </SmartForm.Item>
        <SmartForm.Item {...editStepToDishForm.itemDefinitions.required}>
            <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
        </SmartForm.Item>
        <StepPhaseTimerFields
            phaseKey={phaseKey}
            timerMinutes={timerMinutes}
            unattended={Boolean(unattended)}
            onPhaseChange={_onPhaseChange}
            onTimerChange={_onTimerChange}
            onUnattendedChange={_onUnattendedChange}
            dish={props.dish}
            currentStepId={props.item.id}
        />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}

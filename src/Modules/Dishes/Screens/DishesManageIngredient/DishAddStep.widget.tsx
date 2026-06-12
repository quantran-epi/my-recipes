import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Input, TextArea } from "@components/Form/Input";
import { Switch } from "@components/Form/Switch";
import { Stack } from "@components/Layout/Stack";
import { useMessage } from "@components/Message";
import { SmartForm, useSmartForm } from "@components/SmartForm";
import { Dishes, DishesStep, DishDurationPhaseKey } from "@store/Models/Dishes";
import { DishStepAddType, adStepToDishPrev, addStepToDishNext, addStepsToDish } from "@store/Reducers/DishesReducer";
import { nanoid } from "nanoid";
import { useDispatch } from "react-redux";
import { StepPhaseTimerFields } from "./StepPhaseTimerFields";

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
            required: true,
            phaseKey: undefined,
            timerMinutes: undefined,
            unattended: false,
        },
        onSubmit: (values) => {
            const payload = normalizeStepValues(values.transformValues);
            switch (props.addType) {
                case "next": dispatch(addStepToDishNext({
                    dishId: props.dish.id,
                    steps: [payload],
                    order: props.currentOrder
                }));
                    props.onDone("next");
                    break;
                case "prev": dispatch(adStepToDishPrev({
                    dishId: props.dish.id,
                    steps: [payload],
                    order: props.currentOrder
                }));
                    props.onDone("prev");
                    break;
                default: dispatch(addStepsToDish({
                    dishId: props.dish.id,
                    steps: [payload]
                }));
                    props.onDone("default");
            }
            message.success("Đã thêm bước nấu");
            addStepToDishForm.reset();

        },
        itemDefinitions: defaultValues => ({
            id: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.id), noMarkup: true },
            content: { label: "Nội dung", name: ObjectPropertyHelper.nameof(defaultValues, e => e.content) },
            isDone: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.isDone), noMarkup: true },
            required: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.required), valuePropName: "checked" },
            phaseKey: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.phaseKey), noMarkup: true },
            timerMinutes: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.timerMinutes), noMarkup: true },
            unattended: { name: ObjectPropertyHelper.nameof(defaultValues, e => e.unattended), noMarkup: true },
        }),
        transformFunc: (values) => ({
            ...values,
            id: props.dish.id + "-st-" + nanoid(2)
        })
    })

    const phaseKey = SmartForm.useWatch("phaseKey", addStepToDishForm.form);
    const timerMinutes = SmartForm.useWatch("timerMinutes", addStepToDishForm.form);
    const unattended = SmartForm.useWatch("unattended", addStepToDishForm.form);

    const _onPhaseChange = (key?: DishDurationPhaseKey) => addStepToDishForm.form.setFieldsValue({ phaseKey: key });
    const _onTimerChange = (minutes?: number) => {
        addStepToDishForm.form.setFieldsValue({
            timerMinutes: minutes,
            unattended: !minutes ? false : unattended,
        });
    }
    const _onUnattendedChange = (value: boolean) => addStepToDishForm.form.setFieldsValue({ unattended: value });

    const _onSave = () => {
        addStepToDishForm.submit();
    }

    return <SmartForm {...addStepToDishForm.defaultProps}>
        <SmartForm.Item {...addStepToDishForm.itemDefinitions.content}>
            <TextArea placeholder="Nhập nội dung" rows={4} />
        </SmartForm.Item>
        <SmartForm.Item {...addStepToDishForm.itemDefinitions.required}>
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
        />
        <Stack fullwidth justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </SmartForm>
}

// Strip empty timer/unattended/phase before persisting so older clients see undefined fields.
const normalizeStepValues = <T extends Partial<DishesStep>>(values: T): T => {
    const next = { ...values };
    if (!next.phaseKey) delete next.phaseKey;
    if (!next.timerMinutes || next.timerMinutes < 1) {
        delete next.timerMinutes;
        delete next.unattended;
    } else {
        next.timerMinutes = Math.min(600, Math.round(next.timerMinutes));
        if (!next.unattended) delete next.unattended;
    }
    return next;
}

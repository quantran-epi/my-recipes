import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { Button } from "@components/Button";
import { Form } from "@components/Form";
import { InputNumber } from "@components/Form/InputNumber";
import { Option, Select } from "@components/Form/Select";
import { Stack } from "@components/Layout/Stack";
import { SmartForm, useSmartForm } from "@components/SmartForm"
import { DishDuration, Dishes } from "@store/Models/Dishes";
import { DishesDurationEditParams } from "@store/Reducers/DishesReducer";
import { FunctionComponent, useEffect, useState } from "react"

type DishDurationWidgetProps = {
    dish: Dishes;
    onSave: (value: DishesDurationEditParams) => void;
}

export const DishDurationWidget: FunctionComponent<DishDurationWidgetProps> = (props) => {
    const [disableFields, setDisabledFields] = useState<string[]>([]);

    const _isDisable = (field: string) => {
        return disableFields.includes(field);
    }

    const durationForm = useSmartForm<DishDuration>({
        defaultValues: props.dish.duration,
        layout: "horizontal",
        onSubmit: (values) => {
            props.onSave({ dishId: props.dish.id, duration: values.transformValues });
        },
        itemDefinitions: (defaultValues) => ({
            unfreeze: { label: "Rã đông", name: ObjectPropertyHelper.nameof(defaultValues, e => e.unfreeze) },
            prepare: { label: "Sơ chế", name: ObjectPropertyHelper.nameof(defaultValues, e => e.prepare) },
            cooking: { label: "Nấu nướng", name: ObjectPropertyHelper.nameof(defaultValues, e => e.cooking) },
            serve: { label: "Trình bày", name: ObjectPropertyHelper.nameof(defaultValues, e => e.serve) },
            cooldown: { label: "Để nguội", name: ObjectPropertyHelper.nameof(defaultValues, e => e.cooldown) },
        })
    });

    const _onToggleDisable = (value: "none" | "min", field: string) => {
        switch (value) {
            case "min": setDisabledFields(disableFields.filter(e => e !== field)); break;
            case "none":
                setDisabledFields([...disableFields, field]);
                durationForm.form.setFieldsValue({ [field]: null });
                break;
        }
    }

    const _onSave = () => {
        durationForm.submit();
    }

    useEffect(() => {
        setDisabledFields(Object.entries(props.dish.duration).filter(e => e[1] === null).map(e => e[0]));
    }, [props.dish])

    return <Form
        labelCol={{ xs: 10 }}
        wrapperCol={{ xs: 14 }}
        {...durationForm.defaultProps}>
        <Form.Item {...durationForm.itemDefinitions.unfreeze}>
            <InputNumber disabled={_isDisable("unfreeze")} min={0} addonAfter={<Select defaultValue={props.dish.duration.unfreeze === null ? "none" : "min"} onChange={(value) => _onToggleDisable(value, "unfreeze")} style={{ width: 100 }}>
                <Option value="min">phút</Option>
                <Option value="none">none</Option>
            </Select>} />
        </Form.Item>
        <SmartForm.Item {...durationForm.itemDefinitions.prepare}>
            <InputNumber disabled={_isDisable("prepare")} min={0} addonAfter={<Select defaultValue={props.dish.duration.prepare === null ? "none" : "min"} onChange={(value) => _onToggleDisable(value, "prepare")} style={{ width: 100 }}>
                <Option value="min">phút</Option>
                <Option value="none">none</Option>
            </Select>} />
        </SmartForm.Item>
        <SmartForm.Item {...durationForm.itemDefinitions.cooking}>
            <InputNumber disabled={_isDisable("cooking")} min={0} addonAfter={<Select defaultValue={props.dish.duration.cooking === null ? "none" : "min"} onChange={(value) => _onToggleDisable(value, "cooking")} style={{ width: 100 }}>
                <Option value="min">phút</Option>
                <Option value="none">none</Option>
            </Select>} />
        </SmartForm.Item>
        <SmartForm.Item {...durationForm.itemDefinitions.serve}>
            <InputNumber disabled={_isDisable("serve")} min={0} addonAfter={<Select defaultValue={props.dish.duration.serve === null ? "none" : "min"} onChange={(value) => _onToggleDisable(value, "serve")} style={{ width: 100 }}>
                <Option value="min">phút</Option>
                <Option value="none">none</Option>
            </Select>} />
        </SmartForm.Item>
        <SmartForm.Item {...durationForm.itemDefinitions.cooldown}>
            <InputNumber disabled={_isDisable("cooldown")} min={0} addonAfter={<Select defaultValue={props.dish.duration.cooldown === null ? "none" : "min"} onChange={(value) => _onToggleDisable(value, "cooldown")} style={{ width: 100 }}>
                <Option value="min">phút</Option>
                <Option value="none">none</Option>
            </Select>} />
        </SmartForm.Item>

        <Stack justify="flex-end">
            <Button onClick={_onSave}>Lưu</Button>
        </Stack>
    </Form>
}
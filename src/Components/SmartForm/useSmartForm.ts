import { Form, FormInstance } from "antd";
import { SmartFormProps } from "./SmartForm.types";
import { SmartFormItemProps } from "./SmartFormItem/SmartFormItem.types";
import { isEqual } from "lodash";
import { useState } from "react";
import { FormLayout } from "antd/es/form/Form";
import { InternalNamePath } from "antd/es/form/interface";

type ErrorField = {
    name: InternalNamePath;
    errors: string[];
}

type FormValues<T, TSubmit> = {
    values: T;
    transformValues: TSubmit;
}

export type UseSmartForm<T = any, TSubmit = any> = {
    form: FormInstance<T>;
    defaultValues: T;
    submit: () => void;
    reset: () => void;
    getValues: () => T;
    getTransformValues: () => TSubmit;
    transform: (values: Partial<T>) => TSubmit;
    submittedValues: TSubmit;
    defaultProps: SmartFormProps;
    itemDefinitions: Record<keyof T, SmartFormItemProps>;
    isDirty: () => boolean;
}

type UseSmartFormProps<T = any, TSubmit = any> = {
    defaultValues: T;
    onSubmit?: (submitValues: FormValues<T, TSubmit>, isValuesChanged: boolean, errors: ErrorField[], previousSubmitedValues: TSubmit) => void;
    itemDefinitions: (defaultValues: T) => Record<keyof T, SmartFormItemProps>;
    validator?: (values: T) => boolean;
    transformFunc?: (values: T) => TSubmit;
    submitOnEnter?: boolean;
    layout?: FormLayout;
}

export const useSmartForm = <T, TSubmit = T>(props: UseSmartFormProps<T, TSubmit>): UseSmartForm<T, TSubmit> => {
    const [form] = Form.useForm<T>();

    const isDirty = () => {
        return isEqual(getValues(), props.defaultValues);
    }

    const getValues = () => {
        return Object.keys(form.getFieldsValue()).length > 0 ? form.getFieldsValue() : props.defaultValues;
    }

    const getTransformValues = () => {
        return _getTransformValues(getValues());
    }

    const _getTransformValues = (values: Partial<T>): TSubmit => {
        let keys = Object.keys(props.defaultValues);
        let includedKeys = Object.entries(values).filter(e => keys.includes(e[0]));
        let valuesToTransform = {} as T;
        includedKeys.forEach(e => {
            valuesToTransform[e[0]] = e[1];
        })
        return props.transformFunc ? props.transformFunc(valuesToTransform) : valuesToTransform as unknown as TSubmit;
    }

    const [submittedValues, setSubmittedValues] = useState<TSubmit>(_getTransformValues(getValues()));

    const submit = () => {
        form.submit();
    }

    const reset = () => {
        form.resetFields();
        setSubmittedValues(_getTransformValues(getValues()));
    }

    const _onKeyUp = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === "Enter" && props.submitOnEnter) submit();
    }

    const _onFormFinish = (values: T) => {
        let transformValues = _getTransformValues(values);
        let isEqualPreviousValues = isEqual(transformValues, submittedValues);
        if (props.onSubmit) props.onSubmit({ transformValues: transformValues, values: values }, !isEqualPreviousValues, [], submittedValues);
        setSubmittedValues(Object.assign({}, transformValues));
    }

    const _onFormFinishFailed = (errInfo) => {
        let transformValues = _getTransformValues(errInfo.values);
        let isEqualPreviousValues = isEqual(transformValues, submittedValues);
        if (props.onSubmit) props.onSubmit({ transformValues: transformValues, values: errInfo.values }, !isEqualPreviousValues, errInfo.errorFields, submittedValues);
    }

    return {
        isDirty,
        submit,
        reset,
        form: form,
        defaultValues: props.defaultValues,
        getValues,
        getTransformValues,
        transform: _getTransformValues,
        submittedValues,
        defaultProps: {
            itemDefinitions: props.itemDefinitions(props.defaultValues),
            layout: props.layout || "vertical",
            form: form,
            initialValues: props.defaultValues,
            onKeyUp: _onKeyUp,
            onFinish: _onFormFinish,
            onFinishFailed: _onFormFinishFailed
        },
        itemDefinitions: props.itemDefinitions(props.defaultValues)
    }
}
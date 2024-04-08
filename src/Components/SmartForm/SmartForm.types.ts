import { Form as AntForm, FormProps as AntFormProps } from "antd";
import { SmartFormItemCompoundComponent } from "./SmartFormItem/SmartFormItem.types";
import { UseSmartForm } from "./useSmartForm";

export type SmartFormProps = Omit<AntFormProps, "children"> & {
    children?: AntFormProps["children"] & React.ReactNode;
    itemDefinitions: UseSmartForm["itemDefinitions"];
}

export type SmartFormCompoundComponent = React.FunctionComponent<SmartFormProps> & {
    Item: SmartFormItemCompoundComponent;
    useForm: typeof AntForm.useForm;
    useFormInstance: typeof AntForm.useFormInstance;
    useWatch: typeof AntForm.useWatch;
}
import { FormItemProps as AntFormItemProps, Form as AntForm } from "antd";
import useFormItemStatus from "antd/es/form/hooks/useFormItemStatus";

export type SmartFormItemProps = AntFormItemProps & {
    noMarkup?: boolean;
}

export type SmartFormItemCompoundComponent = React.FunctionComponent<SmartFormItemProps> & {
    useStatus: typeof AntForm.Item.useStatus;
}
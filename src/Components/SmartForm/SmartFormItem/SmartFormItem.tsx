import { Form as AntForm } from "antd";
import { SmartFormItemCompoundComponent } from "./SmartFormItem.types";

export const SmartFormItem: SmartFormItemCompoundComponent = ({
    ...antFormItemProps
}) => {
    return <AntForm.Item {...antFormItemProps} />
}

SmartFormItem.useStatus = AntForm.Item.useStatus;
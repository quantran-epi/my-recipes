import { Form as AntForm } from "antd";
import { SmartFormCompoundComponent } from "./SmartForm.types";
import { SmartFormItem } from "./SmartFormItem/SmartFormItem";

export const SmartForm: SmartFormCompoundComponent = ({
    itemDefinitions,
    children,
    ...antFormProps
}) => {
    const _renderNoMarkUpFormItems = () => {
        return Object.entries(itemDefinitions)
            .filter(definition => definition[1].noMarkup)
            .map((definition, index) => <SmartForm.Item key={index} noStyle {...definition[1]} />)
    }

    return <AntForm {...antFormProps}>
        {_renderNoMarkUpFormItems()}
        {children}
    </AntForm>
}

SmartForm.Item = SmartFormItem;
SmartForm.useForm = AntForm.useForm;
SmartForm.useWatch = AntForm.useWatch;
SmartForm.useFormInstance = AntForm.useFormInstance;

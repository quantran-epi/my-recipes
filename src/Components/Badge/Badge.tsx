import { FunctionComponent } from "react";
import { Badge as AntBadge, BadgeProps as AntBadgeProps } from 'antd';

export interface IBadgeProps extends AntBadgeProps {

}

export const Badge: FunctionComponent<IBadgeProps> = (props) => {
    return <AntBadge {...props} />
}
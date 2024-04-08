import { Form as AntForm, FormProps as AntFormProps, FormItemProps as AntFormItemProps } from 'antd';

export const Form = AntForm;

type FormProps<T> = AntFormProps<T>;
type FormItemProps<T> = AntFormItemProps<T> & {
    loadErrorMessage?: string;
    onReload?: () => void;
};

export type {
    FormProps,
    FormItemProps
}
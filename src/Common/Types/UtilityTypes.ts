import { Dayjs } from "dayjs";

export type YesNoValueType = "Y" | "N";

export type Nullable<T> = T | null;

export type TrueFalseValue = "0" | "1" | true | false;

export type DateValue = Dayjs | string;

export type ComboboxSelectAllValue = "%" | "";

export type ComboboxValueType<T = undefined> = ComboboxSelectAllValue | (T extends undefined ? string | number : T);

export type OptionKeyValuePair = {
    value: ComboboxValueType;
    name: string;
}

export type BaseScreenProps = {
    visible?: boolean;
}
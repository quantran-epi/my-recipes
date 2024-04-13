import { updateCurrentFeatureName } from "@store/Reducers/AppContextReducer";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

type UseScreenTitleProps = {
    value: string;
    deps: any[];
}

export type UseScreenTitle = {

}

export const useScreenTitle = (props?: UseScreenTitleProps): UseScreenTitle => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(updateCurrentFeatureName(props.value));
        return () => {
            dispatch(updateCurrentFeatureName(""));
        }
    }, props.deps)
    return {}
}
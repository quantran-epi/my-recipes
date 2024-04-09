import { updateCurrentFeatureName } from "@store/Reducers/AppContextReducer";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

type UseScreenTitleProps = {
    value: string;
}

export type UseScreenTitle = {

}

export const useScreenTitle = (props?: UseScreenTitleProps): UseScreenTitle => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(updateCurrentFeatureName("Ingredient List"));
        return () => {
            dispatch(updateCurrentFeatureName(""));
        }
    }, [])
    return {}
}
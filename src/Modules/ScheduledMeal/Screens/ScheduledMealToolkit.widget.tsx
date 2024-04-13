import { RootState } from "@store/Store"
import { FloatButton } from "antd"
import React from "react"
import { useSelector } from "react-redux"

export const ScheduledMealToolkitWidget = () => {
    const selectedMeals = useSelector((state: RootState) => state.scheduledMeal.selectedMeals);

    return <React.Fragment>
        {selectedMeals.length > 0 && <FloatButton.Group shape="circle">
            <FloatButton badge={{ count: selectedMeals.length }} />
        </FloatButton.Group>}
    </React.Fragment>
}
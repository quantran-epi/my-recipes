import moment from "moment"

export const DateHelpers = {
    calculateDaysBetween: (from: any, to: any): number => {
        return moment(to).startOf("day").diff(moment(from).startOf("day"), "days");
    }
}
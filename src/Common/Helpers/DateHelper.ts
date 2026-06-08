import moment from "moment"

const weekdayPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;

const capitalizeMatch = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export const DateHelpers = {
    calculateDaysBetween: (from: any, to: any): number => {
        return moment(to).startOf("day").diff(moment(from).startOf("day"), "days");
    },
    capitalizeWeekdayLabel: (value: string): string => {
        return value.replace(weekdayPattern, capitalizeMatch);
    },
    formatWithCapitalizedWeekday: (value: any, format: string): string => {
        return DateHelpers.capitalizeWeekdayLabel(moment(value).format(format));
    }
}

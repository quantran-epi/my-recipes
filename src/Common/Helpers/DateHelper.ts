import moment from "moment"

const weekdayPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi;
const weekdayPresencePattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i;

const capitalizeMatch = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
const capitalizeFirstCharacter = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const DateHelpers = {
    calculateDaysBetween: (from: any, to: any): number => {
        return moment(to).startOf("day").diff(moment(from).startOf("day"), "days");
    },
    capitalizeWeekdayLabel: (value: string): string => {
        const formatted = value.replace(weekdayPattern, capitalizeMatch);
        return capitalizeFirstCharacter(weekdayPresencePattern.test(value) ? formatted : value);
    },
    formatWithCapitalizedWeekday: (value: any, format: string): string => {
        return DateHelpers.capitalizeWeekdayLabel(moment(value).format(format));
    }
}

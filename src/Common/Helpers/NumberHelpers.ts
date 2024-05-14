export const NumberHelpers = {
    isBetween: (value: number, from: number, to: number, include = true) => {
        return include ? (value >= from && value <= to) : (value > from && value < to);
    }
}
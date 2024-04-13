export const ObjectPropertyHelper = {
    nameof<T>(obj: T, expression: (x: { [Property in keyof T]: () => string }) => () => string): string {
        const res: { [Property in keyof T]: () => string } = {} as { [Property in keyof T]: () => string };
        Object.keys(obj).map(k => res[k as keyof T] = () => k);
        return expression(res)();
    }
}
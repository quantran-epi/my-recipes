export const ObjectPropertyHelper = {
    nameof<T>(obj: T, expression: (x: { [Property in keyof T]: () => string }) => () => string): string {
        void obj;
        const res = new Proxy({}, {
            get: (_target, property) => () => String(property),
        }) as { [Property in keyof T]: () => string };
        return expression(res)();
    }
}

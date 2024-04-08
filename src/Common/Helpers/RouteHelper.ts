export const RouteHelpers = {
    RegisterRoute: <T>(root: string, registerFn: (root: string) => T): { Root: () => string } & T => {
        return {
            Root: () => root,
            ...registerFn(root)
        };
    },
    CreateRoute: (root: string, path: string[] = [], queryString?: Record<string, string>) => [
        root,
        ...path.filter(p => p !== undefined && p !== null && p !== "")
    ].filter(part => Boolean(part))
        .join("/")
        .concat(queryString ? "?" + new URLSearchParams(queryString).toString() : ""),
    CreateRoutes: <T>(root: string, factoryFn: (root: string) => T): { Root: () => string } & T => {
        return {
            Root: () => root,
            ...factoryFn(root)
        };
    }
}
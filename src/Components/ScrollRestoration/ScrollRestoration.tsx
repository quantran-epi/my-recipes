import { throttle } from "lodash";
import { useEffect, useRef } from "react";

type ScrollRestoreData = {
    path: string;
    scrollTop: number;
}

export const ScrollRestoration = () => {
    const scrollRestoreData = useRef<ScrollRestoreData[]>([]);

    const find = (href: string) => {
        return scrollRestoreData.current.find(data => data.path === href);
    }

    const remove = (href: string) => {
        scrollRestoreData.current = scrollRestoreData.current.filter(data => data.path !== href)
    }

    const save = throttle((e: any) => {
        let scrollTop = e.target.scrollTop;
        let href = window.location.href;
        if (!find(href)) {
            scrollRestoreData.current = [...scrollRestoreData.current, {
                path: href,
                scrollTop: scrollTop
            }]
        }
        else
            scrollRestoreData.current = scrollRestoreData.current.map(e => {
                if (e.path !== href) return e;
                return {
                    ...e,
                    scrollTop: scrollTop
                }
            })
    }, 100)

    const tryScroll = (href: string) => {
        let data = find(href);
        if (!data) return;
        setTimeout(() => {
            let appContentElement = document.querySelector("#app-content");
            if (appContentElement) document.querySelector("#app-content").scrollTo({ top: data.scrollTop, behavior: "auto" });
        })
        remove(data.path);
    }

    useEffect(() => {
        window.onpopstate = (e) => {
            let href = e.target.location.href;
            tryScroll(href);
        }
        let appContentElement = document.querySelector("#app-content");
        if (appContentElement) appContentElement.addEventListener('scroll', save)
        return () => appContentElement && appContentElement.removeEventListener('scroll', save)
    }, [])

    return null;
}
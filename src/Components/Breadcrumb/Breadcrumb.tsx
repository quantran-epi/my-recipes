import { Breadcrumb as AntBreadcrumb, BreadcrumbItemProps as AntBreadcrumbItemProps } from "antd";

export const Breadcrumb = AntBreadcrumb;

export type BreadcrumbItemProps = AntBreadcrumbItemProps & {
    id: string;
};
import { Image as AntImage, type ImageProps } from "antd";
import React from "react";

export const Image: React.FC<ImageProps> = ({
    preview = false,
    loading = "lazy",
    decoding = "async",
    ...props
}) => {
    return <AntImage preview={preview} loading={loading} decoding={decoding} {...props} />;
};

const path = require("path");
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const CracoLessPlugin = require('craco-less');

module.exports = {
    reactScriptsVersion: "react-scripts" /* (default value) */,
    typescript: {
        enableTypeChecking: true /* (default value)  */
    },
    webpack: {
        alias: {},
        plugins: {},
        configure: (webpackConfig, { env, paths }) => {
            webpackConfig.resolve.alias = {
                ...webpackConfig.resolve.alias,
                "@components": path.resolve(__dirname, "src/Components"),
                "@routing": path.resolve(__dirname, "src/Routing"),
                "@modules": path.resolve(__dirname, "src/Modules"),
                "@store": path.resolve(__dirname, "src/Store"),
                "@common": path.resolve(__dirname, "src/Common"),
                "@hooks": path.resolve(__dirname, "src/Hooks/index")
            }
            webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(plugin => !(plugin instanceof ModuleScopePlugin));
            return webpackConfig;
        }
    },
    devServer: { /* Any devServer configuration options: https://webpack.js.org/configuration/dev-server/#devserver */ },
    devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => { return devServerConfig; },
    plugins: [
        {
            plugin: CracoLessPlugin,
            options: {
                lessLoaderOptions: {
                    lessOptions: {
                        modifyVars: {
                            '@primary-color': '#f58220',
                            '@primary-fade': '#ffefe0',
                            '@text-color': "rgba(0, 0, 0, 0.65)",
                        },
                        javascriptEnabled: true,
                    },
                },
            },
        },
    ]
};
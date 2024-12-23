declare namespace Less {
    interface LessStatic {
        // Browser
        async?: boolean,
        env?: 'development' | 'production',
        errorReporting?: 'html' | 'console' | 'function',
        fileAsync?: boolean,
        logLevel?: number,
        poll?: number,
        relativeUrls?: number,
        useFileCache?: number,

        // Cross Platform
        paths?: string[],
        rootpath?: string,
        rewriteUrls?: 'off' | 'all' | 'local',
        math?: 'always' | 'parens-division' | 'parens' | 'strict' | 'strict-legacy',
        strictUnits?: boolean,
        ieCompat?: boolean,
        javascriptEnabled?: boolean,

        globalVars?: {
            [key: string]: string;
        },

        modifyVars?: {
            [key: string]: string
        },
    }
}

declare module "less" {
    export = Less;
}

declare var less: Less.LessStatic;

const redirect = true;
if(redirect)
{
    console['log'] = (msg) => window.__TAURI__.core.invoke('debug_print', {message: msg});
    console['debug'] = (msg) => window.__TAURI__.core.invoke('debug_print', {message: msg});
    console['info'] = (msg) => window.__TAURI__.core.invoke('debug_print', {message: msg});
    console['warn'] = (msg) => window.__TAURI__.core.invoke('debug_print', {message: msg});
    console['error'] = (msg) => window.__TAURI__.core.invoke('debug_print', {message: msg});
}

less = {
    errorReporting: 'console',
}
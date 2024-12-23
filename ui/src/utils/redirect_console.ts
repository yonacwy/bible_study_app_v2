import * as utils from './index.js';

const redirect = true;
if(redirect)
{
    console['log'] = (msg) => utils.invoke('debug_print', {message: msg});
    console['debug'] = (msg) => utils.invoke('debug_print', {message: msg});
    console['info'] = (msg) => utils.invoke('debug_print', {message: msg});
    console['warn'] = (msg) => utils.invoke('debug_print', {message: msg});
    console['error'] = (msg) => utils.invoke('debug_print', {message: msg});
}

less = {
    errorReporting: 'console'
}
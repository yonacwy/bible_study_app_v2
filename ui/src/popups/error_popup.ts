import { debug_print } from "../utils/index.js";

export function show_error_popup(id: string, show: boolean, message: string)
{
    const error_message = document.getElementById(id);

    if(error_message === null)
    {
        debug_print(`No popup ${id} exists`);
        return;
    }

    if (show) 
    {
        error_message.style.display = 'block';
        error_message.style.opacity = '1';
        error_message.innerHTML = message;
        
        error_message.classList.add('shake');
        setTimeout(() => 
        {
            error_message.classList.remove('shake');
        }, 500);
        
        setTimeout(() => 
        {
            error_message.style.opacity = '0';
            setTimeout(() => 
            {
                error_message.style.display = 'none';
            }, 500);
        }, 3000);
    } 
    else 
    {
        // Hide the tooltip if the input is valid
        error_message.style.display = 'none';
    }
}
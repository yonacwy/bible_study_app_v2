import * as view_states from '../view_states.js';
import * as utils from '../utils/index.js';

export async function run()
{

        while (!await utils.is_app_initialized())  { }

        setTimeout(() => 
        {
            view_states.goto_current_view_state();
        }, 500);
}
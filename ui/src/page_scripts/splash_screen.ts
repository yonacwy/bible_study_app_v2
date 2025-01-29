import * as view_states from '../view_states.js';

export async function run()
{
    updateProgress();
}

function updateProgress() 
{
    const progressBar = document.querySelector('.loading-bar .progress');
    const statusText = document.querySelector('.status-text');

    const tasks = [
        'Loading assets...',
        'Fetching data...',
        'Initializing application...',
        'Almost done...'
    ];

    let currentTask = 0;
    const totalTasks = tasks.length;

    if (currentTask < totalTasks) 
    {
        const progressPercentage = ((currentTask + 1) / totalTasks) * 100;
        // progressBar.style.width = `${progressPercentage}%`;
        // statusText.textContent = tasks[currentTask];
        currentTask++;
        setTimeout(updateProgress, 1000); // Simulate each task taking 1 second
    } 
    else 
    {
        setTimeout(() => 
        {
            view_states.goto_current_view_state();
        }, 0);
    }
}

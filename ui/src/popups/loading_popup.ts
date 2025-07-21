let splashElement: HTMLElement | null = null;
let styleElement: HTMLStyleElement | null = null;

const css = `
.splash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background-color: rgba(26, 26, 26, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fade-in 0.3s ease-out;
}

.splash-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
    gap: 20px;
}

.splash-screen img {
    animation: fade-in 1s ease;
}

.splash-screen .text {
    font-size: 20px;
}

.splash-screen .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #ccc;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes fade-in {
    0%   { opacity: 0; }
    100% { opacity: 1; }
}
`;

export function spawn_loading_screen(message: string = 'Loading'): void 
{
    if (splashElement) return;

    // Inject style
    styleElement = document.createElement("style");
    styleElement.textContent = css;
    document.head.appendChild(styleElement);

    // Create splash DOM
    splashElement = document.createElement("div");
    splashElement.className = "splash-overlay";
    splashElement.innerHTML = `
        <div class="splash-screen">
            <img src="../../../images/Square310x310Logo.png" alt="App logo">
            <div class="text">${message}...</div>
            <div class="spinner"></div>
        </div>
    `;

    document.body.appendChild(splashElement);
}

export function despawn_loading_screen(): void 
{
    if (splashElement) 
    {
        splashElement.remove();
        splashElement = null;
    }

    if (styleElement) 
    {
        styleElement.remove();
        styleElement = null;
    }
}

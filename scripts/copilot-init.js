// Check if copilot parameter exists in URL
const urlParams = new URLSearchParams(window.location.search);
const shouldLoadCopilot = urlParams.has('copilotEditor') || urlParams.has('copilotPreview');

if (shouldLoadCopilot) {
    // Initialize copilot when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Initializing copilot...');
        
        const domain = urlParams.get('copilot') === 'prod' 
            ? 'copilot.adobedemo.com' 
            : 'copilot-stage.adobedemo.com';

        // Function to inject CSS
        const injectCSS = () => {
            if (!document.getElementById('copilot-editor-css')) {
                const link = document.createElement('link');
                link.id = 'copilot-editor-css';
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = `https://${domain}/editor/editor.css`;
                link.media = 'all';
                
                // Handle loading errors
                link.onerror = () => console.error('Failed to load copilot CSS');
                link.onload = () => console.log('Copilot CSS loaded successfully');
                
                document.head.appendChild(link);
            }
        };

        // Function to inject Script
        const injectScript = () => {
            if (!document.getElementById('copilot-editor-script')) {
                const script = document.createElement('script');
                script.id = 'copilot-editor-script';
                script.type = 'module';
                script.src = `https://${domain}/editor/editor.js`;
                
                // Handle loading errors
                script.onerror = () => console.error('Failed to load copilot script');
                script.onload = () => console.log('Copilot script loaded successfully');
                
                // Ensure body exists before appending
                if (document.body) {
                    document.body.appendChild(script);
                } else {
                    // If body doesn't exist yet, wait for it
                    window.addEventListener('load', () => {
                        document.body.appendChild(script);
                    });
                }
            }
        };

        // Inject CSS first
        injectCSS();

        // Then inject script
        injectScript();

        console.log('Copilot initialization complete');
    });

    // Backup initialization in case DOMContentLoaded already fired
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('DOM already loaded, initializing copilot immediately...');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }
} else {
    console.log('Copilot not enabled. Add ?copilotEditor or ?copilotPreview to URL to enable.');
} 
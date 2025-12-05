/*
 * =============================================
 * MAIN APPLICATION ENTRY POINT
 * =============================================
 *
 * This file initializes the app when the page loads.
 * It sets up:
 * - Initial rendering
 * - Keyboard shortcuts
 * - Modal close handlers
 */

// ------------------------------------------
// INITIALIZATION
// ------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Render the initial UI
    renderAll();
    renderAskAITab();

    // Set up keyboard shortcuts
    document.addEventListener('keydown', e => {
        // Ctrl/Cmd + K = Focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search-input').focus();
        }

        // Escape = Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => {
                m.classList.remove('active');
            });
        }
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Set up tab click handlers
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    console.log('IDMS v6 initialized successfully!');
});

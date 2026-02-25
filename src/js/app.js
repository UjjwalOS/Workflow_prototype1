/*
 * =============================================
 * MAIN APPLICATION ENTRY POINT
 * =============================================
 *
 * This file initializes the app when the page loads.
 * It sets up:
 * - Database + case loading (via caseManager)
 * - Keyboard shortcuts
 * - Modal close handlers
 * - Auto-save on page close
 */

// ------------------------------------------
// INITIALIZATION
// ------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    // Apply sidebar collapsed state from localStorage (default: collapsed)
    const sidebar = document.getElementById('case-sidebar');
    const sidebarPref = localStorage.getItem('sidebarCollapsed');
    if (sidebar) {
        // Default to collapsed if no preference saved
        if (sidebarPref === 'false') {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
    }

    // Initialize the storage layer and restore the last active case
    // This replaces the old renderAll() call — caseManager.init()
    // will call renderAll() after loading data from IndexedDB
    await caseManager.init();

    // Set up keyboard shortcuts
    document.addEventListener('keydown', e => {
        // Ctrl/Cmd + K = Focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.focus();
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

    // Save current case when the user leaves/refreshes the page
    window.addEventListener('beforeunload', () => {
        caseManager.saveCurrentNow();
    });

    console.log('IDMS v6 initialized successfully!');
});

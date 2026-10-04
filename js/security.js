// js/security.js - Secure Core & Anti-Debugging
export function initSecurity() {
    // Pencegahan shortcut Inspect Element standar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.keyCode)) || (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            console.warn('Aksi dibatasi demi keamanan sistem.');
        }
    });

    console.log('Secure Shield Core aktif.');
}

initSecurity();

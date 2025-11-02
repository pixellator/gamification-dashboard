// testjs.js
(function hello() {
    const msg = 'Hello, world! Welcome to your new JavaScript file.';
    const time = new Date().toLocaleString();

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        // Browser: show a styled message on the page and log to console
        const el = document.createElement('pre');
        el.textContent = `${msg}\n\n${time}`;
        el.style.fontFamily = 'monospace';
        el.style.background = '#0b1220';
        el.style.color = '#cfe8ff';
        el.style.padding = '12px';
        el.style.borderRadius = '8px';
        el.style.display = 'inline-block';
        el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        document.body.appendChild(el);

        console.log('%c' + msg, 'color:#cfe8ff; background:#0b1220; padding:4px; border-radius:4px');
    } else {
        // Node / CLI: colored box in console
        const pad = 4;
        const width = msg.length + pad * 2;
        const border = '-'.repeat(width + 2);
        const padded = ' '.repeat(pad) + msg + ' '.repeat(pad);
        console.log('\x1b[36m' + border);
        console.log('|'+ padded + '|');
        console.log(border + '\x1b[0m');
        console.log('\x1b[90m' + time + '\x1b[0m');
    }
})();
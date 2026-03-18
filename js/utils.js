// Utility Functions

// Validation Functions
function isValidEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
}

function isNotEmpty(value) {
    return value && value.trim() !== '';
}

// Time Formatting
function formatDate(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// HTML Escaping
function escapeHTML(html) {
    const div = document.createElement('div');
    div.innerText = html;
    return div.innerHTML;
}

// Content Sanitization
function sanitizeContent(content) {
    return escapeHTML(content);
}

export { isValidEmail, isNotEmpty, formatDate, escapeHTML, sanitizeContent };
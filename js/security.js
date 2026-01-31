/**
 * Security Utilities for GEDCOM Family Tree Editor
 * Provides XSS prevention and input validation
 */

/**
 * Escape HTML entities to prevent XSS attacks
 * @param {string} text - Raw text that may contain HTML
 * @returns {string} Escaped safe text
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    
    return text.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Sanitize a string for safe use in HTML
 * Removes potential script injections while preserving safe content
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    
    return text
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/\bon\w+\s*=/gi, '')
        // Remove data: URLs (except for images we explicitly allow)
        .replace(/data:(?!image\/(jpeg|png|gif|webp))/gi, '')
        // Limit length to prevent DoS
        .substring(0, 10000);
}

/**
 * Sanitize HTML content - escapes by default, use for display
 * @param {string} html - HTML content
 * @returns {string} Escaped content safe for innerHTML
 */
function sanitizeForDisplay(html) {
    return escapeHtml(sanitizeText(html));
}

/**
 * Validate image file before upload
 * @param {File} file - File object to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
function validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }
    
    // Allowed MIME types (NO SVG - can contain scripts)
    const allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp'
    ];
    
    // Check MIME type
    if (!allowedTypes.includes(file.type.toLowerCase())) {
        return { 
            valid: false, 
            error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
        };
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return { 
            valid: false, 
            error: 'File too large. Maximum size is 5MB.' 
        };
    }
    
    // Check file extension matches type
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        return { 
            valid: false, 
            error: 'Invalid file extension. Only .jpg, .png, .gif, and .webp are allowed.' 
        };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate image data URL (base64)
 * @param {string} dataUrl - Data URL to validate
 * @returns {boolean} Whether the data URL is valid
 */
function validateImageDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return false;
    
    // Must start with allowed image data URL prefix
    const allowedPrefixes = [
        'data:image/jpeg;base64,',
        'data:image/jpg;base64,',
        'data:image/png;base64,',
        'data:image/gif;base64,',
        'data:image/webp;base64,'
    ];
    
    return allowedPrefixes.some(prefix => dataUrl.toLowerCase().startsWith(prefix));
}

/**
 * Sanitize imported GEDCOM/CSV field value
 * @param {string} value - Field value from import
 * @returns {string} Sanitized value
 */
function sanitizeImportedValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') value = String(value);
    
    return value
        // Remove potential script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/\bon\w+\s*=/gi, '')
        // Remove style tags (can contain expressions)
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Trim and limit length
        .trim()
        .substring(0, 1000);
}

// Export functions
export {
    escapeHtml,
    sanitizeText,
    sanitizeForDisplay,
    validateImageFile,
    validateImageDataUrl,
    sanitizeImportedValue
};

// Also expose to window for inline handlers
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.sanitizeText = sanitizeText;
    window.sanitizeForDisplay = sanitizeForDisplay;
    window.validateImageFile = validateImageFile;
}

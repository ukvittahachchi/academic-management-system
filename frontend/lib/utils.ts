export const getFullFileUrl = (path: string | null | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('https') || path.startsWith('blob:')) return path;

    // Get API URL and strip /api suffix if present to get the root server URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

    // Normalize slashes to forward slashes
    let cleanPath = path.toString().trim().replace(/[\r\n]+/g, '').replace(/\\/g, '/');


    // If path contains 'uploads/', extract the part from 'uploads/' onwards
    // This handles absolute paths like "C:/Users/.../uploads/file.mp4" or "backend/uploads/file.mp4"
    if (cleanPath.includes('uploads/')) {
        const parts = cleanPath.split('uploads/');
        // Take the last part to get the relative path inside uploads
        cleanPath = parts[parts.length - 1];
        // Remove leading slash if present
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

        return `${baseUrl}/uploads/${cleanPath}`;
    }

    // If path starts with /, remove it
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

    // If the path doesn't start with 'uploads/', assume it acts as a direct path served by static middleware
    // BUT, backend only serves /uploads. 
    // If the file was uploaded via our system, it should probably be in uploads.
    // However, to be safe, if it doesn't have uploads/, we check if we should prepend it.
    // For now, let's assume if it's not starting with uploads, we prepend it ONLY if it looks like a filename (no slashes)
    // OR just return as is relative to base (original behavior) but logic suggests uploads is the only place.

    // Let's stick to the behavior that if it was saved as "uploads/file", we use that.
    // If it was saved as "file.mp4", we might need to add uploads/. 
    // But let's assume the DB stores "uploads/file.mp4" as per controller.

    return `${baseUrl}/${cleanPath}`;
};

import directusFormatTitle from '@directus/format-title';

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeSizeSuffix(text) {
    const n = parseInt(text);
    if (isNaN(n) || n < 0) return null;
    const suff = text.substr(-1).toUpperCase();
    if (['b', 'k', 'M', 'G', 'T', 'P'].indexOf(suff) !== -1) return n + suff;
    if (n > 1024 * 1024 * 1024) return n + 'G';
    if (n > 1024 * 1024) return n + 'M';
    if (n > 1024) return n + 'k';
    return n.toString() + 'b';
}

/**
 * @param {string} title
 * @returns {string}
 */
export function formatTitle(title) {
    return directusFormatTitle(title)
        .replace(/\bSftp\b/, 'sFTP')
        .replace(/\bFtp\b/, 'FTP')
        .replace(/\bNcdu\b/, 'NCDU')
        .replace(/\bDlna\b/, 'DLNA')
        .replace(/\bTls\b/, 'TLS')
        .replace(/\bEps\b/, 'EPSV')
        .replace(/\bPcloud\b/, 'pCloud')
        .replace(/\bMlsd\b/, 'MLSD')
        .replace(/\bMD5\b/, 'MD5')
        .replace(/\bHdfs\b/, 'HDFS')
        .replace(/\bZoho\b/, 'ZoHo')
        .replace(/\bOnedrive\b/, 'OneDrive')
        .replace(/\bOpendrive\b/, 'OpenDrive');
}

// File pickers and drag/drop can supply a blank or generic MIME type.
const TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	jpe: 'image/jpeg',
	webp: 'image/webp',
	avif: 'image/avif',
	gif: 'image/gif',
	bmp: 'image/bmp',
	svg: 'image/svg+xml',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	ico: 'image/x-icon',
	jxl: 'image/jxl',
	heic: 'image/heic',
	heif: 'image/heif',
	pdf: 'application/pdf',
	txt: 'text/plain',
	md: 'text/markdown',
	markdown: 'text/markdown',
	htm: 'text/html',
	html: 'text/html',
	csv: 'text/csv',
	json: 'application/json',
	xml: 'application/xml',
	srt: 'application/x-subrip',
	vtt: 'text/vtt',
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	wave: 'audio/wav',
	flac: 'audio/flac',
	aac: 'audio/aac',
	m4a: 'audio/mp4',
	ogg: 'audio/ogg',
	oga: 'audio/ogg',
	opus: 'audio/ogg',
	aif: 'audio/aiff',
	aiff: 'audio/aiff',
	mp4: 'video/mp4',
	m4v: 'video/mp4',
	webm: 'video/webm',
	mov: 'video/quicktime',
	mkv: 'video/x-matroska',
	avi: 'video/x-msvideo',
	mpeg: 'video/mpeg',
	mpg: 'video/mpeg',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	odt: 'application/vnd.oasis.opendocument.text',
	rtf: 'application/rtf',
	epub: 'application/epub+zip',
};
const ALIASES: Record<string, string> = {
	'application/x-pdf': 'application/pdf',
	'image/x-ms-bmp': 'image/bmp',
	'audio/mp3': 'audio/mpeg',
	'audio/x-m4a': 'audio/mp4',
	'video/x-m4v': 'video/mp4',
	'image/jpg': 'image/jpeg',
	'image/pjpeg': 'image/jpeg',
	'image/x-png': 'image/png',
	'audio/x-wav': 'audio/wav',
	'audio/wave': 'audio/wav',
	'audio/x-flac': 'audio/flac',
};

export function fileType(file: { type: string; name?: string }): string {
	const type = file.type.split(';')[0]!.trim().toLowerCase();
	if (type && type !== 'application/octet-stream')
		return ALIASES[type] ?? type;
	const name = file.name ?? '';
	const dot = name.lastIndexOf('.');
	return dot < 0 ? '' : (TYPES[name.slice(dot + 1).toLowerCase()] ?? '');
}

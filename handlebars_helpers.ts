function image_src(path: string, classess: string, style: string): string {
	if (path) {
		classess = typeof classess === 'string' ? classess : '';
		style = typeof style === 'string' ? style : '';
		return `<img src="/assets/images/${path}" alt="image" class="${classess}" style="${style}">`;
	} else {
		return '';
	}
}

function image_url(url: string, classess: string, style: string): string {
	if (url) {
		classess = typeof classess === 'string' ? classess : '';
		style = typeof style === 'string' ? style : '';
		return `<img src="${url}" alt="image" class="${classess}" style="${style}">`;
	} else {
		return '';
	}
}

export default { image_src, image_url };

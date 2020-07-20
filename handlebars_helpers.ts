function page(path: string, label: string, target: string, classess: string, id: string): string {
	if (path) {
		path = path === '/' ? path : `${path}`;
		label = typeof label === 'string' ? label : path;
		target = typeof target === 'string' ? target : '';
		classess = typeof classess === 'string' ? classess : '';
		id = typeof id === 'string' ? id : '';
		return `<a target="${target}" href="${path}" class="${classess}" id="${id}">${label}</a>`;
	} else {
		return '';
	}
}

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

export default { page, image_src, image_url };

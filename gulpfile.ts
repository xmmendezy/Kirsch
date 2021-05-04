import del from 'del';
import { readFileSync, readdirSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { Transform } from 'readable-stream';
import replacestream from 'replacestream';
import { task, src, dest, series, lastRun, watch, parallel } from 'gulp';
import cache from 'gulp-cache';
import { init, write } from 'gulp-sourcemaps';
import babel from 'gulp-babel';
import tsc from 'gulp-typescript';
import sass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import minifyCss from 'gulp-clean-css';
import plumber from 'gulp-plumber';
import minify from 'gulp-minify';
import handlebars_compile from 'gulp-compile-handlebars';
import imagemin from 'gulp-imagemin';
import rename from 'gulp-rename';
import { create } from 'browser-sync';
import layouts from 'handlebars-layouts';
import htmlmin from 'gulp-htmlmin';
import sitemap from 'gulp-sitemap';
import replace from 'gulp-replace';
import merge from 'merge2';

import package_json from './package.json';
import helpers from './handlebars_helpers';

const src_folder = './src/';
const src_assets_i18n = src_folder + 'i18n/';
const src_assets_partials = src_folder + 'partials/';
const src_assets_pages = src_folder + 'pages/';
const src_assets_folder = src_folder + 'assets/';
const dist_folder = './dist/';
const dist_assets_folder = dist_folder + 'assets/';
const node_modules_folder = './node_modules/';
const dist_node_modules_folder = dist_folder + 'node_modules/';
const node_dependencies = Object.keys(package_json.dependencies || {});
const browserSync = create();

handlebars_compile.Handlebars.registerHelper(layouts(handlebars_compile.Handlebars));

(sass as any).compiler = require('node-sass');

let is_production = false;
let hash = '';
let script_hash = '';
let style_hash = '';
let files_js: string[] = [];
let files_css: string[] = [];

function script(fn: any, str: string) {
	fn;
	if (str) {
		if (is_production) {
			return `<script src="/assets/js/${str}-${hash}"></script>`;
		} else {
			return `<script src="/assets/js/${str}"></script>`;
		}
	} else {
		return script_hash;
	}
}

function style(fn: any, str: string) {
	fn;
	if (str) {
		if (is_production) {
			return `<link rel="stylesheet" href="/assets/css/${str}-${hash}">`;
		} else {
			return `<link rel="stylesheet" href="/assets/css/${str}">`;
		}
	} else {
		return style_hash;
	}
}

function insert_scripts() {
	files_js = readdirSync(dist_assets_folder + 'js');
	return new Transform({
		objectMode: true,
		transform: function (file, enc, callback) {
			enc;
			const filename = file.basename.split('.')[0];
			function getReplacement() {
				let result = '';
				for (const file_js of files_js) {
					if (!file_js.endsWith('.js.map')) {
						if (
							file_js.startsWith('js.main') ||
							file_js.startsWith('ts.main') ||
							file_js.startsWith(`js.${filename}`) ||
							file_js.startsWith(`ts.${filename}`)
						) {
							result += `<script src="/assets/js/${file_js}"></script>`;
						}
					}
				}
				return result;
			}
			const replacement = getReplacement();
			if (file.isStream()) {
				file.contents = file.contents.pipe(replacestream(script_hash, replacement));
			}
			if (file.isBuffer()) {
				const chunks = String(file.contents).split(script_hash);
				const result = chunks.join(replacement);
				file.contents = Buffer.from(result);
			}
			callback(undefined, file);
		},
	});
}

function insert_styles() {
	files_css = readdirSync(dist_assets_folder + 'css');
	return new Transform({
		objectMode: true,
		transform: function (file, enc, callback) {
			enc;
			const filename = file.basename.split('.')[0];
			const getReplacement = () => {
				let result = '';
				for (const file_css of files_css) {
					if (!file_css.endsWith('.css.map')) {
						if (
							file_css.startsWith('sass.main') ||
							file_css.startsWith('scss.main') ||
							file_css.startsWith('css.main') ||
							file_css.startsWith(`sass.${filename}`) ||
							file_css.startsWith(`scss.${filename}`) ||
							file_css.startsWith(`css.${filename}`)
						) {
							result += `<link rel="stylesheet" href="/assets/css/${file_css}">`;
						}
					}
				}
				return result;
			};
			const replacement = getReplacement();
			if (file.isStream()) {
				file.contents = file.contents.pipe(replacestream(style_hash, replacement));
			}
			if (file.isBuffer()) {
				const chunks = String(file.contents).split(style_hash);
				const result = chunks.join(replacement);
				file.contents = Buffer.from(result);
			}
			callback(undefined, file);
		},
	});
}

const templates_tasks: string[] = [];
const files_i18n = readdirSync(src_assets_i18n);
let default_lang = '';
for (const file_lang of files_i18n) {
	const template_task = `templates-${file_lang.split('.')[0]}`;
	task(template_task, () => {
		const filename: string[] = file_lang.split('.');
		const lang: string = filename[0];
		let page_dist_folder = dist_folder;
		let root_path = '/';
		if (filename.length === 3 && !default_lang) {
			default_lang = lang;
		} else if (default_lang !== lang) {
			page_dist_folder = `${dist_folder}${lang}`;
			root_path = `/${lang}/`;
		}
		const page = (path: string, label: string, target: string, classess: string, id: string): string => {
			const get_label = (): string => {
				if (typeof label === 'string') {
					if (label.startsWith('@')) {
						label = label.slice(1);
						let str = templateData;
						label.split('.').map(pj => {
							if (pj) {
								str = str[pj];
							}
						});
						return str as string;
					} else {
						return label;
					}
				} else {
					return path;
				}
			};
			label = get_label();
			target = typeof target === 'string' ? target : '';
			classess = typeof classess === 'string' ? classess : '';
			id = typeof id === 'string' ? id : '';
			return `<a target="${target}" href="${root_path}${path}" class="${classess}" id="${id}">${label}</a>`;
		};
		const templateData: any = JSON.parse(readFileSync(`./src/i18n/${file_lang}`, 'utf-8'));
		const options = {
			ignorePartials: true,
			batch: [src_assets_partials],
			helpers: {
				capitals: (str: string): string => {
					return str.toUpperCase();
				},
				script,
				style,
				page,
				...helpers,
			},
		};

		return src([src_assets_pages + '**/*.hbs'])
			.pipe(handlebars_compile(templateData, options))
			.pipe(
				rename(path => {
					path.extname = '.html';
				}),
			)
			.pipe(htmlmin({ collapseWhitespace: true }))
			.pipe(insert_scripts())
			.pipe(insert_styles())
			.pipe(dest(page_dist_folder))
			.pipe(cache.clear({}))
			.pipe(browserSync.stream());
	});
	templates_tasks.push(template_task);
}

task('clear', () => del([dist_folder]));

task('js', () => {
	return src([src_assets_folder + 'js/main.js'], { allowEmpty: true })
		.pipe(plumber())
		.pipe(init())
		.pipe(
			babel({
				presets: ['@babel/env'],
			}),
		)
		.pipe(
			minify({
				ext: {
					min: '.min.js',
				},
				ignoreFiles: ['.min.js'],
				noSource: true,
			}),
		)
		.pipe(
			rename(path => {
				path.basename = 'js.' + path.basename + (is_production ? `-${hash}` : '');
			}),
		)
		.pipe(write('.', {}))
		.pipe(dest(dist_assets_folder + 'js'))
		.pipe(browserSync.stream());
});

task('ts', () => {
	const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf-8'));
	return src([src_assets_folder + 'ts/main.ts'], { allowEmpty: true })
		.pipe(plumber())
		.pipe(init())
		.pipe(tsc(tsconfig['compilerOptions']))
		.js.pipe(
			minify({
				ext: {
					min: '.min.js',
				},
				ignoreFiles: ['.min.js'],
				noSource: true,
			}),
		)
		.pipe(
			rename(path => {
				path.basename = 'ts.' + path.basename + (is_production ? `-${hash}` : '');
			}),
		)
		.pipe(write('.', {}))
		.pipe(dest(dist_assets_folder + 'js'))
		.pipe(browserSync.stream());
});

task('sitemap', () => {
	return src([dist_folder + '*.html'], {
		read: false,
		since: lastRun('sitemap'),
	})
		.pipe(
			sitemap({
				siteUrl: 'http://www.kirsch.com',
			}),
		)
		.pipe((replace as any)('.html', ''))
		.pipe(dest(dist_folder));
});

task('sass', () => {
	return src([src_assets_folder + 'sass/main.sass'], { allowEmpty: true })
		.pipe(sass({ includePaths: ['node_modules'] }).on('error', sass.logError))
		.pipe(init())
		.pipe(plumber())
		.pipe(sass())
		.pipe(autoprefixer())
		.pipe(minifyCss())
		.pipe(
			rename(path => {
				path.basename = 'sass.' + path.basename + (is_production ? `-${hash}` : '') + '.min';
			}),
		)
		.pipe(write('.', {}))
		.pipe(dest(dist_assets_folder + 'css'))
		.pipe(browserSync.stream());
});

task('scss', () => {
	return src([src_assets_folder + 'scss/main.scss'], { allowEmpty: true })
		.pipe(sass({ includePaths: ['node_modules'] }).on('error', sass.logError))
		.pipe(init())
		.pipe(plumber())
		.pipe(sass())
		.pipe(autoprefixer())
		.pipe(minifyCss())
		.pipe(
			rename(path => {
				path.basename = 'scss.' + path.basename + (is_production ? `-${hash}` : '') + '.min';
			}),
		)
		.pipe(write('.', {}))
		.pipe(dest(dist_assets_folder + 'css'))
		.pipe(browserSync.stream());
});

task('css', () => {
	return src([src_assets_folder + 'css/main.css'], { allowEmpty: true })
		.pipe(init())
		.pipe(plumber())
		.pipe(autoprefixer())
		.pipe(minifyCss())
		.pipe(
			rename(path => {
				path.basename = 'css.' + path.basename + (is_production ? `-${hash}` : '') + '.min';
			}),
		)
		.pipe(write('.', {}))
		.pipe(dest(dist_assets_folder + 'css'))
		.pipe(browserSync.stream());
});

task('images', () => {
	return src([src_assets_folder + 'images/**/*.+(png|jpg|jpeg|gif|svg|ico)'], { since: lastRun('images') })
		.pipe(plumber())
		.pipe(imagemin())
		.pipe(dest(dist_assets_folder + 'images'))
		.pipe(browserSync.stream());
});

task('images-dev', () => {
	return src([src_assets_folder + 'images/**/*.+(png|jpg|jpeg|gif|svg|ico)'], { since: lastRun('images') })
		.pipe(plumber())
		.pipe(dest(dist_assets_folder + 'images'))
		.pipe(browserSync.stream());
});

task('fonts', () => {
	return src([src_assets_folder + 'fonts/**/*'], { since: lastRun('fonts') })
		.pipe(dest(dist_assets_folder + 'fonts'))
		.pipe(browserSync.stream());
});

task('vendor', async () => {
	if (node_dependencies.length === 0) {
		return new Promise<void>(resolve => {
			console.log('No dependencies specified');
			resolve();
		});
	}

	return merge(
		node_dependencies.map(dependency =>
			src(node_modules_folder + dependency + '/**/*', {
				since: lastRun('vendor'),
			})
				.pipe(dest(dist_node_modules_folder + dependency.replace(/\/.*/, '')))
				.pipe(browserSync.stream()),
		),
	);
});

// Watch
task('watch', () => {
	const watch_vendor: string[] = [];

	node_dependencies.forEach(dependency => {
		watch_vendor.push(node_modules_folder + dependency + '/**/*.*');
	});

	watch(
		[src_assets_i18n + '**/*.json', src_assets_partials + '**/*.hbs', src_assets_pages + '**/*.hbs'],
		series('templates'),
	).on('change', browserSync.reload);
	watch(src_assets_folder + 'sass/**/*.sass', series('sass')).on('change', browserSync.reload);
	watch(src_assets_folder + 'scss/**/*.scss', series('scss')).on('change', browserSync.reload);
	watch(src_assets_folder + 'css/**/*.css', series('css')).on('change', browserSync.reload);
	watch(src_assets_folder + 'js/**/*.js', series('js')).on('change', browserSync.reload);
	watch(src_assets_folder + 'ts/**/*.ts', series('ts')).on('change', browserSync.reload);
	watch(src_assets_folder + 'images/**/*.+(png|jpg|jpeg|gif|svg|ico)', series('images-dev')).on(
		'change',
		browserSync.reload,
	);
	watch(watch_vendor, series('vendor')).on('change', browserSync.reload);
});

// Serve
task('serve', async () => {
	return browserSync.init({
		server: {
			baseDir: ['dist'],
			serveStaticOptions: {
				extensions: ['html'],
			},
		},
		port: 3000,
		open: true,
	});
});

// Is production
task('is_production', async () => {
	is_production = true;
	hash = uuid();
	script_hash = `<script src="${hash}"></script>`;
	style_hash = `<link rel="stylesheet" href="${hash}">`;
});

// Is not production
task('is_not_production', async () => {
	is_production = false;
	hash = '';
	script_hash = `<script src="${hash}"></script>`;
	style_hash = `<link rel="stylesheet" href="${hash}">`;
});

// Templates
task('templates', series(templates_tasks));

// Compile
task('compile', series(['ts', 'js', 'sass', 'scss', 'css', 'fonts', 'templates']));

// Build
task('build', series('clear', 'is_production', 'compile', 'images', 'vendor', 'sitemap'));

// Dev
task('dev', series('compile', 'images-dev', 'vendor', 'sitemap'));

// Default task
task('default', series('clear', 'is_not_production', 'dev', parallel('serve', 'watch')));

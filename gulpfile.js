var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var htmlreplace = require('gulp-html-replace');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');

var path = {
	HTML: 'index.html',
	ALL: ['js/*.js', 'js/**/*.js', '*.html'],
	JS: [
		'bower_components/jquery/dist/jquery.js',
		'bower_components/datatables/media/js/jquery.dataTables.js',
		'bower_components/bootstrap/dist/js/bootstrap.js',
		'bower_components/angular/angular.js',
		'bower_components/angular-ui-router/release/angular-ui-router.js',
		'bower_components/angular-resource/angular-resource.js',
		'bower_components/angular-datatables/dist/angular-datatables.js',
		'js/*.js',
		'js/**/*.js'
	],
	JSON: ['data/*.json', 'data/**/*.json'],
	MINIFIED_OUT: 'build.min.js',
	MIN_CSS_OUT: 'vendor.css',
	DEST_SRC: 'dist/src',
	DEST_BUILD: 'dist/build',
	DEST: 'dist',
	JSON_OUT: 'dist/data'
};

gulp.task('copyJSON', function () {
	gulp.src(path.JSON).pipe(gulp.dest(path.JSON_OUT));
});

gulp.task('copy', function () {
	gulp.src('table.html').pipe(gulp.dest(path.DEST));
});

gulp.task('replace', ['cssReplace'], function () {
	gulp.src([path.HTML, path.DEST_BUILD + '/vendor.css'])
		.pipe(htmlreplace({
			css: 'build/' + path.MIN_CSS_OUT,
			js: 'build/' + path.MINIFIED_OUT
		}))
		.pipe(gulp.dest(path.DEST));
});

gulp.task('cssReplace', function() {
	return gulp.src([
		'bower_components/bootstrap/dist/css/bootstrap.css',
		'bower_components/datatables/media/css/jquery.dataTables.css',
		'css/style.css'
	])
		.pipe(concat(path.MIN_CSS_OUT))
		.pipe(cssmin())
		// .pipe(htmlreplace({
		// 	css: 'build/' + path.MIN_CSS_OUT
		// }))
		.pipe(gulp.dest(path.DEST_BUILD));
});

gulp.task('build', function () {
	gulp
		.src(path.JS)
		.pipe(concat(path.MINIFIED_OUT))
		.pipe(uglify(path.MINIFIED_OUT))
		.pipe(gulp.dest(path.DEST_BUILD));
});

gulp.task('default', ['replace', 'copy', 'copyJSON', 'build']);
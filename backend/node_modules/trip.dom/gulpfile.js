'use strict';

const gulp = require('gulp');
const path = require('path');
const jshint = require('gulp-jshint');
const jscs = require('gulp-jscs');
const jscsStylish = require('gulp-jscs-stylish');
const mocha = require('gulp-mocha');

const srcFiles = path.join('lib', '**', '*.js');
const unitTestFiles = path.join('test', 'unit', '**', '*.test.js');
const functionalTestFiles = path.join('test', 'functional', 'src', '*.js');

// ----- Individual Tasks -----

gulp.task('clearconsole', () => {
  process.stdout.write('\x1Bc');
});

gulp.task('jshint', () => {
  return gulp.src([srcFiles, unitTestFiles, functionalTestFiles])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', () => {
  return gulp.src([srcFiles, unitTestFiles])
    .pipe(jscs())
    .pipe(jscsStylish());
});

gulp.task('unit', ['jshint', 'jscs'], () => {
  return gulp.src(unitTestFiles)
    .pipe(mocha({}));
});

gulp.task('test', ['jshint', 'jscs', 'unit']);

gulp.task('default', ['test']);

gulp.task('watch', () => {
  gulp.watch(srcFiles, ['clearconsole', 'jshint', 'jscs', 'unit']);
  gulp.watch(unitTestFiles, ['clearconsole', 'jshint', 'jscs', 'unit']);
  gulp.watch(functionalTestFiles, ['clearconsole', 'jshint', 'jscs']);
});

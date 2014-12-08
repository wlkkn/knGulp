var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var nib = require('nib');
var copy = require('gulp-copy');
var del = require('del');
var through = require('through');
var bufferCrc32 = require('buffer-crc32');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var stylus = require('gulp-stylus');
var coffee = require('gulp-coffee');
var base64 = require('gulp-base64');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');
var changed = require('gulp-changed');
var jade = require('gulp-jade');

var srcPath = 'src';
var buildPath = 'build'; 
var destPath = 'dest';

// js语法检查
gulp.task('jshint', ['clean:dest'], function(){
  var srcList = [
    '*.js',
    srcPath + '/**/*.js'
    // 'controllers/*.js', 
    // 'helpers/*.js', 
    // 'middlewares/*.js',
    // 'statics/src/**/*.js',
    // '!statics/src/component/*.js'
  ];
  return gulp.src(srcList)
    .pipe(jshint({
      //定义全局变量识别，否则语法检查出错
      predef : ['GLOBAL_VAR'],
      //是否以node模式解析
      node : true
    }))
    .pipe(jshint.reporter('default'));
});

// 清空dest文件夹
gulp.task('clean:dest', function(cbf){
  del([destPath], cbf);
});

// 清空临时文件夹
gulp.task('clean:build', ['static_version'], function(cbf){
  del([buildPath], cbf);
});

// 编译并压缩stylus文件
gulp.task('static_stylus', ['clean:dest'], function(){
  return gulp.src(srcPath + '/**/*.styl')
    .pipe(stylus({
      // 是否使用nib
      use : nib(),
      compress : true
    }))
    // 背景图片base64编码
    .pipe(base64())
    // 压缩css，注意IEhack未被压缩
    .pipe(cssmin())
    // 重命名
    // .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(buildPath));
});

// 压缩css文件
gulp.task('static_css', ['clean:dest'], function(){
  return gulp.src([srcPath + '/**/*.css'])
    .pipe(cssmin())
    // 重命名
    // .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(buildPath));
});

// js压缩
gulp.task('static_js', ['clean:dest'], function(){
  return gulp.src(srcPath + '/**/*.js')
    // 压缩js
    .pipe(uglify())
    // 重命名
    // .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(buildPath));
});

// 编译并压缩coffee文件
gulp.task('static_coffee', ['clean:dest'], function(){
  return gulp.src([srcPath + '/**/*.coffee'])
    .pipe(coffee())
    .pipe(uglify())
    // .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(buildPath));
});

// 编译jade
gulp.task('jade', ['clean:dest'], function () {
  gulp.src(srcPath+'/**/*.jade')
    .pipe(changed(destPath))
    .pipe(jade())
    .pipe(gulp.dest(destPath));
});

// 复制不是js、css、styl、jade以外的文件到dest文件夹
gulp.task('static_copy_other', ['clean:dest'], function(){
  return gulp.src([srcPath+'/**/*', '!'+srcPath+'/**/*.coffee', '!'+srcPath + '/**/*.js', '!'+srcPath+'/**/*.styl', '!'+srcPath+'/**/*.css', '!'+srcPath+'/**/*.jade'])
    .pipe(copy(destPath, {
      // 忽略文件层次的深度
      prefix : 1
    }));
});

// 合并文件函数
var concatFiles = function(filePath, files){
  var savePath = path.join(filePath, 'merge');
  if(!fs.existsSync(savePath)){
    fs.mkdirSync(savePath);
  }
  // 文件名数组
  var names = [];
  // 文件内容数组
  var data = [];
  // 获取合并后文件的后缀
  var ext = path.extname(files[0]);
  _.forEach(files, function(file){
    // 文件描述
    var desc = '/*' + file + '*/';
    file = path.join(filePath, file);
    var buf = fs.readFileSync(file, 'utf8');
    names.push(path.basename(file, ext));
    data.push(desc + '\n' + buf);
  });
  var name = names.join(',') + ext;
  fs.writeFileSync(path.join(savePath, name), data.join('\n'));
};

// merge.json中的except不合并，files中每个数组合并
gulp.task('static_merge', ['static_css', 'static_js', 'static_stylus', 'static_coffee'], function(cbf){
  var merge = require('./merge');
  var components = require('./components');
  // var buildPath = 'statics/build';
  _.forEach(merge.files, function(files){
    concatFiles(buildPath, files);
  });

  var filterFiles = [];
  if(merge.except){
    // 相当于将merge.except转变为参数后push
    filterFiles.push.apply(filterFiles, merge.except);
  }
  if(merge.files){
    filterFiles.push.apply(filterFiles, merge.files);
  }
  filterFiles = _.flatten(filterFiles);
  var getRestFiles = function(files){
    return _.filter(files, function(file){
      return !~_.indexOf(filterFiles, file);
    });
  };
  _.forEach(components, function(component){
    var cssFiles = getRestFiles(component.css);
    if(cssFiles.length > 1){
      concatFiles(buildPath, cssFiles);
    }
    var jsFiles = getRestFiles(component.js);
    if(jsFiles.length > 1){
      concatFiles(buildPath, jsFiles);
    }
  });
  cbf();
});


gulp.task('static_version', ['static_merge'], function(){
  var crc32Infos = {};
  var crc32 = function(file){
    var version = bufferCrc32.unsigned(file.contents);
    crc32Infos['/' + file.relative] = version;
    var ext = path.extname(file.path);
    file.path = file.path.substring(0, file.path.length - ext.length) + '.' + version + ext;
    this.emit('data', file);
  };

  return gulp.src([buildPath+'/**/*.js', buildPath+'/**/*.css'])
    .pipe(through(crc32, function(){
      fs.writeFileSync('crc32.json', JSON.stringify(crc32Infos, null, 2));
      this.emit('end');
    }))
    .pipe(gulp.dest(destPath));
});


gulp.task('default', ['clean:dest', 'jshint', 'jade', 'static_copy_other', 'static_version', 'clean:build']);

#!/usr/bin/env node

var fs = require('fs');
var template = require('lodash.template');
var cli = require('cli');
cli.enable('glob');

var TOKEN_BEFORE_EXCLUDE = '<content url="file://$MODULE_DIR$">\n';
var FILENAME_DEFAULT_EXCLUDE_FILE = __dirname + '/default.iml';
var TOKEN_PATH_TEMPLATE = '<excludeFolder url="file://$MODULE_DIR$/<%= path %>" />\n';

cli.parse({
  'project-path': ['p', 'Project path', 'path', process.cwd()]
});

function search(path, callback, options) {
  return fs.exists(path, function fsExists(exists) {
    return callback(exists, path, options);
  });
}

function writeBaseExcludeFile(filename) {
  fs.writeFileSync(filename, fs.readFileSync(FILENAME_DEFAULT_EXCLUDE_FILE, 'utf8'));
}

function getExcludeStringForPaths(paths) {
  var content = '', tpl = template(TOKEN_PATH_TEMPLATE);
  paths.forEach(function (path) {
    content += tpl({
      path: path
    });
  });
  return content;
}

function appendPathsToExcludeFile(filename, paths) {
  var fileContents = fs.readFileSync(filename, 'utf8'), splitedFile;
  if(fileContents.search(TOKEN_BEFORE_EXCLUDE)) {
    splittedFile = fileContents.split(TOKEN_BEFORE_EXCLUDE);
    splittedFile[1] = getExcludeStringForPaths(paths) + splittedFile[1];
    fileContents = splittedFile.join(TOKEN_BEFORE_EXCLUDE);
    fs.writeFileSync(filename, fileContents);
  } else {
    cli.error('Invalid exclude file contents. "' + TOKEN_BEFORE_EXCLUDE + '" not found.');
  }
}

function getExcludeFilenameForProject(projectName) {
  return projectName + '.iml';
}

function handleExcludeFileSearch(result, filename, options) {
  if (!result) {
    cli.info('Exclude file was not found. Created: ' + filename);
    writeBaseExcludeFile(filename);
  }
  if(options.args && Array.isArray(options.args)) {
    appendPathsToExcludeFile(filename, options.args);
  }
}

function handleProjectSettingsPathSearch(result, path, options) {
  var projectName = process.cwd().split("/").pop();
  if (result) {
    search(path + '/' + getExcludeFilenameForProject(projectName), handleExcludeFileSearch, options);
  } else {
    cli.error(path + ' not found');
  }
}

function handleProjectPathSearch(exists, path, options) {
  if (exists) {
    search(path + '/.idea', handleProjectSettingsPathSearch, options);
  } else {
    cli.error('Path not found');
  }
}

cli.main(function(args, options) {
  options.args = args;
  return search(options['project-path'], handleProjectPathSearch, options);
});

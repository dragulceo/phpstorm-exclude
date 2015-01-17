#!/usr/bin/env node

var fs = require('fs');
var xml2js = require('xml2js');
var deepExtend = require('deep-extend');
var cli = require('cli');
cli.enable('glob');

var FILENAME_DEFAULT_EXCLUDE_FILE = __dirname + '/default.iml';

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

function appendPathsToExcludeFile(filename, paths) {
  var fileContents = fs.readFileSync(filename, 'utf8');
  xml2js.parseString(fileContents, function(err, result) {
    var builder;
    if (!err) {
      result = deepExtend({
        'module': {
          '$': {
            'type': 'WEB_MODULE',
            'version': '4'
          },
          'component': [{
            '$': {
              'url': 'NewModuleRootManager',
            },
            'content': [{
              '$': {
                'url': 'file://$MODULE_DIR$'
              },
              'excludeFolder': [],
              'orderEntry': [{
                '$': {
                  'type': 'inheritedJdk'
                }
              }, {
                '$': {
                  'type': 'sourceFolder',
                  'forTests': false
                }
              }]
            }]
          }]
        }
      }, result);
      paths.forEach(function(path) {
        result.module.component[0].content[0].excludeFolder.push({
          '$': {
            'url': 'file://$MODULE_DIR$/' + path
          }
        });
      });
      builder = new xml2js.Builder();
      fileContents = builder.buildObject(result);
      fs.writeFileSync(filename, fileContents);
    } else {
      cli.error(err.message);
    }
  });
}

function getExcludeFilenameForProject(projectName) {
  return projectName + '.iml';
}

function handleExcludeFileSearch(result, filename, options) {
  if (!result) {
    cli.info('Exclude file was not found. Created: ' + filename);
    writeBaseExcludeFile(filename);
  }
  if (options.args && Array.isArray(options.args)) {
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

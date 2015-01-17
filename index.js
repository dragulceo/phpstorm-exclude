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

function pathExists(path, callback, options) {
  return fs.exists(path, function fsExists(exists) {
    return callback(exists, path, options);
  });
}

function getDefaultFileContents() {
  return fs.readFileSync(FILENAME_DEFAULT_EXCLUDE_FILE, 'utf8');
}

function writeBaseExcludeFile(filename) {
  fs.writeFileSync(filename, getDefaultFileContents());
}

function getJSONFromXML(xml, callback) {
  xml2js.parseString(xml, function(err, result) {
    if (err) {
      cli.error(err.message);
    } else {
      callback(result);
    }
  });
}

function patchWithDefaultStructure(json, callback) {
  getJSONFromXML(getDefaultFileContents(), function(resultDefault) {
    callback(deepExtend(resultDefault, json));
  });
}

function getXMLFromJSON(json) {
  var builder = new xml2js.Builder();
  return builder.buildObject(json);
}

function appendPathsToExcludeFile(filename, paths) {
  var fileContents = fs.readFileSync(filename, 'utf8');
  getJSONFromXML(fileContents, function(json) {
    patchWithDefaultStructure(json, function(patchedJson) {
      paths.forEach(function(path) {
        if (!patchedJson.module.component[0].content[0].excludeFolder) {
          patchedJson.module.component[0].content[0].excludeFolder = [];
        }
        patchedJson.module.component[0].content[0].excludeFolder.push({
          '$': {
            'url': 'file://$MODULE_DIR$/' + path
          }
        });
      });
      fs.writeFileSync(filename, getXMLFromJSON(patchedJson));
    });
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
    pathExists(path + '/' + getExcludeFilenameForProject(projectName), handleExcludeFileSearch, options);
  } else {
    cli.error(path + ' not found');
  }
}

function handleProjectPathSearch(exists, path, options) {
  if (exists) {
    pathExists(path + '/.idea', handleProjectSettingsPathSearch, options);
  } else {
    cli.error('Path not found');
  }
}

cli.main(function(args, options) {
  options.args = args;
  return pathExists(options['project-path'], handleProjectPathSearch, options);
});

/* globals: describe, it */
describe('phpstorm-exclude tests', function() {
  var sys = require('sys');
  var fs = require('fs');
  var exec = require('child_process').exec;

  function puts(error, stdout, stderr) {
    console.log('>>>>>>>>');
    if(error) {
      console.log(error);
    }
    console.log(stdout, stderr);
    console.log('<<<<<<<<');
  }

  function getFileContents(filename) {
    return fs.readFileSync(filename, 'utf8');
  }

  beforeEach(function() {
    exec('mkdir -p ./.test/.idea', puts);
  });

  afterEach(function() {
    exec('rm -rf ./.test', puts);
  });


  it('should create exclude file if not exists', function() {
    var execDone = false;
    runs(function () {
      exec('cd ./.test/ && node ../index.js test100', function () {
        puts.apply(this, arguments);
        execDone = true;
      });
    });

    waitsFor(function () {
      return execDone;
    }, 'Exec to finish', 500);
    runs(function () {
      expect(fs.existsSync('./.test/.idea/.test.iml')).toBe(true);
      expect(getFileContents('./.test/.idea/.test.iml')).toContain('test100');
    });
  });

  it('should append the dirs to the file', function() {
    var execDone = false;
    runs(function () {
      exec('cd ./.test/ && node ../index.js test100 test300/test test400', function () {
        puts.apply(this, arguments);
        execDone = true;
      });
    });

    waitsFor(function () {
      return execDone;
    }, 'Exec to finish', 500);
    runs(function () {
      expect(fs.existsSync('./.test/.idea/.test.iml')).toBe(true);
      var contents = getFileContents('./.test/.idea/.test.iml');
      expect(contents).toContain('test100');
      expect(contents).toContain('test300');
      expect(contents).toContain('test400');
      expect(contents).toMatch(/\<excludeFolder.*test400.*>/);
    });
  });
});

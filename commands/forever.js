
const { createMachine, Machine, actions, interpret, spawn  } = require('xstate');
var testImpl = require('../testable_driver');
var axios = require('axios');
var builder = require('../lib/builder');
var sources = require('../lib/sources');
var outputs = require('../lib/outputs');

function sidecarLoop (driver, input, output) {
  
  // everything known for output
  // output must be passed into builder, before generate_driver is
  // called.
  var endpoint = outputs(output)(output, axios);
  var make = builder({ output: endpoint });
  // var make = builder({ output });

  console.log("INPUT PARAMS", input);
  var impl = driver(input, axios);
  // var impl = testImpl.fakeFrame({ }, axios);

  impl.generate_driver(make);

  var built = make( );
  // console.log("BUILDER OUTPUT", built);
  console.log("BUILDER OUTPUT", JSON.stringify(built, null, 2));
  return built;

}

function main (argv) {
  console.log("STARTING", argv);
  // selected output
  // argv.nightscoutEndpoint;
  // argv.apiSecret;
  // 
  var output = { name: 'nightscout', url: argv.nightscoutEndpoint, apiSecret: argv.apiSecret };
  console.log("CONFIGURED OUTPUT", output);
  var spec = { kind: argv.source };
  var driver = sources(spec);
  var validated = driver.validate(argv);
  if (validated.errors) {
    validated.errors.forEach((item) => {
      console.log(item);
    });
  }

  if (!validated.ok) {
    console.log("Invalid, disabling nightscout-connect", validated);
    process.exit(1);
    return;
  }

  console.log("CONFIGURED INPUT", validated.config);
  var things = sidecarLoop(driver, validated.config, output);
  console.log(things);
  var actor = interpret(things);
  actor.start( );
  actor.send({type: 'START'});
  setTimeout(( ) => {
  actor.send({type: 'STOP'});
  }, 60000 * 5);

}


module.exports.command = 'forever [hint]';
module.exports.describe = 'Runs as a background server forever.'
module.exports.builder = (yargs) => yargs.option('source', { alias: 'hint', describe: 'source input', default: 'default', choices: Object.keys(sources.kinds)})
module.exports.handler = main;

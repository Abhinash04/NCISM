/**
 * Wraps a plain { name: value } fixture object into the engine's
 * ParameterSet shape ({ name: { value, status: 'found', source } }).
 * Keys absent from the fixture are simply absent — the evaluator treats
 * unknown parameters as insufficient data.
 */
function wrapParameters(values) {
  const parameters = {};
  for (const [name, value] of Object.entries(values)) {
    parameters[name] = { value, status: 'found', source: { extractor: 'fixture' } };
  }
  return parameters;
}

function loadParamsFixture(fixturePath) {
  const fixture = require(fixturePath);
  return wrapParameters(fixture.values);
}

module.exports = { wrapParameters, loadParamsFixture };

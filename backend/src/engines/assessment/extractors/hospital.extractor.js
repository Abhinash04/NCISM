const { found, missing, findNumber } = require('./utils');

const FIELDS = [
  { param: 'opdCount', label: /total number of OPD\b/i },
  { param: 'opdTotalPatients', label: /total number of patients attended OPD/i },
  { param: 'opdAverageDaily', label: /average attendance of patients? in OPD per day/i },
  { param: 'ipdTotalPatients', label: /(total )?(number|no\.?) of patients admitted/i },
  { param: 'bedOccupancyPercent', label: /average bed occupancy/i },
  { param: 'deliveries', label: /(number|no\.?) of deliveries/i },
  { param: 'operations', label: /(number|no\.?) of operations/i },
  { param: 'equipmentMeanPercent', label: /mean of general and essential equipment/i },
];

function extract(markdown, lines) {
  const params = {};
  for (const field of FIELDS) {
    const hit = findNumber(markdown, lines, field.label);
    params[field.param] = hit && hit.value !== null
      ? found(hit.value, 'hospital', hit.evidence)
      : missing();
  }
  params.centralRegistrationAvailable = missing();
  return params;
}

module.exports = { extract };

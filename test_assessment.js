const assessmentService = require('./backend/services/assessment.service');
const path = require('path');

async function test() {
    try {
        const result = await assessmentService.generateReport('test_job', path.resolve('markdown/AYU0659  100 intake capacity.md'));
        console.log(result.reportMd);
    } catch (e) {
        console.error(e);
    }
}
test();

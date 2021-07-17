const { expect, matchTemplate, MatchStyle } = require('@aws-cdk/assert');
const cdk = require('@aws-cdk/core');
const ApiLambdaJwt = require('../lib/api-lambda-jwt-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ApiLambdaJwt.ApiLambdaJwtStack(app, 'MyTestStack');
    // THEN
    expect(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});

const cdk = require('@aws-cdk/core');
const { RestApi, LambdaIntegration } = require('@aws-cdk/aws-apigateway');
const { Function, Runtime, Code } = require('@aws-cdk/aws-lambda');

class ApiLambdaJwtStack extends cdk.Stack {

  constructor(scope, id, props) {
    super(scope, id, props);

    // Lambda
    const animalLambda = new Function(this, 'AnimalLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda'),
      handler: 'animal.handler',
      functionName: 'RandomAnimalName',
      description: 'Ouputs a random animal name'
    });

    // Create API GW
    const api = new RestApi(this, 'workspace-api');
    // Add path and method to API
    api.root.addResource('login').addMethod('POST');
    api.root.addResource('refresh').addMethod('POST');
    api.root.addResource('animals').addMethod('GET', new LambdaIntegration(animalLambda));

    new cdk.CfnOutput(this, 'ApiGwUrlForWorkspace', {
      value: api.url
    });
  }
}

module.exports = { ApiLambdaJwtStack }

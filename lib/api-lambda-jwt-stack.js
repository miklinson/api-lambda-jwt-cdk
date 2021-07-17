const cdk = require('@aws-cdk/core');
const { RestApi } = require('@aws-cdk/aws-apigateway');
const { Function, Runtime, Code } = require('@aws-cdk/aws-lambda');

class ApiLambdaJwtStack extends cdk.Stack {

  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new RestApi(this, 'workspace-api');

    const login = api.root.addResource('login');
    login.addMethod('POST');

    const refresh = api.root.addResource('refresh');
    refresh.addMethod('POST');

    const animalLambda = new Function(this, 'AnimalLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda'),
      handler: 'animal.handler',
      environment: {
        
      },
    });
  }
}

module.exports = { ApiLambdaJwtStack }

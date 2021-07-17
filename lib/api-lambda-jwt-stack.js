const cdk = require('@aws-cdk/core');
const { RestApi, LambdaIntegration, RequestAuthorizer, IdentitySource } = require('@aws-cdk/aws-apigateway');
const { Function, Runtime, Code, LayerVersion } = require('@aws-cdk/aws-lambda');

class ApiLambdaJwtStack extends cdk.Stack {

  constructor(scope, id, props) {
    super(scope, id, props);

    // Lambda Layer
    const jwtLayer = new LayerVersion(this, 'JwtLayer', {
      code: Code.fromAsset('layers/jsonwebtoken'),
      compatibleRuntimes: [Runtime.NODEJS_14_X],
      description: 'JWT Node Module'
    });

    // Lambda
    const animalLambda = new Function(this, 'AnimalLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/animal'),
      handler: 'animal.handler',
      functionName: 'RandomAnimalName',
      description: 'Outputs a random animal name. Managed by: ApiLambdaJwtStack using CDK'
    });

    const loginLambda = new Function(this, 'LoginLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/login'),
      handler: 'login.handler',
      functionName: 'LoginJWT',
      description: 'Returns a JWT during login. Managed by: ApiLambdaJwtStack using CDK',
      layers: [jwtLayer],
      environment: {
        ACCESS_TOKEN_SECRET: 'myVerySecretToken',
        EXPIRES_IN: '3600'
      }
    });

    const authorizerLambda = new Function(this, 'AuthorizerLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/authorizer'),
      handler: 'authorizer.handler',
      functionName: 'AuthorizerJWT',
      description: 'Lambda Authorizer. Managed by: ApiLambdaJwtStack using CDK',
      layers: [jwtLayer],
      environment: {
        ACCESS_TOKEN_SECRET: 'myVerySecretToken',
      }
    });

    //Add Lambda Authorizer
    const jwtAuthorizer = new RequestAuthorizer(this, 'JwtAuthorizer', {
      handler: authorizerLambda,
      resultsCacheTtl: cdk.Duration.minutes(0),
      authorizerName: 'JwtAuthorizer',
      identitySources: [IdentitySource.header('Authorization')]
    });

    // Create API GW
    const api = new RestApi(this, 'workspace-api');
    // Add path and method to API
    api.root.addResource('login').addMethod('POST', new LambdaIntegration(loginLambda));
    api.root.addResource('refresh').addMethod('POST');
    api.root.addResource('animals').addMethod('GET', new LambdaIntegration(animalLambda), {
      authorizer: jwtAuthorizer
    });

    new cdk.CfnOutput(this, 'ApiGwUrlForWorkspace', {
      value: api.url
    });
  }
}

module.exports = { ApiLambdaJwtStack }

const cdk = require('@aws-cdk/core');
const { RestApi, LambdaIntegration, RequestAuthorizer, IdentitySource, ResponseType, EndpointType } = require('@aws-cdk/aws-apigateway');
const { Function, Runtime, Code, LayerVersion } = require('@aws-cdk/aws-lambda');
const { HostedZone, ARecord, RecordTarget } = require('@aws-cdk/aws-route53');
const { Stack } = require('@aws-cdk/core');
const { Certificate } = require('@aws-cdk/aws-certificatemanager');
const { ApiGatewayDomain } = require('@aws-cdk/aws-route53-targets');
const { Table, AttributeType, BillingMode } = require('@aws-cdk/aws-dynamodb');
const { ManagedPolicy, PolicyStatement, Effect, Role, ServicePrincipal } = require('@aws-cdk/aws-iam');

class ApiLambdaJwtStack extends Stack {

  constructor(scope, id, props) {
    super(scope, id, props);

    //Add DynamoDB Table
    const tokenTbl = new Table(this, 'TokenTable', {
      partitionKey: { name: 'refreshToken', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      tableName: 'token'
    });

    // Create Policy
    const dynamodbTokenPolicy = new ManagedPolicy(this, 'DynamoDBTokenTableFullAccess', {
      managedPolicyName: 'DynamoDBTokenTableFullAccess',
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['dynamodb:*'],
          resources: [tokenTbl.tableArn]
        })
      ]
    });

    // Create Role
    const loginJWTLambdaRole = new Role(this, 'LoginJwtLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'LoginJwtLambda',
      managedPolicies: [
        dynamodbTokenPolicy,
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ]
    });
    const refreshJWTLambdaRole = new Role(this, 'RefreshJwtLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'RefreshJwtLambda',
      managedPolicies: [
        dynamodbTokenPolicy,
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ]
    });
    const logoutJWTLambdaRole = new Role(this, 'LogoutJwtLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'LogoutJwtLambda',
      managedPolicies: [
        dynamodbTokenPolicy,
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ]
    });

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
      role: loginJWTLambdaRole,
      layers: [jwtLayer],
      environment: {
        ACCESS_TOKEN_SECRET: 'myVerySecretToken',
        REFRESH_TOKEN_SECRET: 'myRefreshSecretToken',
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
        REFRESH_TOKEN_SECRET: 'myRefreshSecretToken',
      }
    });

    const refreshLambda = new Function(this, 'RefreshLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/refresh'),
      handler: 'refresh.handler',
      functionName: 'RefreshJWT',
      description: 'Refresh JWT returns another access token. Managed by: ApiLambdaJwtStack using CDK',
      role: refreshJWTLambdaRole,
      layers: [jwtLayer],
      environment: {
        ACCESS_TOKEN_SECRET: 'myVerySecretToken',
        REFRESH_TOKEN_SECRET: 'myRefreshSecretToken',
        EXPIRES_IN: '3600',
      }
    });

    const logoutLambda = new Function(this, 'LogoutLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/logout'),
      handler: 'logout.handler',
      functionName: 'LogoutJWT',
      description: 'Destroy refresh token. Managed by: ApiLambdaJwtStack using CDK',
      role: logoutJWTLambdaRole,
      layers: [jwtLayer],
      environment: {
        ACCESS_TOKEN_SECRET: 'myVerySecretToken',
        REFRESH_TOKEN_SECRET: 'myRefreshSecretToken',
      }
    });

    //Get Certificate, returns ICertificate
    const uconCert = Certificate.fromCertificateArn(this, 'SSLCert', 'arn:aws:acm:ap-southeast-2:683044287129:certificate/c4f69b89-0ef8-4be7-a9b4-75845aeb9f0e');

    //Add Lambda Authorizer
    const jwtAuthorizer = new RequestAuthorizer(this, 'JwtAuthorizer', {
      handler: authorizerLambda,
      resultsCacheTtl: cdk.Duration.minutes(0),
      authorizerName: 'JwtAuthorizer',
      identitySources: [IdentitySource.header('Authorization')]
    });

    // Create API GW
    const api = new RestApi(this, 'workspace-api', {
      endpointTypes: [EndpointType.REGIONAL],
      description: 'JWT API. Managed by ApiLambdaJwtStack using CDK',
      domainName: {
        domainName: 'jwt-api.uconworkspace.com',
        endpointType: EndpointType.REGIONAL,
        certificate: uconCert,
      }
    });

    //Get the HostedZone (returns IHostedZone)
    const uConnectedHostedZone = HostedZone.fromLookup(this, 'UConnectedHostedZone', {
      domainName: 'uconworkspace.com'
    });

    new ARecord(this, 'JwtAPiRecord', {
      recordName: 'jwt-api',
      zone: uConnectedHostedZone,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(api.domainName))
    });

    // Add path and method to API
    api.root.addResource('login').addMethod('POST', new LambdaIntegration(loginLambda));
    api.root.addResource('refresh').addMethod('POST', new LambdaIntegration(refreshLambda));
    api.root.addResource('logout').addMethod('DELETE', new LambdaIntegration(logoutLambda));
    api.root.addResource('animals').addMethod('GET', new LambdaIntegration(animalLambda), {
      authorizer: jwtAuthorizer
    });
    //Add Gateway Response Mapping Template
    api.addGatewayResponse('JwtErrorMessage', {
      type: ResponseType.ACCESS_DENIED,
      templates: {
        'application/json': '{"message": "$context.authorizer.message"}'
      }
    });

    new cdk.CfnOutput(this, 'ApiGwUrlForWorkspace', {
      value: api.url
    });
  }
}

module.exports = { ApiLambdaJwtStack }

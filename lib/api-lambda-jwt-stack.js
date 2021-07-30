const cdk = require('@aws-cdk/core');
const { RestApi, LambdaIntegration, RequestAuthorizer, IdentitySource, ResponseType, EndpointType, HttpIntegration } = require('@aws-cdk/aws-apigateway');
const { Function, Runtime, Code, LayerVersion } = require('@aws-cdk/aws-lambda');
const { HostedZone, ARecord, RecordTarget } = require('@aws-cdk/aws-route53');
const { Stack, RemovalPolicy } = require('@aws-cdk/core');
const { Certificate } = require('@aws-cdk/aws-certificatemanager');
const { ApiGatewayDomain } = require('@aws-cdk/aws-route53-targets');
const { Table, AttributeType, BillingMode } = require('@aws-cdk/aws-dynamodb');
const { ManagedPolicy, PolicyStatement, Effect, Role, ServicePrincipal } = require('@aws-cdk/aws-iam');
const { RetentionDays } = require('@aws-cdk/aws-logs');
const ec2 = require('@aws-cdk/aws-ec2');
const { Subnet, Vpc } = require('@aws-cdk/aws-ec2');

class ApiLambdaJwtStack extends Stack {

  constructor(scope, id, props) {
    super(scope, id, props);

    // Get context
    const lbEndpoint = this.node.tryGetContext('load_balancer_endpoint');
    const vpcId = this.node.tryGetContext('vpc').id;
    const internalSubnet1 = this.node.tryGetContext('vpc').internalSubnet1;
    const internalSubnet2 = this.node.tryGetContext('vpc').internalSubnet2;
    const accessTokenSecret = this.node.tryGetContext('accessTokenSecret');
    const refreshTokenSecret = this.node.tryGetContext('refreshTokenSecret');
    const domainName = this.node.tryGetContext('domainName');
    const dbHost = this.node.tryGetContext('dbHost');
    const dbUser = this.node.tryGetContext('dbUser');
    const dbPassword = this.node.tryGetContext('dbPassword');
    const dbName = this.node.tryGetContext('dbName');
  
    const liveVpc =  Vpc.fromLookup(this, 'getVPC', {
      isDefault: false,
      vpcId: vpcId
    });

    //Add DynamoDB Table
    const tokenTbl = new Table(this, 'TokenTable', {
      partitionKey: { name: 'refreshToken', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // destroy the table during stack delete
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
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
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
    const queryEmailLambdaRole = new Role(this, 'QueryEmailLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'QueryEmailLambda',
      managedPolicies: [
        dynamodbTokenPolicy,
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ]
    });

    // Lambda Layer
    const jwtLayer = new LayerVersion(this, 'JwtLayer', {
      code: Code.fromAsset('layers/jsonwebtoken'),
      compatibleRuntimes: [Runtime.NODEJS_14_X],
      description: 'JWT Node Module'
    });

    const bcryptjsLayer = new LayerVersion(this, 'BcryptjsLayer', {
      code: Code.fromAsset('layers/bcryptjs'),
      compatibleRuntimes: [Runtime.NODEJS_14_X],
      description: 'BcryptJS Node Module'
    });

    const mysqlLayer = new LayerVersion(this, 'MySqlLayer', {
      code: Code.fromAsset('layers/mysql'),
      compatibleRuntimes: [Runtime.NODEJS_14_X],
      description: 'MySQL Node Module'
    });

    // Define log retentiod period for Lambda, in cloud watch logs
    const logRetentionDuration = RetentionDays.ONE_MONTH;
    // Lambda
    const animalLambda = new Function(this, 'AnimalLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/animal'),
      handler: 'animal.handler',
      functionName: 'RandomAnimalName',
      description: 'Outputs a random animal name. Managed by: ApiLambdaJwtStack using CDK',
      memorySize: 512,
      logRetention: logRetentionDuration
    });

    const loginLambda = new Function(this, 'LoginLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/login'),
      handler: 'login.handler',
      functionName: 'LoginJWT',
      vpc: liveVpc,
      vpcSubnets: {
        subnets: [ Subnet.fromSubnetId(this, 'InternalSubnet1', internalSubnet1), Subnet.fromSubnetId(this, 'InternalSubnet2', internalSubnet2), ]
      },
      description: 'Returns a JWT during login. Managed by: ApiLambdaJwtStack using CDK',
      role: loginJWTLambdaRole,
      logRetention: logRetentionDuration,
      layers: [jwtLayer, mysqlLayer, bcryptjsLayer],
      memorySize: 512,
      environment: {
        ACCESS_TOKEN_SECRET: accessTokenSecret,
        REFRESH_TOKEN_SECRET: refreshTokenSecret,
        EXPIRES_IN: '3600',
        DB_HOST: dbHost,
        DB_NAME: dbName,
        DB_USER: dbUser,
        DB_PASSWORD: dbPassword
      }
    });

    const queryEmailLambda = new Function(this, 'QueryEmailLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/query-email'),
      handler: 'query-email.handler',
      functionName: 'QueryEmail',
      vpc: liveVpc,
      vpcSubnets: {
        subnets: [ Subnet.fromSubnetId(this, 'QInternalSubnet1', internalSubnet1), Subnet.fromSubnetId(this, 'QInternalSubnet2', internalSubnet2), ]
      },
      description: 'Query Email, returns obscured list of phone numbers',
      role: queryEmailLambdaRole,
      logRetention: logRetentionDuration,
      layers: [mysqlLayer],
      memorySize: 512,
      environment: {
        DB_HOST: dbHost,
        DB_NAME: dbName,
        DB_USER: dbUser,
        DB_PASSWORD: dbPassword
      }
    });

    const authorizerLambda = new Function(this, 'AuthorizerLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/authorizer'),
      handler: 'authorizer.handler',
      functionName: 'AuthorizerJWT',
      description: 'Lambda Authorizer. Managed by: ApiLambdaJwtStack using CDK',
      logRetention: logRetentionDuration,
      layers: [jwtLayer],
      memorySize: 512,
      environment: {
        ACCESS_TOKEN_SECRET: accessTokenSecret,
        REFRESH_TOKEN_SECRET: refreshTokenSecret,
      }
    });

    const refreshLambda = new Function(this, 'RefreshLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/refresh'),
      handler: 'refresh.handler',
      functionName: 'RefreshJWT',
      description: 'Refresh JWT returns another access token. Managed by: ApiLambdaJwtStack using CDK',
      role: refreshJWTLambdaRole,
      logRetention: logRetentionDuration,
      layers: [jwtLayer],
      memorySize: 256,
      environment: {
        ACCESS_TOKEN_SECRET: accessTokenSecret,
        REFRESH_TOKEN_SECRET: refreshTokenSecret,
        EXPIRES_IN: '3600',
      }
    });

    const logoutLambda = new Function(this, 'LogoutLambda', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda/logout'),
      handler: 'logout.handler',
      functionName: 'LogoutJWT',
      description: 'Destroy refresh token. Managed by: ApiLambdaJwtStack using CDK',
      logRetention: logRetentionDuration,
      role: logoutJWTLambdaRole,
      layers: [jwtLayer],
      memorySize: 256,
      environment: {
        ACCESS_TOKEN_SECRET: accessTokenSecret,
        REFRESH_TOKEN_SECRET: refreshTokenSecret,
      }
    });

    //Get Certificate, returns ICertificate
    const uconCert = Certificate.fromCertificateArn(this, 'SSLCert', 'arn:aws:acm:ap-southeast-2:683044287129:certificate/c4f69b89-0ef8-4be7-a9b4-75845aeb9f0e');

    //Add Lambda Authorizer
    const jwtAuthorizer = new RequestAuthorizer(this, 'JwtAuthorizer', {
      handler: authorizerLambda,
      resultsCacheTtl: cdk.Duration.minutes(10),
      authorizerName: 'JwtAuthorizer',
      identitySources: [IdentitySource.header('Authorization')]
    });

    // Create API GW
    const api = new RestApi(this, 'workspace-api', {
      endpointTypes: [EndpointType.REGIONAL],
      description: 'JWT API. Managed by ApiLambdaJwtStack using CDK',
      domainName: {
        domainName: `jwt-api.${domainName}`,
        endpointType: EndpointType.REGIONAL,
        certificate: uconCert,
      }
    });

    //Get the HostedZone (returns IHostedZone)
    const uConnectedHostedZone = HostedZone.fromLookup(this, 'UConnectedHostedZone', {
      domainName: domainName
    });

    new ARecord(this, 'JwtAPiRecord', {
      recordName: 'jwt-api',
      zone: uConnectedHostedZone,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(api.domainName))
    });

    // Add path and method to API
    api.root.addResource('login').addMethod('POST', new LambdaIntegration(loginLambda));
    api.root.addResource('query-email').addMethod('POST', new LambdaIntegration(queryEmailLambda));
    api.root.addResource('refresh').addMethod('POST', new LambdaIntegration(refreshLambda));
    api.root.addResource('logout').addMethod('DELETE', new LambdaIntegration(logoutLambda));
    api.root.addResource('animals').addMethod('GET', new LambdaIntegration(animalLambda), {
      authorizer: jwtAuthorizer
    });
    const member = api.root.addResource('member');
    member.addResource('query-email').addMethod('POST');

    const lbInteg = new HttpIntegration(`${lbEndpoint}/{proxy}`, {
      options: {
        requestParameters: {
          "integration.request.path.proxy": "method.request.path.proxy",
        }, 
      },
      proxy: true,
      });
    const proxyMethodOptions = {
        methodResponses: [{ statusCode: "200" }],
        requestParameters: {
          "method.request.path.proxy": true,
        },
        authorizer: jwtAuthorizer
      }

    api.root.addResource('food').addProxy({
       defaultIntegration: lbInteg,
       defaultMethodOptions: proxyMethodOptions
      })

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

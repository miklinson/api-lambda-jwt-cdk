const cdk = require('@aws-cdk/core');
const lambda = require('@aws-cdk/aws-lambda');
const apigateway = require('@aws-cdk/aws-apigateway');
const { RestApi } = require('@aws-cdk/aws-apigateway');

class ApiLambdaJwtStack extends cdk.Stack {
  
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new RestApi();
    
    const login = api.root.addResource('login');
    login.addMethod('POST');
    
    const refresh = api.root.addResource('refresh');
    refresh.addResource('POST');
  }
}

module.exports = { ApiLambdaJwtStack }

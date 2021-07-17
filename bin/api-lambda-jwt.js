#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { ApiLambdaJwtStack } = require('../lib/api-lambda-jwt-stack');

const app = new cdk.App();
new ApiLambdaJwtStack(app, 'ApiLambdaJwtStack', {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION, 
  },
});
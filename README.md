## JWT Auth using API Gateway + Lambda + Lambda Authorizer
The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Deploy
Bootstrap is required when deploying Lambdas
### Install
```
$ npm install
```
Go to layers/{module}/nodejs
```
$ npm install
```
### Run
```
$ cdk bootsrap
$ cdk deploy
```
or
```
$ cdk bootsrap --profile profile-name
$ cdk deploy --profile profile-name
```

## Useful commands

 * `npm run test`         perform the jest unit tests
 * `cdk deploy`           deploy this stack to your default AWS account/region
 * `cdk diff`             compare deployed stack with current state
 * `cdk synth`            emits the synthesized CloudFormation template

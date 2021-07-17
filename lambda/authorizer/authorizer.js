const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    let auth = 'Deny';
    //Get JWT Token
    let headerToken = event.headers['Authorization'];
    let token = headerToken && headerToken.replace('Bearer ', '');
    //Check the JWT token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,user)=>{
        if(err) auth='Deny';
        else auth='Allow';
    });
    //Get the ARN
    const methodArn = event.methodArn;
    //Authorizer
    switch (auth) {
        case 'Allow':
            return generateAuthResponse('user', 'Allow', methodArn);
        default:
            return generateAuthResponse('user', 'Deny', methodArn);
    }
}

function generateAuthResponse(principalId, effect, methodArn) {
    const policyDocument = generatePolicyDocument(effect, methodArn);
    return { principalId, policyDocument }
}

function generatePolicyDocument(effect, methodArn){
    if(!effect || !methodArn) return null
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            { Action: 'execute-api:Invoke', Effect: effect, Resource: methodArn }
        ],
    };
    return policyDocument;
}
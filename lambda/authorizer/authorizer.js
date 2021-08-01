const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    let auth = 'Deny';
    //Get JWT Token
    let headerToken = event.headers['Authorization'];
    let token = headerToken && headerToken.replace('Bearer ', '');
    //Check the JWT token
    let principal;
    let errorMessage;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            errorMessage = err.message;
            auth = 'Deny';
        } else {
            decoded ? principal = decoded.email : principal = '*';
            auth = 'Allow';
        }
    });
    //Get the ARN
    const methodArn = [
        "arn:aws:execute-api:ap-southeast-2:683044287129:hcsms00rp6/prod/*/member/*",
        "arn:aws:execute-api:ap-southeast-2:683044287129:hcsms00rp6/prod/GET/animals"
    ]
    //Authorizer
    switch (auth) {
        case 'Allow':
            return generateAuthResponse(principal, 'Allow', methodArn, errorMessage);
        default:
            return generateAuthResponse(principal, 'Deny', methodArn, errorMessage);
    }
}

function generateAuthResponse(principalId, effect, methodArn, errorMsg) {
    const policyDocument = generatePolicyDocument(effect, methodArn);
    let context = {
        'message': errorMsg,
    }
    if (effect == 'Deny') return { principalId, policyDocument, context }
    return { principalId, policyDocument }
}

function generatePolicyDocument(effect, methodArn, errorMsg) {
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            { Action: 'execute-api:Invoke', Effect: effect, Resource: methodArn }
        ],
    };
    return policyDocument;
}
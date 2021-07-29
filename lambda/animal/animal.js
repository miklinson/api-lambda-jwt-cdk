exports.handler = async function (event, context) {
    
    let animals = ["Narwhal", "Buffalo", "Gorilla", "Orca", "Black Mamba", "Puma", "Lobster", "Eagle", "Falcon", "Pigeon", "Kangaroo", "Koala"];
    const random = Math.floor(Math.random() * animals.length);
    let responseBody = {
        animal: animals[random],
        user: event.requestContext.authorizer.principalId
    };
    let response = {
        statusCode: 200,
        headers: {
            "x-custom-header": "custom-header-value"
        },
        body: JSON.stringify(responseBody)
    };
    return response;
}
export async function sendNotification(tokenDetails, keyDetails, notificationContent) {
    // here extract the

    const {
        endpoint,
        expirationTime,
        keys: { p256dh, auth },
        hostname,
        browser,
        country
    } = tokenDetails;

    if (!keyDetails) {
        throw new Error('Missing keyDetails');
    }
    // here check the key is valid or not and he has subscribed for web push
    const { notificationName, title, messagebody, image, icon } = notificationContent;
    sendDetailsToNBE(tokenDetails, keyDetails, notificationContent);
}

export async function sendDetailsToNBE(tokenDetails, keyDetails, notificationContent) {
    try {
        const response = await fetch('http://localhost:3030/api/pushtokens/sendToOnlyone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokenDetails,
                keyDetails,
                notificationContent
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send to backend: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Notification sent to backend:', result);
        return result;

    } catch (error) {
        console.error('Error sending to backend:', error.message);
        throw error;
    }
}
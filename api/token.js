/**
 * @file api/token.js
 * @description Vercel serverless function to securely exchange Discord OAuth2 code for an access token.
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { code, redirect_uri } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Missing authorization code' });
        }

        const clientId = process.env.VITE_DISCORD_CLIENT_ID || '1512833894158696478';
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;

        if (!clientSecret) {
            console.error('Missing DISCORD_CLIENT_SECRET environment variable');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const params = {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
        };

        if (redirect_uri) {
            params.redirect_uri = redirect_uri;
        }

        // Exchange code for access token from Discord OAuth2
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(params),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Discord token exchange failed:', errorBody);
            return res.status(response.status).json({ error: 'Failed to exchange token with Discord' });
        }

        const data = await response.json();
        return res.status(200).json({
            access_token: data.access_token,
            expires_in: data.expires_in,
        });
    } catch (err) {
        console.error('Token endpoint error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Vercel Serverless Function - GitHub OAuth Callback
export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { code } = req.body;
        const clientId = process.env.GH_CLIENT_ID;
        const clientSecret = process.env.GH_CLIENT_SECRET;

        if (!code || !clientId || !clientSecret) {
            return res.status(400).json({ error: '필수 파라미터 누락' });
        }

        // GitHub에서 액세스 토큰 받기
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            return res.status(400).json({ error: '인증 실패' });
        }

        // GitHub 사용자 정보 가져오기
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        });

        const userData = await userResponse.json();

        // 간단한 토큰 생성 (실무에서는 더 복잡한 보안 필요)
        const sessionToken = Buffer.from(`${userData.id}:${Date.now()}`).toString('base64');

        res.status(200).json({
            sessionToken: sessionToken,
            user: {
                id: userData.id,
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name
            }
        });
    } catch (error) {
        console.error('GitHub 콜백 오류:', error);
        res.status(500).json({ error: 'GitHub 인증 실패' });
    }
}

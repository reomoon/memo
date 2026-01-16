const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 세션 저장소 (간단한 메모리 저장소)
const sessions = new Map();

// 정적 파일 제공
app.use(express.static('.'));

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GITHUB_API_URL = 'https://api.github.com';

// ================================================
// GitHub OAuth API
// ================================================

// GitHub 로그인 리다이렉트
app.get('/api/auth/github', (req, res) => {
    const clientId = process.env.GH_CLIENT_ID;
    const redirectUri = req.query.redirect || 'http://localhost:3000/callback';
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user`;
    res.json({ authUrl: githubAuthUrl });
});

// GitHub 콜백 처리
app.post('/api/auth/github/callback', async (req, res) => {
    try {
        const { code } = req.body;
        const clientId = process.env.GH_CLIENT_ID;
        const clientSecret = process.env.GH_CLIENT_SECRET;

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
        const userResponse = await fetch(`${GITHUB_API_URL}/user`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        });

        const userData = await userResponse.json();

        // 세션 저장
        const sessionId = Math.random().toString(36).substring(7);
        sessions.set(sessionId, {
            accessToken: accessToken,
            user: {
                id: userData.id,
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name
            },
            createdAt: Date.now()
        });

        res.json({
            sessionId: sessionId,
            user: sessions.get(sessionId).user
        });
    } catch (error) {
        console.error('GitHub 콜백 오류:', error);
        res.status(500).json({ error: 'GitHub 인증 실패' });
    }
});

// 사용자 정보 조회
app.get('/api/auth/user', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(401).json({ error: '인증되지 않음' });
    }

    res.json({ user: session.user });
});

// 로그아웃
app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    sessions.delete(sessionId);
    res.json({ message: '로그아웃 완료' });
});

// ================================================
// 제목 생성 API
// ================================================
app.post('/api/generateTitle', async (req, res) => {
    try {
        const { body } = req.body;
        
        if (!body) {
            return res.status(400).json({ error: '본문이 필요합니다' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
        }

        const response = await fetch(
            `${GEMINI_API_URL}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `다음 본문을 바탕으로 간단하고 명확한 제목 1개를 생성해주세요. 제목만 반환하세요:\n\n${body}`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        const title = data.candidates[0].content.parts[0].text.trim();
        res.json({ title });
    } catch (error) {
        console.error('제목 생성 오류:', error);
        res.status(500).json({ error: '제목 생성 실패' });
    }
});

// 메모 요약 API
app.post('/api/summarize', async (req, res) => {
    try {
        const { body } = req.body;
        
        if (!body) {
            return res.status(400).json({ error: '본문이 필요합니다' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
        }

        const response = await fetch(
            `${GEMINI_API_URL}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `다음 메모를 2-3줄로 요약해주세요:\n\n${body}`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        const summary = data.candidates[0].content.parts[0].text.trim();
        res.json({ summary });
    } catch (error) {
        console.error('요약 생성 오류:', error);
        res.status(500).json({ error: '요약 생성 실패' });
    }
});

// 카테고리 자동 분류 API
app.post('/api/classifyCategory', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: '텍스트가 필요합니다' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
        }

        const response = await fetch(
            `${GEMINI_API_URL}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `다음 텍스트를 분석하여 가장 적절한 카테고리 1개를 선택하세요. 
선택지: 일상, 업무, 아이디어, 학습, 건강, 금융, 취미, 쇼핑, 기타

응답은 "카테고리명"만 반환하세요:

${text}`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        const category = data.candidates[0].content.parts[0].text.trim();
        res.json({ category: category || '기타' });
    } catch (error) {
        console.error('카테고리 분류 오류:', error);
        res.status(500).json({ error: '카테고리 분류 실패' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});

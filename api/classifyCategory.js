// Vercel Serverless Function - 카테고리 자동 분류
// 이 함수는 Vercel에서 API 키를 안전하게 처리합니다

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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: '텍스트가 필요합니다' });
        }

        // 환경변수에서 API 키 가져오기 (안전함)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
        }

        const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

        const response = await fetch(
            `${GEMINI_API_URL}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `다음 텍스트를 분석하여 가장 적절한 카테고리 1개를 선택하세요. 
선택지: 일상, 업무, 아이디어, 학습, 건강, 재정, 취미, 쇼핑, 기타

응답은 "카테고리명"만 반환하세요:

${text}`
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API 오류: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('유효하지 않은 API 응답');
        }

        const category = data.candidates[0].content.parts[0].text.trim();

        res.status(200).json({ 
            category: category || '기타'
        });
    } catch (error) {
        console.error('카테고리 분류 오류:', error);
        res.status(500).json({ error: '카테고리 분류 실패' });
    }
}

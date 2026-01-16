// Vercel Serverless Function - 제목 자동 생성
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
        const { body } = req.body;

        if (!body) {
            return res.status(400).json({ error: '본문이 필요합니다' });
        }

        // 환경변수에서 API 키 가져오기 (안전함)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
        }

        // Gemini API 호출
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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

        if (!response.ok) {
            return res.status(response.status).json({ error: data });
        }

        const title = data.candidates[0].content.parts[0].text.trim();
        res.status(200).json({ title });
    } catch (error) {
        console.error('제목 생성 오류:', error);
        res.status(500).json({ error: '제목 생성 실패: ' + error.message });
    }
}

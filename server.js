const express = require('express');
const { webtoons, WebtoonsDetail, WebtoonsViewer } = require('./scraper');

const app = express();
const port = 3001;

const getListUrl = (titleNo) => {
    // URL list episode harus dikonstruksi berdasarkan titleNo, ini adalah asumsi generik.
    // Anda mungkin perlu menyesuaikan genre berdasarkan data trending, tapi ini bekerja untuk demo.
    return `https://m.webtoons.com/id/action/spirit-fingers/list?title_no=${titleNo}`; 
};

const renderLayout = (title, content) => `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: sans-serif; margin: 0; background-color: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        a { color: #00C462; text-decoration: none; }
        a:hover { text-decoration: underline; }
        h1, h2 { color: #00C462; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        .item { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px; display: flex; gap: 15px; }
        .item img { width: 100px; height: 100px; object-fit: cover; border-radius: 4px; }
        .viewer-img { width: 100%; max-width: 600px; display: block; margin: 0 auto; border: 1px solid #000; }
        .viewer-container { max-width: 600px; margin: 0 auto; padding: 0; }
    </style>
</head>
<body>
    <div class="container">
        <p><a href="/">⌂ Home</a></p>
        ${content}
    </div>
</body>
</html>
`;


app.get('/', async (req, res) => {
    try {
        const data = await webtoons();
        const trending = data?.trending.slice(0, 10) || [];

        const listItems = trending.map(item => `
            <div class="item">
                <a href="/detail/${item.title_no}" title="Lihat Detail ${item.title}">
                    <img src="${item.thumbnail}" alt="${item.title}" loading="lazy">
                </a>
                <div>
                    <h3><a href="/detail/${item.title_no}">${item.rank}. ${item.title}</a></h3>
                    <p>${item.genre}</p>
                </div>
            </div>
        `).join('');

        const html = renderLayout(
            'Webtoons Home (Trending)',
            `<h1>Webtoons Trending (10 Teratas)</h1>${listItems}`
        );
        res.send(html);

    } catch (error) {
        res.status(500).send(renderLayout('Error', `<h1>Error Home:</h1><p>${error.message}</p>`));
    }
});


app.get('/detail/:titleNo', async (req, res) => {
    try {
        const titleNo = req.params.titleNo;
        const detailUrl = getListUrl(titleNo); 
        
        const data = await WebtoonsDetail(detailUrl);

        if (!data) return res.status(404).send(renderLayout('Not Found', `<h1>Webtoon dengan title_no ${titleNo} tidak ditemukan.</h1>`));

        const episodesList = data.episodes.map(ep => {
            const link = ep.link;
            const viewerPath = `/viewer/${titleNo}/${ep.episodeNo}?link=${encodeURIComponent(link)}`;

            return `
                <li>
                    <a href="${viewerPath}">
                        ${ep.episodeNumber}: ${ep.title} (${ep.date})
                    </a>
                </li>
            `;
        }).join('');

        const html = renderLayout(
            `Detail ${data.title}`,
            `
            <h1>${data.title}</h1>
            <div class="item">
                <img src="${data.thumbnail}" alt="${data.title}">
                <div>
                    <p><b>Genre:</b> ${data.genre}</p>
                    <p><b>Kreator:</b> ${data.authors.map(a => a.name).join(', ')}</p>
                    <p><b>Jadwal:</b> ${data.updateSchedule}</p>
                    <p><b>Sinopsis:</b> ${data.description.substring(0, 200)}...</p>
                </div>
            </div>
            
            <h2>Daftar Episode (${data.episodes.length})</h2>
            <ul style="list-style-type: none; padding: 0;">${episodesList}</ul>
            `
        );
        res.send(html);

    } catch (error) {
        res.status(500).send(renderLayout('Error', `<h1>Error Detail:</h1><p>${error.message}</p>`));
    }
});


app.get('/viewer/:titleNo/:episodeNo', async (req, res) => {
    try {
        const viewerLink = req.query.link;
        
        if (!viewerLink) {
             return res.status(400).send(renderLayout('Error', '<h1>Link Viewer Tidak Ada</h1>'));
        }

        const data = await WebtoonsViewer(viewerLink);

        if (!data || data.images.length === 0) {
             return res.status(404).send(renderLayout('Viewer Error', `<h1>Gagal memuat Gambar.</h1>`));
        }

        const imageTags = data.images.map((src, index) => 
            `<img class="viewer-img" src="${src}" alt="Panel ${index + 1}" loading="lazy">`
        ).join('<br>');

        const html = renderLayout(
            `Baca: ${data.episodeTitle}`,
            `
            <h1>${data.title}</h1>
            <h2>${data.episodeTitle}</h2>
            <p style="text-align: center;"><a href="/detail/${req.params.titleNo}">Kembali ke Daftar Episode</a></p>
            <div class="viewer-container">${imageTags}</div>
            `
        );
        res.send(html.replace('<div class="container">', '').replace('</div></body></html>', '</div></body></html>')); 

    } catch (error) {
        res.status(500).send(renderLayout('Error', `<h1>Error Viewer:</h1><p>${error.message}</p>`));
    }
});


app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;

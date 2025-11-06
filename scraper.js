const axios = require('axios');
const cheerio = require('cheerio');

const commonAxiosConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    }
};

async function webtoons() {
    try {
        const response = await axios.get('https://www.webtoons.com/id/', commonAxiosConfig);
        const html = response.data;
        const $ = cheerio.load(html);

        const result = { trending: [], popular: [] };

        $('._trending_title_a').each((index, element) => {
            const $el = $(element);
            const rank = parseInt($el.attr('data-rank'));
            const title = $el.find('.title').text().trim();
            const title_no = parseInt($el.attr('data-title-no'));
            const genre = $el.find('.genre').text().trim();
            const url = $el.attr('href');
            const thumbnail = $el.find('img').attr('src');
            if (rank && title) {
                result.trending.push({ rank, title, title_no, genre, url, thumbnail });
            }
        });

        $('._popular_title_a').each((index, element) => {
            const $el = $(element);
            const rank = parseInt($el.attr('data-rank'));
            const title = $el.find('.title').text().trim();
            const title_no = parseInt($el.attr('data-title-no'));
            const genre = $el.find('.genre').text().trim();
            const url = $el.attr('href');
            const thumbnail = $el.find('img').attr('src');
            if (rank && title) {
                result.popular.push({ rank, title, title_no, genre, url, thumbnail });
            }
        });

        result.trending.sort((a, b) => a.rank - b.rank);
        result.popular.sort((a, b) => a.rank - b.rank);

        return result;
    } catch (error) {
        console.error('Error fetching trending/popular data:', error.message);
        return null;
    }
}

async function WebtoonsSearch(query) {
    try {
        const url = `https://m.webtoons.com/id/search?keyword=${encodeURIComponent(query)}`;
        const response = await axios.get(url, commonAxiosConfig);
        const html = response.data;
        const $ = cheerio.load(html);
        
        const results = { original: [], canvas: [] };

        $('.webtoon_list_wrap').first().find('.webtoon_list li').each((index, element) => {
            const $el = $(element);
            const title = $el.find('.info_text .title').text().trim();
            const author = $el.find('.info_text .author').text().trim();
            const viewCount = $el.find('.info_text .view_count').text().trim();
            const link = $el.find('a.link').attr('href');
            const image = $el.find('.image_wrap img').attr('src');
            const isNew = $el.find('.badge_new2').length > 0;
            results.original.push({ title, author, viewCount, link, image, isNew });
        });

        $('.webtoon_list_wrap').last().find('.webtoon_list.type_small li').each((index, element) => {
            const $el = $(element);
            const title = $el.find('.info_text .title').text().trim();
            const author = $el.find('.info_text .author').text().trim();
            const viewCount = $el.find('.info_text .view_count').text().trim();
            const link = $el.find('a.link').attr('href');
            const image = $el.find('.image_wrap img').attr('src');
            results.canvas.push({ title, author, viewCount, link, image });
        });

        return results;
    } catch (error) {
        console.error('Error fetching search data:', error.message);
        return null;
    }
}

async function WebtoonsDetail(url) {
    try {
        const response = await axios.get(url, commonAxiosConfig);
        const html = response.data;
        const $ = cheerio.load(html);
        
        const result = {
            title: $('.detail_header .subj').text().trim(),
            genre: $('.detail_header .genre').text().trim(),
            authors: [],
            description: $('.summary').text().trim(),
            thumbnail: $('.detail_header .thmb img').attr('src'),
            backgroundImage: $('.detail_bg').attr('style')?.replace(/background:url\('([^']+)'\).*$/, '$1'),
            stats: {
                views: $('.grade_area li:first-child .cnt').text().trim(),
                subscribers: $('.grade_area li:last-child .cnt').text().trim()
            },
            updateSchedule: $('.day_info').text().trim().replace('Baca Tiap ', ''),
            ageRating: $('.age_text').text().trim(),
            episodes: [],
            recommendations: []
        };

        const writer = $('.ly_creator_in .title').first().text().trim();
        const illustrator = $('.ly_creator_in .title').last().text().trim();
        if (writer && illustrator && writer !== illustrator) {
            result.authors = [{ role: 'Penulis', name: writer }, { role: 'Ilustrator', name: illustrator }];
        } else if (writer) {
             result.authors = [{ role: 'Kreator', name: writer }];
        }

        $('#_listUl ._episodeItem').each((index, element) => {
            const $episode = $(element);
            const episodeData = {
                episodeNo: $episode.attr('id')?.replace('episode_', ''),
                title: $episode.find('.subj span').text().trim(),
                date: $episode.find('.date').text().trim(),
                likes: $episode.find('.like_area').text().trim().replace('like', ''),
                thumbnail: $episode.find('.thmb img').attr('src'),
                link: $episode.find('a').attr('href'),
                episodeNumber: $episode.find('.tx').text().trim()
            };
            result.episodes.push(episodeData);
        });
        
        $('.detail_other .lst_type1 li').each((index, element) => {
            const $rec = $(element);
            const recommendation = {
                title: $rec.find('.subj').text().trim(),
                author: $rec.find('.author').text().trim(),
                views: $rec.find('.grade_num').text().trim(),
                thumbnail: $rec.find('.pic_area img').attr('src'),
                link: $rec.find('a').attr('href')
            };
            result.recommendations.push(recommendation);
        });

        return result;
    } catch (error) {
        console.error('Error fetching detail data:', error.message);
        return null;
    }
}

async function WebtoonsViewer(viewerUrl) {
    try {
        const config = { ...commonAxiosConfig, maxRedirects: 0 }; 
        const response = await axios.get(viewerUrl, config);
        const html = response.data;
        
        const $ = cheerio.load(html);
        
        const episodeImages = [];

        $('#_viewer_area .viewer_img').each((index, element) => {
            const $img = $(element).find('img');
            const src = $img.attr('data-url') || $img.attr('src'); 
            
            if (src) {
                episodeImages.push(src);
            }
        });

        return {
            title: $('.viewer_header .subj').text().trim(),
            episodeTitle: $('.viewer_header .title').text().trim(),
            images: episodeImages,
            imageCount: episodeImages.length
        };

    } catch (error) {
        if (error.response && error.response.status === 302) {
             const newLocation = error.response.headers.location;
             console.log(`Error 302: Redirecting to ${newLocation}`);
             
             if (newLocation) {
                 const absoluteUrl = newLocation.startsWith('http') ? newLocation : `https://m.webtoons.com${newLocation}`;
                 return WebtoonsViewer(absoluteUrl);
             }
             return null;
        }
        console.error('Error fetching viewer data:', error.message);
        return null;
    }
}

module.exports = {
    webtoons,
    WebtoonsSearch,
    WebtoonsDetail,
    WebtoonsViewer 
};

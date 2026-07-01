// https://discord.gg/Zg2XkS5hq9



const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { createPaginationSession } = require('../../lib/pagination');
const youtubesearchapi = require('youtube-search-api');

const statsCache = new Map();

function getChannelUrl(video) {
    try {
        const base = video?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
        if (base) return `https://www.youtube.com${base}`;
    } catch {}
    return null;
}

async function fetchVideoStats(videoId) {
    if (statsCache.has(videoId)) return statsCache.get(videoId);

    const result = { views: null, uploadDate: null, likes: null, dislikes: null, channelUrl: null };

    try {
        const [pageRes, dislikeRes] = await Promise.allSettled([
            fetch(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            }),
            fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`)
        ]);

        if (pageRes.status === 'fulfilled' && pageRes.value.ok) {
            const html = await pageRes.value.text();
            const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s)
                || html.match(/ytInitialData\s*=\s*(\{.+?\});/s);

            if (match) {
                const data = JSON.parse(match[1]);
                const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
                const primaryInfo = contents.find(c => c.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
                const secondaryInfo = contents.find(c => c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;

                result.views = primaryInfo?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText
                    || primaryInfo?.viewCount?.videoViewCountRenderer?.shortViewCount?.simpleText
                    || null;

                result.uploadDate = primaryInfo?.relativeDateText?.simpleText
                    || primaryInfo?.dateText?.simpleText
                    || null;

                const channelPath = secondaryInfo?.owner?.videoOwnerRenderer?.title?.runs?.[0]
                    ?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
                if (channelPath) result.channelUrl = `https://www.youtube.com${channelPath}`;

                try {
                    const topButtons = primaryInfo?.videoActions?.menuRenderer?.topLevelButtons || [];
                    for (const btn of topButtons) {
                        const likeBtn = btn?.segmentedLikeDislikeButtonViewModel
                            ?.likeButtonViewModel?.likeButtonViewModel
                            ?.toggleButtonViewModel?.toggleButtonViewModel
                            ?.defaultButtonViewModel?.buttonViewModel;
                        if (likeBtn) {
                            const txt = likeBtn.title || likeBtn.accessibilityText || '';
                            const num = txt.replace(/[^0-9KMB,.]/gi, '').trim();
                            if (num) { result.likes = txt; break; }
                        }
                    }
                } catch {}
            }
        }

        if (dislikeRes.status === 'fulfilled' && dislikeRes.value.ok) {
            const data = await dislikeRes.value.json();
            if (typeof data.dislikes === 'number') {
                result.dislikes = data.dislikes.toLocaleString('en-US');
            }
            if (typeof data.likes === 'number' && !result.likes) {
                result.likes = data.likes.toLocaleString('en-US');
            }
        }
    } catch {}

    statsCache.set(videoId, result);
    setTimeout(() => statsCache.delete(videoId), 10 * 60 * 1000);
    return result;
}

function formatDuration(simpleText) {
    if (!simpleText) return 'N/A';
    return simpleText;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('Search for YouTube videos')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search query for YouTube videos')
                .setRequired(true)
        ),

    name: 'youtube',
    aliases: ['yt'],
    category: 'social',
    deferReply: true,

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const send = interactionOrMessage.deferred
            ? opts => interactionOrMessage.editReply(opts)
            : opts => interactionOrMessage.reply(opts);
        const searchQuery = isSlash
            ? interactionOrMessage.options.getString('query')
            : args.join(' ');
        const userId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;

        if (!searchQuery) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### YouTube Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `youtube <search query>`'));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const searchResults = await youtubesearchapi.GetListByKeyword(searchQuery, false, 25);
            const videos = searchResults?.items?.filter(item => item.type === 'video') || [];

            if (videos.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### YouTube Search'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `No videos found for **${searchQuery}**.`
                    ));
                return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const totalPages = videos.length;

            const renderPage = async (pageIndex) => {
                const video = videos[pageIndex];
                const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
                const title = video.title || 'No Title';
                const channelName = video.channelTitle || 'Unknown Channel';
                const duration = formatDuration(video.length?.simpleText);

                const channelUrlFromSearch = getChannelUrl(video);
                const stats = await fetchVideoStats(video.id);

                const channelUrl = channelUrlFromSearch || stats.channelUrl;
                const channelDisplay = channelUrl
                    ? `[${channelName}](${channelUrl})`
                    : channelName;

                const views = stats.views ? `${stats.views}` : 'N/A';
                const uploadDate = stats.uploadDate || 'N/A';
                const likes = stats.likes || 'N/A';
                const dislikes = stats.dislikes !== null && stats.dislikes !== undefined ? `${stats.dislikes}` : 'N/A';

                const infoLines = [
                    `> **Duration:** ${duration}`,
                    `> **Uploaded:** ${uploadDate}`,
                    `> **Views:** ${views}`,
                    `> **Likes:** ${likes}`,
                    `> **Dislikes:** ${dislikes}`
                ].join('\n');

                const container = new ContainerBuilder().setAccentColor(0xFF0000)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## [${title}](${videoUrl})\n-# ${channelDisplay}\n${infoLines}`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

                if (video.thumbnail?.thumbnails?.length > 0) {
                    const thumbnailUrl = video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].url;
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems([
                            new MediaGalleryItemBuilder().setURL(thumbnailUrl).setDescription(title.substring(0, 100))
                        ])
                    );
                }

                return container;
            };

            await createPaginationSession({
                interactionOrMessage,
                pages: videos,
                renderPage: async (pageIndex) => renderPage(pageIndex),
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000
            }).renderInitial();

        } catch (error) {
            console.error('YouTube search error:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### YouTube Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to search YouTube. Please try again later.'));
            return send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};

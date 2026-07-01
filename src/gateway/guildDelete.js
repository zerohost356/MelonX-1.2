// https://discord.gg/Zg2XkS5hq9



const botLogger = require('../lib/botLogger');

module.exports = {
    name: 'guildDelete',

    async execute(guild, client) {
        botLogger.logGuildLeave(guild, client).catch(() => {});
    }
};


// https://discord.gg/Zg2XkS5hq9



module.exports = {
    name: 'userprofile',
    description: 'Show user profile commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('userprofile', message);
        }
        return require('../../lib/helpMenu').sendHelp('userprofile', message);
    }
};


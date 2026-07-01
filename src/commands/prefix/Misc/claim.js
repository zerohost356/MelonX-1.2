// https://discord.gg/Zg2XkS5hq9

module.exports = {
    name: 'claim',
    description: 'Claim the current ticket',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/claim');
        return subcommand.execute(message, args);
    }
};


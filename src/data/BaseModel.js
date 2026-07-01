// https://discord.gg/Zg2XkS5hq9

const { Model } = require('sequelize');

class BaseModel extends Model {
    static setupParentTouch(foreignKey, ParentModel, parentField = 'updatedAt') {
        const updateParent = async (instance) => {
            if (instance[foreignKey]) {
                await ParentModel.update(
                    { [parentField]: new Date() },
                    { where: { id: instance[foreignKey] } }
                );
            }
        };

        this.addHook('afterCreate', 'updateParentTimestamp', updateParent);
        this.addHook('afterUpdate', 'updateParentTimestamp', updateParent);
        this.addHook('afterDestroy', 'updateParentTimestamp', updateParent);
    }

    static CACHE_KEYS = [];
}

module.exports = BaseModel;

/*
: ! Aegis !
    + Discord: Zerohost356
    + Portfolio: https://itsfiizys.com
    + Community: https://discord.gg/Zg2XkS5hq9  (Melon )
    + for any queries reach out Community or DM me.
*/

/*
: ! Aegis !
    + Discord: Zerohost356
    + Portfolio: https://itsfiizys.com
    + Community: https://discord.gg/Zg2XkS5hq9  (Melon )
    + for any queries reach out Community or DM me.
*/


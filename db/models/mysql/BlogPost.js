/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('blogPost', {
        id: {
            type: DataTypes.INTEGER(10),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        introtext: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        image: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        keywords: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        author: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        url: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        publish: {
            type: DataTypes.INTEGER(1),
            allowNull: true,
            defaultValue: '0'
        },
        name_ru: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        name_ch: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        introtext_ru: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        introtext_ch: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        content_ru: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        content_ch: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        title_ru: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        title_ch: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        content_html_ru: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        content_html: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        content_html_ch: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'post',
        timestamps: false
    });
};

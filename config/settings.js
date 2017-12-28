/**
 * Get values of settings by name of category
 * @param {String} setting_name Category of settings
 * @returns {array} Return values of settings by name of category
 */
module.exports = function(setting_name){
    var s = {
        'bcg-escrows': {
            time_from_add: 60 * 5, // sec
            time_from_join: 60 * 90, // sec
            time_to_check: 60 * 5 // sec
        }
    }
    return s[setting_name];
};

module.exports = {

    request: function (req, token) {
        this.options.http._setHeaders.call(this, req, {Authorization: 'Bearer ' + token.substr(4)});
    },

    response: function (res) {
        return (res.data || {}).token;
    }
};
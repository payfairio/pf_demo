const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

// load up the user model
const User = require('../db/models/User.js');
const config = require('../config/database'); // get db config file

module.exports = function(passport) {
    const opts = {};
    opts.jwtFromRequest = ExtractJwt.fromExtractors(
        [
            ExtractJwt.fromAuthHeaderAsBearerToken(),
            function (req) {
                let token = null;
                if (req && req.cookies)
                {
                    token = req.cookies['jwt_token'];
                }
                return token;
            }
        ]
    );
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
        User.findById(jwt_payload._id, function(err, user) {
            if (err) {
                return done(err, false);
            }
            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        });
    }));
};
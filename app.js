const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider('https://ropsten.infura.io/')
);
const app = express();

const passport = require('passport');
const config = require('./config/database');
const mongoose = require('mongoose');
      mongoose.Promise = global.Promise;
      mongoose.connect(config.database, {
        useMongoClient: true
      });

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelize = new Sequelize(config.mysql, {
    operatorsAliases: Op
});


app.use(passport.initialize());

app.use(logger('dev'));
app.use(cookieParser());
//yастройка работы с формами
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/node_modules'));


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use('/api/', require('./routes/index')(web3));
app.use('/api/users', require('./routes/users')(web3));
app.use('/api/deals', require('./routes/deals')(web3));
app.use('/api/wallet', require('./routes/wallet')(web3));
app.use('/api/exchanges', require('./routes/exchanges'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/blog', require('./routes/blog')(sequelize));
app.use('/api/coins', require('./routes/coins'));

app.use('/resetPwd', require('./routes/resetPassword'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json({msg: err.message});
});

module.exports = app;



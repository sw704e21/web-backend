const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser').json()

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const coinsRouter = require('./routes/coins');
const testsRouter = require('./routes/test');
const dataRouter = require('./routes/data');

const app = express();


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser);


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/coins', coinsRouter);
app.use('/test', testsRouter);
app.use('/data', dataRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send('error');
});

const user = "admin"
const password = "SW704E21svr!"
const database = "CryptopinionDB"
const org = "cryptopinion"
const uri = `mongodb+srv://${user}:${password}@${org}.djmof.mongodb.net/${database}?retryWrites=true&w=majority`;

mongoose.connect(uri,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error: "));
db.once("open", function () {
  console.log("Connected successfully!");
});



//Listen on port 3000
app.listen(3001, () => {
  console.log("Server is running on port 3000");
})


module.exports = app;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('passport')


require('./src/middlewares/auth/auth');

const clientesRouter = require('./src/controllers/clientes/clientes_routes');
const loginRouter = require('./src/controllers/login/login')

var app = express();

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api/', loginRouter)
 
// Plug in the JWT strategy as a middleware so only verified users can access this route.
app.use('/api/clientes', passport.authenticate('jwt', {session: false}) , clientesRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log('error found route')
  
  // render the error page
  res.status(err.status || 500);
  res.json(err)
  //res.render('error');
});

module.exports = app;


const db = require('../../connectors/db');

module.exports = function(app) {
  //Register HTTP endpoint to render /index page
  app.get('/', function(req, res) {
    return res.render('index');
  });
// example of passing variables with a page
  app.get('/register', async function(req, res) {
    const stations = await db.select('*').from('se_project.stations');
    return res.render('register', { stations });
  });

  app.get('/login', function(req, res) {
    return res.render('login');
  });

  app.get('/admin', function(req, res) {
    return res.render('admin');
  });

  app.get('/adminstations', function(req, res) {

    return res.render('adminstations');
  });

  app.get('/adminroutes', function(req, res) {

    return res.render('adminroutes');
  });
  app.get('/userdashboard', function(req, res) { //
    return res.render('userdashboard');
  });
  app.get('/passwordreset', function(req, res) {
    return res.render('passwordreset');//
  });

  app.get('/prices', function(req, res) {
    return res.render('prices');
  });
  app.get('/request', function(req, res) {
    return res.render('request');
  });
  app.get('/rides', function(req, res) {
    return res.render('rides');
  });
  app.get('/seniorrequest', function(req, res) {
    return res.render('seniorrequest');
  });
  app.get('/ticket', function(req, res) {
    return res.render('ticket');
  });
  app.get('/usersubscription', function(req, res) {
  return res.render('usersubscription');
  });
  app.get('/createstation', function(req, res) {
    return res.render('createstation');
  });
  app.get('/updatestation', function(req, res) {
    return res.render('updatestation');
  });
  app.get('/deletestation', function(req, res) {
    return res.render('deletestation');
  });
  app.get('/subscribedUserPayment',function(req,res){
    return res.render('subscribedUserPayment');

  });



  app.get('/createroute', function(req, res) {
    return res.render('createroute');
  });


  app.get('/upcommingrides', function(req, res) {
    return res.render('upcommingrides');
  });
  app.get('/completedrides', function(req, res) {
    return res.render('completedrides');
  });


  app.get('/updateroute', function(req, res) {
    return res.render('updateroute');
  });
  app.get('/deleteroute', function(req, res) {
    return res.render('deleteroute');
  });
  app.get('/purchasewithsubscription', function(req, res) {
    return res.render('purchasewithsubscription');
  });

  app.get('/adminsenior', function(req, res) {
    return res.render('adminsenior');
    });


  app.get('/refundrequest', function(req, res) {
    return res.render('refundrequest');
    });
    app.get('/refundrequest', function(req, res) {
    return res.render('refundrequest');
    });

  app.get('/adminrequest', function(req, res) {
      return res.render('adminrequest');
    });

    app.get('/adminrefund', function(req, res) {
      return res.render('adminrefund');
      });
      
  

 



  
};

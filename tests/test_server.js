var chai =require('chai'),
chaiHttp= require('chai-http'),
 app =  require('../server'),
 should = chai.should(),
 expect  = require('chai').expect;

 chai.use(chaiHttp);


describe("GET Home page test", () => {
    // Test to get all students record
    it("Should return a 200 ok response", (done) => {
         chai.request(app)
             .get('/')
             .end((err, res) => {
                 res.should.have.status(200);
                 res.should.be.html;
                 //res.body.should.be.a('object');
                 done();
              });
     });
 
});

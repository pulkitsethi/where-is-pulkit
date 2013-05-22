describe('ts_modified -> ', function(){

  var mongoose = require('mongoose')
    , ts_modified = require('../index').ts_modified;

  var testSchema = new mongoose.Schema({
    oneProp: String,
    anotherProp: Number
  });

  if(mongoose.connection.db) {
    mongoose.disconnect();
  }
  mongoose.connect('mongodb://localhost/specs');

  testSchema.plugin(ts_modified);
  var ModifiedTest = mongoose.model('ModifiedTest', testSchema);

  it('should add an uninitialized property', function(){
    var t = new ModifiedTest();
    expect(t.ts_modified).toBeUndefined();
  });

  it('should update on save', function(done){
    var t = new ModifiedTest();
    expect(t.ts_modified).toBeUndefined();
    t.save(function(err, doc){
      expect(err).toBeNull();
      expect(doc.ts_modified).not.toBeUndefined();
      done();
    });
  });

});
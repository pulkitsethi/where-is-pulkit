describe('ts_created -> ', function(){

  var mongoose = require('mongoose')
    , ts_created = require('../index').ts_created;

  var testSchema = new mongoose.Schema({
    oneProp: String,
    anotherProp: Number
  });

  testSchema.plugin(ts_created);
  var CreatedTest = mongoose.model('CreatedTest', testSchema);

  it('should add a ts_created property with a default value', function(){
    var t = new CreatedTest();
    expect(t.get('ts_created')).not.toBeUndefined();
    expect(t.get('ts_created')).not.toBeNull();
  });

  it('should default to the current time', function(){
    var before = new Date().valueOf() - 1;
    var t = new CreatedTest();
    var after = new Date().valueOf() + 1;
    expect(t.get('ts_created').valueOf()).toBeGreaterThan(before);
    expect(t.get('ts_created').valueOf()).toBeLessThan(after);
  });

});
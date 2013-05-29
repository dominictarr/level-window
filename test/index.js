
var level = require('level-test')()
var sublevel = require('level-sublevel')
var pull = require('pull-stream')
var pl   = require('pull-level')
var Window = require('../')

var test = require('tape')

process.on('uncaughtException', function (e) {
  console.error(e.stack)
})

test('simple', function (t) {

  var db = sublevel(level('window2', {encoding: 'json'}))

  var windowDb = Window(db, 'window', {count: 10, initial: function () {
      return {count: 0, sum:0, mean:0}
  }, reduce: function (acc, value) {
    var c = acc.count + 1, s = acc.sum + value
    return {count: c, sum: s, mean: s / c}
  }})

  pl.read(db, {tail: true, min: '', max: '\xff\xff'})
    .pipe(pull.drain(console.log, function (err) {
      t.notOk(err)
    }))

  db.once('ready', function () {

    pull.count(100)
      .pipe(pull.map(function (e) {
        return {key: e, value: Math.random()}
      }))
      .pipe(pl.write(db, function (err) {
        t.notOk(err)
        console.log('done')

        pl.read(windowDb)
          .pipe(pull.collect(function (err, arr) {
            t.equal(arr.length, 10)
            t.equal(arr.reduce(function (a, e) { return a + +e.value.count}, 0), 100)
            t.end()

          }))
      }))
  })
})

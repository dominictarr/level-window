var opts = require('optimist').argv
var level = require('level-test')(opts)
var sublevel = require('level-sublevel')
var pull = require('pull-stream')
var pl   = require('pull-level')
var Window = require('../')
var window = require('pull-window')
var timestamp = require('monotonic-timestamp')

var test = require('tape')

process.on('uncaughtException', function (e) {
  console.error(e.stack)
})

test('simple', function (t) {

  var db = sublevel(level('window2', {encoding: 'json'}))

  var i = 0
  var windowDb = Window(db, 'window',
    window(function (data, cb) {
      if(i++ % 5) return
      var sum = 0, count = 0
      return function (end, data) {
        if(end) return
        sum += +data.value
        if(++count >= 20)
          cb(null, {sum:sum, count: count, avg: sum/count})
      }
    }))

  pull.count(100)
    .pipe(pull.map(function (e) {
      return {key: timestamp(), value: Math.random()}
    }))
    .pipe(pl.write(db, function (err) {
      t.notOk(err)

      pl.read(windowDb)
        .pipe(pull.collect(function (err, arr) {
          console.log(arr)
          
          t.equal(arr.length, 14)
          t.end()
        }))
    }))
  })

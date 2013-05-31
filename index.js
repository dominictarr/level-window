
var pl = require('pull-level')
var pull = require('pull-stream')
var peek = require('level-peek')

module.exports = function (db, windowDb, windowStream) {

  if('string' === typeof windowDb)
    windowDb = db.sublevel(windowDb)

  var metaDb = windowDb.sublevel('meta')

  peek.last(windowDb, function (err, key) {
    pl.read(db, {min: key, tail: true})
      .pipe(windowStream)
      .pipe(pull.map(function (data) {
        if(data.key && data.value) return data
        if(data.start)
          return {key: data.start.key, value: data.data}
      }))
      .pipe(pl.write(windowDb))
  })

  return windowDb
}

